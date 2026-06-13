/**
 * BLE Manager
 * Wraps @capacitor-community/bluetooth-le for sofa control
 */

import {
  BleClient,
  numbersToDataView,
  type ScanResult,
  type BleDevice,
} from '@capacitor-community/bluetooth-le';

import {
  SERVICE_UUID,
  CHARACTERISTIC_TX,
  CHARACTERISTIC_RX,
  COMPANY_ID,
  bytesToHex,
  parseFrame,
  buildVersionCmd,
  type ParsedFrame,
} from './protocol';

import {
  parseAdvertisingData,
  extractAdvertisingPayload,
  parseStatusReport,
  type DeviceConfig,
  type FullDeviceState,
} from './parser';

export interface DiscoveredDevice {
  deviceId: string;
  name: string;
  rssi: number;
  config: DeviceConfig | null;
  raw: BleDevice;
}

export type BleConnectionState = 'disconnected' | 'scanning' | 'connecting' | 'connected' | 'reconnecting';

export interface BleCallbacks {
  onStateChange?: (state: BleConnectionState) => void;
  onDeviceFound?: (device: DiscoveredDevice) => void;
  onStatusReport?: (status: FullDeviceState) => void;
  onLog?: (direction: 'TX' | 'RX', hex: string) => void;
  onError?: (error: string) => void;
}

class BleManager {
  private state: BleConnectionState = 'disconnected';
  private connectedDeviceId: string | null = null;
  private callbacks: BleCallbacks = {};
  private motorInterval: ReturnType<typeof setInterval> | null = null;
  private currentMotorCmd: Uint8Array | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectEnabled = true;
  private rxBuffer: number[] = [];

  async initialize(): Promise<void> {
    try {
      await BleClient.initialize({ androidNeverForLocation: true });
      console.log('[BLE] Initialized');
    } catch (e) {
      console.error('[BLE] Init failed:', e);
      this.callbacks.onError?.('Bluetooth initialization failed: ' + String(e));
    }
  }

  setCallbacks(cb: BleCallbacks) {
    this.callbacks = { ...this.callbacks, ...cb };
  }

  getState(): BleConnectionState {
    return this.state;
  }

  getConnectedDeviceId(): string | null {
    return this.connectedDeviceId;
  }

  async ensureEnabled(): Promise<boolean> {
    try {
      const enabled = await BleClient.isEnabled();
      if (!enabled) {
        await BleClient.requestEnable();
      }
      return true;
    } catch (e) {
      this.callbacks.onError?.('Bluetooth is not enabled');
      return false;
    }
  }

  async startScan(): Promise<void> {
    if (this.state === 'scanning' || this.state === 'connecting') {
      console.log('[BLE] Already scanning/connecting, skip');
      return;
    }

    const ok = await this.ensureEnabled();
    if (!ok) return;

    this.setState('scanning');
    console.log('[BLE] Start scanning...');

    try {
      await BleClient.requestLEScan(
        {
          services: [],
          allowDuplicates: false,
        },
        (result) => this.handleScanResult(result)
      );
    } catch (e) {
      console.error('[BLE] Scan failed:', e);
      this.callbacks.onError?.('Scan failed: ' + String(e));
      this.setState('disconnected');
    }
  }

  async stopScan(): Promise<void> {
    if (this.state !== 'scanning') {
      console.log('[BLE] Not scanning, skip stop');
      return;
    }

    try {
      await BleClient.stopLEScan();
      console.log('[BLE] Scan stopped');
    } catch (e) {
      console.error('[BLE] Stop scan error:', e);
    }
    if (this.state === 'scanning') {
      this.setState('disconnected');
    }
  }

  private handleScanResult(result: ScanResult): void {
    const device = result.device;
    const name = device.name || result.localName || '';

    // Log ALL scan results for debugging
    console.log(`[BLE] Raw scan: name="${name}" id=${device.deviceId} rssi=${result.rssi} manuData=${JSON.stringify(result.manufacturerData)}`);

    const displayName = name || 'Unknown Device';
    const payload = extractAdvertisingPayload(result as any);
    const config = payload ? parseAdvertisingData(payload) : null;

    const discovered: DiscoveredDevice = {
      deviceId: device.deviceId,
      name: displayName,
      rssi: result.rssi ?? -100,
      config,
      raw: device,
    };

    console.log(`[BLE] Found device: ${displayName} (${device.deviceId}) RSSI:${result.rssi}`);
    this.callbacks.onDeviceFound?.(discovered);
  }

  async connect(deviceId: string): Promise<boolean> {
    this.setState('connecting');
    console.log(`[BLE] Connecting to ${deviceId}...`);

    try {
      await BleClient.connect(deviceId, (disconnectedDeviceId) => this.handleConnectionStatus(disconnectedDeviceId));
      this.connectedDeviceId = deviceId;
      this.reconnectAttempts = 0;
      this.reconnectEnabled = true;

      // Start notifications
      await BleClient.startNotifications(
        deviceId,
        SERVICE_UUID,
        CHARACTERISTIC_RX,
        (value) => this.handleNotification(value)
      );

      this.setState('connected');
      console.log('[BLE] Connected and notifications started');

      // Query the full device state so the UI can initialize from real data
      try {
        await this.send(buildVersionCmd());
        console.log('[BLE] Queried device state after connect');
      } catch (e) {
        console.warn('[BLE] Failed to query device state:', e);
      }
      return true;
    } catch (e) {
      console.error('[BLE] Connect failed:', e);
      this.callbacks.onError?.('Connection failed: ' + String(e));
      this.setState('disconnected');
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.motorInterval) {
      clearInterval(this.motorInterval);
      this.motorInterval = null;
    }
    this.currentMotorCmd = null;

    // Prevent automatic reconnect from firing while we are intentionally disconnecting.
    this.reconnectEnabled = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    const deviceId = this.connectedDeviceId;
    // Drop the reference immediately so the disconnect callback won't trigger a reconnect.
    this.connectedDeviceId = null;

    if (deviceId) {
      try {
        await BleClient.stopNotifications(deviceId, SERVICE_UUID, CHARACTERISTIC_RX);
      } catch (e) {
        // ignore
      }
      try {
        await BleClient.disconnect(deviceId);
      } catch (e) {
        // ignore
      }
    }

    this.setState('disconnected');
    console.log('[BLE] Disconnected');
  }

  disableReconnect(): void {
    this.reconnectEnabled = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private handleConnectionStatus(deviceId: string): void {
    console.log('[BLE] Disconnected from:', deviceId);
    if (this.connectedDeviceId === deviceId) {
      this.setState('disconnected');
      if (this.reconnectEnabled) {
        this.attemptReconnect();
      }
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('[BLE] Max reconnect attempts reached');
      this.callbacks.onError?.('Connection lost. Please reconnect manually.');
      return;
    }

    this.reconnectAttempts++;
    this.setState('reconnecting');
    console.log(`[BLE] Reconnecting... attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);

    this.reconnectTimer = setTimeout(async () => {
      if (this.connectedDeviceId) {
        const ok = await this.connect(this.connectedDeviceId);
        if (!ok) {
          this.attemptReconnect();
        }
      }
    }, 2000);
  }

  private handleNotification(value: DataView): void {
    // Use byteOffset/byteLength to avoid reading buffer padding
    const bytes = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    const hex = bytesToHex(bytes);
    console.log(`[BLE] RX raw (${bytes.length} bytes): ${hex}`);
    this.callbacks.onLog?.('RX', hex);

    // Accumulate into buffer for frame parsing
    for (let i = 0; i < bytes.length; i++) {
      this.rxBuffer.push(bytes[i]);
    }

    this.processRxBuffer();
  }

  private processRxBuffer(): void {
    // Look for 0xBB header
    console.log(`[BLE] processRxBuffer, len=${this.rxBuffer.length}, content=${this.rxBuffer.map(b => b.toString(16).padStart(2,'0')).join(' ')}`);
    while (this.rxBuffer.length >= 5) {
      const headerIdx = this.rxBuffer.findIndex((b) => b === 0xBB);
      if (headerIdx === -1) {
        console.log('[BLE] No 0xBB header found, clearing buffer');
        this.rxBuffer = [];
        return;
      }

      if (headerIdx > 0) {
        console.log(`[BLE] Discarding ${headerIdx} bytes before header`);
        this.rxBuffer = this.rxBuffer.slice(headerIdx);
      }

      if (this.rxBuffer.length < 9) return; // need at least header + cmd + len

      const dataLen = (this.rxBuffer[7] << 8) | this.rxBuffer[8];
      const totalLen = 9 + dataLen + 1;
      console.log(`[BLE] Found header, dataLen=${dataLen}, totalLen=${totalLen}, bufferLen=${this.rxBuffer.length}`);

      if (this.rxBuffer.length < totalLen) {
        console.log('[BLE] Frame incomplete, waiting for more data');
        return; // incomplete
      }

      const frameBytes = new Uint8Array(this.rxBuffer.slice(0, totalLen));
      this.rxBuffer = this.rxBuffer.slice(totalLen);

      const frame = parseFrame(frameBytes);
      console.log(`[BLE] parseFrame result: valid=${frame?.valid}, dataLen=${frame?.dataLen}, data=[${frame?.data?.map(b => b.toString(16).padStart(2,'0')).join(' ')}]`);
      if (frame && frame.valid) {
        this.handleParsedFrame(frame);
      } else {
        console.warn('[BLE] Invalid frame discarded');
      }
    }
  }

  private handleParsedFrame(frame: ParsedFrame): void {
    // Status report command is 0x01 0x20 (version) or others
    // For status reports, we assume the device sends full state periodically
    // The command code might vary, but we parse the data as status report
    if (frame.data.length > 0) {
      const status = parseStatusReport(frame.data);
      if (status) {
        this.callbacks.onStatusReport?.(status);
      }
    }
  }

  private setState(state: BleConnectionState): void {
    this.state = state;
    this.callbacks.onStateChange?.(state);
  }

  // ===== Public Send Methods =====

  async send(data: Uint8Array): Promise<void> {
    if (!this.connectedDeviceId) {
      console.warn('[BLE] Not connected, cannot send');
      return;
    }

    const hex = bytesToHex(data);
    console.log(`[BLE] TX: ${hex}`);
    this.callbacks.onLog?.('TX', hex);

    try {
      await BleClient.writeWithoutResponse(
        this.connectedDeviceId,
        SERVICE_UUID,
        CHARACTERISTIC_TX,
        numbersToDataView(Array.from(data)),
      );
    } catch (e) {
      console.error('[BLE] Write failed:', e);
      this.callbacks.onError?.('Write failed: ' + String(e));
      // Treat write failure as disconnection (e.g. peripheral powered off without
      // OS delivering disconnect callback). Mark state and trigger reconnect.
      this.handleWriteFailure();
    }
  }

  /**
   * Called when a write fails. Stops motor repeat, marks state as disconnected
   * and kicks off the reconnect chain (if reconnect is enabled).
   */
  private handleWriteFailure(): void {
    if (this.state !== 'connected') return; // already handling
    // Stop any motor repeat to avoid spamming failed writes.
    if (this.motorInterval) {
      clearInterval(this.motorInterval);
      this.motorInterval = null;
    }
    this.currentMotorCmd = null;
    this.setState('disconnected');
    if (this.reconnectEnabled && this.connectedDeviceId) {
      this.reconnectAttempts = 0;
      this.attemptReconnect();
    }
  }

  /**
   * Start periodic motor command (100ms interval)
   */
  startMotorCommand(cmd: Uint8Array): void {
    if (this.motorInterval) {
      clearInterval(this.motorInterval);
    }
    this.currentMotorCmd = cmd;
    this.send(cmd);
    this.motorInterval = setInterval(() => {
      if (this.currentMotorCmd) {
        this.send(this.currentMotorCmd);
      }
    }, 100);
  }

  /**
   * Stop periodic motor command (send stop once)
   */
  stopMotorCommand(stopCmd: Uint8Array): void {
    if (this.motorInterval) {
      clearInterval(this.motorInterval);
      this.motorInterval = null;
    }
    this.currentMotorCmd = null;
    this.send(stopCmd);
  }
}

export const bleManager = new BleManager();
