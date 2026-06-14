import React, { createContext, useContext, useState, ReactNode, useRef, useCallback, useEffect } from 'react';
import { registerPlugin } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { SofaState, type MediaBluetoothState } from './types';
import { bleManager, type DiscoveredDevice, type BleConnectionState, type FullDeviceState } from './bluetooth';
import { MediaControl } from './native/MediaControl';
import { type DeviceConfig, type HeatingZoneKey, type VentilationZoneKey, HEATING_ZONE_ORDER, VENTILATION_ZONE_ORDER } from './bluetooth/parser';
import {
  buildMotorCmd, buildPositionCmd, buildMemoryRunCmd, buildMemorySetCmd,
  buildMassageCmd, buildMassageIntensityCmd,
  buildHeatingCmd, buildHeatingModeCmd, buildVentilationCmd, buildVentilationModeCmd, buildTimerCmd,
  buildVibroCmd, buildVibroIntensityCmd,
  buildLightCmd, buildLightColorCmd,
  buildAudioModeCmd, buildAudioVolumeCmd, buildAudioTrebleCmd, buildAudioBassCmd,
  MOTOR_STOP, MOTOR_UP, MOTOR_DOWN,
  MASSAGE_MODE, POSITION_PRESET, HEATING_MODE, VENTILATION_MODE, LIGHT_MODE, AUDIO_MODE, VIBRO_MODE,
} from './bluetooth/protocol';
import {
  heatingModeToProtocol, ventilationModeToProtocol,
  audioModeToProtocol, vibroModeToProtocol, lightModeToProtocol,
} from './bluetooth/parser';
import {
  getMassageSystem,
  getMassageProtocolValue,
  getMassageModeIdFromProtocol,
  getDefaultMassageModeId,
  isMassageModeSupported,
} from './massageConfig';
import { useTranslation } from './i18n';
import { pushDebug } from './debug/debugLog';

interface SavedDevice {
  id: string;
  name: string;
  image: string;
  config?: DeviceConfig | null;
}

interface DeviceContextType {
  state: SofaState;
  language: 'en' | 'zh' | 'es';
  setLanguage: (lang: 'en' | 'zh' | 'es') => void;
  updateState: (updates: Partial<SofaState>) => void;
  sendMotorCommand: (type: string, direction: 'up' | 'down' | 'stop') => void;
  simulateMotorPosition: (type: string, direction: 'up' | 'down' | 'stop') => void;
  sendPositionCommand: (position: 'home' | 'tv' | 'zg' | 'recline' | 'memory') => void;
  setMemoryPosition: (slot: number) => void;
  savedDevices: SavedDevice[];
  addSavedDevice: (device: SavedDevice) => void;
  removeSavedDevice: (id: string) => void;
  deviceConfig: DeviceConfig | null;
  // Bluetooth
  discoveredDevices: DiscoveredDevice[];
  bleState: BleConnectionState;
  startScan: () => Promise<void>;
  stopScan: () => Promise<void>;
  clearDiscoveredDevices: () => void;
  connectBleDevice: (deviceId: string, name: string) => Promise<boolean>;
  reconnectDevice: () => Promise<boolean>;
  // Feature commands
  sendMassageCommand: (mode: string, intensity: number) => void;
  sendTimerCommand: (type: 'massage' | 'heating' | 'ventilation', minutes: number) => void;
  sendHeatingCommand: (mode: string, on: boolean, zones?: HeatingZoneKey[]) => void;
  sendVentilationCommand: (mode: string, on: boolean, zones?: VentilationZoneKey[]) => void;
  sendVibroCommand: (mode: string, level: number) => void;
  sendAudioCommand: (profile: string, volume: number, treble: number, bass: number) => void;
  sendAudioModeCommand: (profile: string) => void;
  sendLightCommand: (mode: string) => void;
  sendLightColorCommand: (r: number, g: number, b: number) => void;
  // Media Bluetooth (A2DP)
  mediaState: MediaBluetoothState;
  sendMediaCommand: (action: 'playPause' | 'next' | 'previous') => Promise<void>;
  openNotificationSettings: () => Promise<void>;
  // NFC / App Link auto-pair: BLE name parsed from launch URL.
  pairTarget: string | null;
  clearPairTarget: () => void;
}

const initialState: SofaState = {
  massageMode: 'wave',
  massageIntensity: 1,
  massageTimer: 5,
  massageOn: false,
  timerOn: false,
  timerDuration: 5,
  timerRemaining: 0,
  timerStartAt: null,

  heatingLevel: 1,
  heatingTimer: 5,
  heatingOn: false,
  heatingMode: '',
  heatingSelectedZones: [],
  heatingZoneStates: {},

  ventilationLevel: 1,
  ventilationTimer: 5,
  ventilationOn: false,
  ventilationMode: '',
  ventilationSelectedZones: [],
  ventilationZoneStates: {},

  isPlaying: false,
  vibroState: 0,
  vibroOn: false,
  loopMode: 'all',
  volume: 50,
  treble: 50,
  bass: 50,
  audioProfile: 'general',

  lightColor: '#0066CC',
  lightMode: 'steady',
  lightOn: false,

  massageTimerOn: false,
  massageTimerDuration: 5,
  massageTimerRemaining: 0,
  massageTimerStartAt: null,

  heatingTimerOn: false,
  heatingTimerDuration: 5,
  heatingTimerRemaining: 0,
  heatingTimerStartAt: null,

  ventilationTimerOn: false,
  ventilationTimerDuration: 5,
  ventilationTimerRemaining: 0,
  ventilationTimerStartAt: null,

  motorPositions: {},
  activeMotorAnim: null,
};

const DeviceContext = createContext<DeviceContextType | undefined>(undefined);

// Module-level ref for auto-connect to avoid TDZ issues in minified builds
const autoConnectAttempted = { current: false };

const BleBond = registerPlugin<{ removeBond: (options: { address: string }) => Promise<{ success: boolean }> }>('BleBond');

export function DeviceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SofaState>(initialState);
  const [language, setLanguage] = useState<'en' | 'zh' | 'es'>('en');
  const [savedDevices, setSavedDevices] = useState<SavedDevice[]>(() => {
    try {
      const stored = localStorage.getItem('smartSofa_savedDevices');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [discoveredDevices, setDiscoveredDevices] = useState<DiscoveredDevice[]>([]);
  const [bleState, setBleState] = useState<BleConnectionState>('disconnected');
  const [deviceConfig, setDeviceConfig] = useState<DeviceConfig | null>(null);
  // NFC / App Link auto-pair target (BLE name parsed from launch URL like .../pair?name=KD_SOF)
  const [pairTarget, setPairTarget] = useState<string | null>(null);
  const clearPairTarget = useCallback(() => setPairTarget(null), []);
  useEffect(() => {
    const parseUrl = (url: string | null | undefined) => {
      if (!url) return;
      try {
        const u = new URL(url);
        // Accept either https://<host>/pair?... or smartsofa://pair?...
        const isPair = u.pathname.includes('/pair') || u.host === 'pair';
        if (!isPair) return;
        const name = u.searchParams.get('name');
        if (name) {
          // Future-proof: log all params (serial/model/...) so factory tags carrying
          // structured data are visible during pairing diagnostics.
          const extras: Record<string, string> = {};
          u.searchParams.forEach((v, k) => { if (k !== 'name') extras[k] = v; });
          console.log('[NFC] pair target from URL:', name, JSON.stringify(extras));
          setPairTarget(name);
        }
      } catch (e) {
        console.warn('[NFC] bad launch URL', url, e);
      }
    };
    CapApp.getLaunchUrl().then((res) => parseUrl(res?.url)).catch(() => {});
    const subPromise = CapApp.addListener('appUrlOpen', (data) => parseUrl(data.url));
    return () => {
      subPromise.then((s) => s.remove()).catch(() => {});
    };
  }, []);
  // Restore deviceConfig from savedDevices on mount (for auto-connect scenarios)
  useEffect(() => {
    if (!deviceConfig && savedDevices.length > 0) {
      const savedConfig = savedDevices[0].config;
      if (savedConfig) {
        console.log('[Context] Restored deviceConfig from savedDevices');
        setDeviceConfig(savedConfig);
      }
    }
  }, [savedDevices, deviceConfig]);
  const deviceConfigRef = useRef<DeviceConfig | null>(null);
  useEffect(() => {
    deviceConfigRef.current = deviceConfig;
  }, [deviceConfig]);
  const bleInitialized = useRef(false);
  const motorSimInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const massageCmdPendingUntilRef = useRef<number>(0);
  // Suppression windows for heating/ventilation: after sending a mode write,
  // the sofa may emit a status frame echoing the OLD state for a brief
  // moment (firmware hasn't applied the write yet, especially with multi-zone
  // serialized writes on iOS). Without this guard the optimistic UI state
  // gets stomped and the mode button looks like it deselects.
  const heatingCmdPendingUntilRef = useRef<number>(0);
  const ventilationCmdPendingUntilRef = useRef<number>(0);
  const isRemovingDevice = useRef(false);
  // Track whether we've pushed our local audio settings (volume/treble/bass)
  // to the device after connecting. Some firmware reports an audio block of
  // all zeros on cold boot; in that case we keep our last value and re-send
  // it to the device exactly once so they stay in sync.
  const audioSyncedToDevice = useRef(false);
  // After we observe a system-volume change (hardware keys / SystemUI / our
  // own setSystemVolume), suppress incoming device-audio-report overwrites of
  // state.volume for a short window. Otherwise the sofa's status frame will
  // snap the slider back to the device's stale value before our BLE write
  // round-trips.
  const lastSysVolChangeAtMs = useRef(0);
  const SYS_VOL_SUPPRESS_MS = 3000;
  // Coalesce systemVolumeChanged echoes. Hardware volume keys / BT absolute
  // volume negotiation can emit a burst of out-of-order callbacks within a
  // few hundred ms. Strategy: collect all values within a quiet window and
  // pick the MEDIAN. Median is robust against:
  //  - BT abs-vol negotiation outliers (briefly reports 0 or 100)
  //  - Single-direction key-press bursts (user holding +/- key)
  // For monotonic bursts (e.g. 80,73,67,60,53,47,40 from holding -) median
  // gives ~60 which is approximately where the user stopped. We then trust
  // a fresh status frame from the device after SUPPRESS_MS to reach the
  // exact final value.
  const sysVolPendingValuesRef = useRef<number[]>([]);
  const sysVolFlushTimerRef = useRef<NodeJS.Timeout | null>(null);
  const SYS_VOL_COALESCE_MS = 350;
  // Status-frame volume confirmation: only trust a device-reported volume
  // that differs from local state.volume after we've seen the same value
  // for several consecutive frames. The sofa's status frame keeps reporting
  // its old volume for ~hundreds of ms after we BLE-write a new one; without
  // this guard a single stale frame can snap the slider back.
  const lastReportedVolRef = useRef<number | null>(null);
  const reportedVolStableCountRef = useRef(0);
  const VOL_STABLE_FRAMES_REQUIRED = 4;
  // Forward ref to sendAudioCommand. handleStatusReport is defined above
  // sendAudioCommand, so use a ref to break the ordering dependency.
  const sendAudioCommandRef = useRef<((profile: string, volume: number, treble: number, bass: number) => void) | null>(null);
  // Suppress device-driven timer auto-trigger for a short window after the user
  // manually turns the countdown off. Otherwise a stale status report (still
  // carrying remainingTime>0 because the device hasn't applied the timer=0
  // command yet) would re-open the countdown, requiring a second tap.

  const [mediaState, setMediaState] = useState<MediaBluetoothState>({
    a2dpConnected: false,
    deviceName: '',
    musicActive: false,
    notificationEnabled: false,
    title: '',
    artist: '',
    album: '',
    isPlaying: false,
    duration: 0,
    position: 0,
  });

  // Media bluetooth state listener
  React.useEffect(() => {
    let removeListener: (() => void) | undefined;
    let removeSysVolListener: (() => void) | undefined;
    let interval: NodeJS.Timeout;

    const initMediaListener = async () => {
      try {
        // Initial fetch
        const status = await MediaControl.getStatus();
        setMediaState(status);

        // Listen for events
        const listener = await MediaControl.addListener('mediaStateChanged', (state) => {
          setMediaState(state);
        });
        removeListener = listener.remove;

        // Listen for system media volume changes (hardware keys / SystemUI
        // panel / other apps). Mirror into state.volume so the slider in the
        // Media page follows. We do NOT send BLE here — the sofa's BT
        // middleware perceives the system volume change itself and will
        // report it back via its status frame.
        try {
          const sv = await MediaControl.addListener('systemVolumeChanged', (r: { volume: number }) => {
            console.log('[systemVolumeChanged]', r);
            if (typeof r?.volume !== 'number') return;
            const dragging = (typeof window !== 'undefined' && (window as any).__audioDragging?.volume) === true;
            if (dragging) return;
            lastSysVolChangeAtMs.current = Date.now();
            // Collect all values within a quiet window. We then pick the
            // value that best represents user intent, robust against:
            //   - Monotonic key-hold bursts (e.g. 80,73,67,60,53,47,40)
            //   - BT abs-vol negotiation outliers (briefly reports 0 or 100)
            //   - Self-triggered echoes from our own BLE writes
            sysVolPendingValuesRef.current.push(r.volume);
            if (sysVolFlushTimerRef.current) clearTimeout(sysVolFlushTimerRef.current);
            sysVolFlushTimerRef.current = setTimeout(() => {
              const values = sysVolPendingValuesRef.current.slice();
              sysVolPendingValuesRef.current = [];
              sysVolFlushTimerRef.current = null;
              if (values.length === 0) return;
              const stillDragging = (typeof window !== 'undefined' && (window as any).__audioDragging?.volume) === true;
              if (stillDragging) return;
              // Reject outliers: compute median, drop values that differ
              // by more than 30%pts. This kills BT negotiation 0/100 spikes
              // without breaking monotonic key-hold sequences.
              const sorted = values.slice().sort((a, b) => a - b);
              const median = sorted[Math.floor(sorted.length / 2)];
              const filtered = values.filter((v) => Math.abs(v - median) <= 30);
              // Apply the LAST non-outlier value — that's where the burst
              // settled (closest to where the user stopped pressing).
              const finalVol = filtered.length > 0 ? filtered[filtered.length - 1] : median;
              console.log('[systemVolume] flush', { values, median, filtered, finalVol });
              // Refresh suppress timestamp so status frames arriving right
              // after the flush still get suppressed.
              lastSysVolChangeAtMs.current = Date.now();
              lastReportedVolRef.current = null;
              reportedVolStableCountRef.current = 0;
              // IMPORTANT: do NOT push BLE here. The sofa is the A2DP
              // sink — it already learns the system volume via BT abs-vol
              // protocol. Pushing BLE creates a feedback loop where the
              // sofa re-negotiates the system volume back to our pushed
              // value, triggering more systemVolumeChanged events. Just
              // mirror to UI; the sofa's status frame will eventually
              // converge.
              setState((p) => {
                if (p.volume === finalVol) return p;
                return { ...p, volume: finalVol };
              });
            }, SYS_VOL_COALESCE_MS);
          });
          removeSysVolListener = sv.remove;
        } catch (e) {
          // listener not supported on this platform
        }

        // Poll as fallback
        interval = setInterval(async () => {
          try {
            const s = await MediaControl.getStatus();
            setMediaState(s);
          } catch (e) {
            // ignore
          }
        }, 3000);
      } catch (e) {
        console.error('[MediaControl] init failed', e);
      }
    };

    initMediaListener();

    return () => {
      if (removeListener) removeListener();
      if (removeSysVolListener) removeSysVolListener();
      if (interval) clearInterval(interval);
      if (sysVolFlushTimerRef.current) {
        clearTimeout(sysVolFlushTimerRef.current);
        sysVolFlushTimerRef.current = null;
      }
    };
  }, []);

  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (state.timerOn && state.timerRemaining > 0) {
      interval = setInterval(() => {
        setState((prev) => {
          if (prev.timerRemaining <= 1) {
            return { ...prev, timerRemaining: 0, timerOn: false };
          }
          return { ...prev, timerRemaining: prev.timerRemaining - 1 };
        });
      }, 1000);
    } else if (state.timerOn && state.timerRemaining <= 0) {
       setState((prev) => ({ ...prev, timerOn: false }));
    }
    return () => clearInterval(interval);
  }, [state.timerOn, state.timerRemaining]);

  // Per-feature local 1Hz countdown tick.
  // Display ticks every second locally; device status reports overwrite
  // the value via handleStatusReport for sync correctness.
  React.useEffect(() => {
    const anyOn =
      (state.massageTimerOn && state.massageTimerRemaining > 0) ||
      (state.heatingTimerOn && state.heatingTimerRemaining > 0) ||
      (state.ventilationTimerOn && state.ventilationTimerRemaining > 0);
    if (!anyOn) return;
    const interval = setInterval(() => {
      setState((prev) => {
        const next: Partial<SofaState> = {};
        if (prev.massageTimerOn && prev.massageTimerRemaining > 0) {
          const r = prev.massageTimerRemaining - 1;
          next.massageTimerRemaining = r > 0 ? r : 0;
          if (r <= 0) next.massageTimerOn = false;
        }
        if (prev.heatingTimerOn && prev.heatingTimerRemaining > 0) {
          const r = prev.heatingTimerRemaining - 1;
          next.heatingTimerRemaining = r > 0 ? r : 0;
          if (r <= 0) next.heatingTimerOn = false;
        }
        if (prev.ventilationTimerOn && prev.ventilationTimerRemaining > 0) {
          const r = prev.ventilationTimerRemaining - 1;
          next.ventilationTimerRemaining = r > 0 ? r : 0;
          if (r <= 0) next.ventilationTimerOn = false;
        }
        return Object.keys(next).length ? { ...prev, ...next } : prev;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [
    state.massageTimerOn,
    state.massageTimerRemaining,
    state.heatingTimerOn,
    state.heatingTimerRemaining,
    state.ventilationTimerOn,
    state.ventilationTimerRemaining,
  ]);

  const updateState = (updates: Partial<SofaState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  };

  // When the device config (massage system type) becomes known, make sure the
  // selected massage mode actually belongs to that system. Do not override a
  // mode that is currently reported as running by the chair.
  useEffect(() => {
    if (!deviceConfig) return;
    const system = deviceConfig.massage?.system;
    if (!system || system === 'none') return;
    if (!state.massageOn && state.massageMode !== '' && !isMassageModeSupported(system, state.massageMode)) {
      updateState({ massageMode: getDefaultMassageModeId(system) });
    }
  }, [deviceConfig, state.massageMode, state.massageOn]);

  const simulateMotorPosition = (type: string, direction: 'up' | 'down' | 'stop') => {
    const motorType = type as 'seat' | 'head' | 'lumbar' | 'foot' | 'back';
    if (direction === 'stop') {
      if (motorSimInterval.current) {
        clearInterval(motorSimInterval.current);
        motorSimInterval.current = null;
      }
    } else {
      setState((prev) => ({ ...prev, activeMotorAnim: motorType }));
      if (motorSimInterval.current) {
        clearInterval(motorSimInterval.current);
      }
      motorSimInterval.current = setInterval(() => {
        setState((prev) => {
          const current = prev.motorPositions[motorType] ?? 0;
          const delta = direction === 'up' ? 2 : -2;
          const next = Math.min(100, Math.max(0, current + delta));
          if (next === current) return prev;
          return {
            ...prev,
            motorPositions: { ...prev.motorPositions, [motorType]: next },
          };
        });
      }, 100);
    }
  };

  const sendMotorCommand = (type: string, direction: 'up' | 'down' | 'stop') => {
    const motorType = type as 'seat' | 'head' | 'lumbar' | 'foot' | 'back';
    if (direction === 'stop') {
      if (bleState === 'connected') {
        bleManager.stopMotorCommand(buildMotorCmd(motorType, MOTOR_STOP));
      }
      if (motorSimInterval.current) {
        clearInterval(motorSimInterval.current);
        motorSimInterval.current = null;
      }
    } else {
      setState((prev) => ({ ...prev, activeMotorAnim: motorType }));
      if (bleState === 'connected') {
        const dir = direction === 'up' ? MOTOR_UP : MOTOR_DOWN;
        bleManager.startMotorCommand(buildMotorCmd(motorType, dir));
      }
      // Local simulation so animation moves even if device doesn't report status
      if (motorSimInterval.current) {
        clearInterval(motorSimInterval.current);
      }
      motorSimInterval.current = setInterval(() => {
        setState((prev) => {
          const current = prev.motorPositions[motorType] ?? 0;
          const delta = direction === 'up' ? 2 : -2;
          const next = Math.min(100, Math.max(0, current + delta));
          if (next === current) return prev;
          return {
            ...prev,
            motorPositions: { ...prev.motorPositions, [motorType]: next },
          };
        });
      }, 100);
    }
  };

  const sendPositionCommand = (position: 'home' | 'tv' | 'zg' | 'recline' | 'memory') => {
    if (bleState !== 'connected') return;
    let preset: number;
    switch (position) {
      case 'home': preset = POSITION_PRESET.HOME; break;
      case 'tv': preset = POSITION_PRESET.TV; break;
      case 'zg': preset = POSITION_PRESET.ZG; break;
      case 'recline': preset = POSITION_PRESET.RECLINE; break;
      case 'memory': preset = 0x01; break;
      default: return;
    }
    if (position === 'memory') {
      bleManager.send(buildMemoryRunCmd(1));
    } else {
      bleManager.send(buildPositionCmd(preset));
    }
  };

  const setMemoryPosition = (slot: number) => {
    if (bleState !== 'connected') return;
    bleManager.send(buildMemorySetCmd(slot));
  };

  const sendMassageCommand = (mode: string, intensity: number) => {
    if (bleState !== 'connected') return;
    const system = getMassageSystem(deviceConfigRef.current);
    const modeVal = mode === '' ? MASSAGE_MODE.OFF : getMassageProtocolValue(system, mode);
    // 防止设备在命令发送后立刻返回旧状态把 UI 反跳回来
    massageCmdPendingUntilRef.current = Date.now() + 1200;
    bleManager.send(buildMassageCmd(modeVal));
    if (intensity > 0) {
      bleManager.send(buildMassageIntensityCmd(intensity));
    }
  };

  const sendTimerCommand = (type: 'massage' | 'heating' | 'ventilation', minutes: number) => {
    if (bleState !== 'connected') return;
    bleManager.send(buildTimerCmd(type, minutes));
  };

  const getSupportedHeatingZones = (config: DeviceConfig | null): HeatingZoneKey[] => {
    if (!config) return [];
    return HEATING_ZONE_ORDER.filter((z) => config.heating[z]);
  };

  const getSupportedVentilationZones = (config: DeviceConfig | null): VentilationZoneKey[] => {
    if (!config) return [];
    return VENTILATION_ZONE_ORDER.filter((z) => config.ventilation[z]);
  };

  const sendHeatingCommand = (mode: string, on: boolean, zones?: HeatingZoneKey[]) => {
    pushDebug('HEAT-TX', `enter mode=${mode} on=${on} zones=${zones ? '['+zones.join(',')+']' : 'undef'} bleState=${bleState}`);
    if (bleState !== 'connected') { pushDebug('HEAT-TX', 'ABORT bleState!=connected'); return; }
    const modeVal = on ? heatingModeToProtocol(mode) : HEATING_MODE.OFF;
    let targetZones = zones ?? state.heatingSelectedZones;
    if (targetZones.length === 0) {
      const supported = getSupportedHeatingZones(deviceConfigRef.current);
      pushDebug('HEAT-TX', `no zones, supported=[${supported.join(',')}]`);
      if (supported.length === 0) {
        // 无配置时回退到全局模式命令，保证兼容
        pushDebug('HEAT-TX', `fallback global modeVal=0x${modeVal.toString(16)}`);
        bleManager.send(buildHeatingModeCmd(modeVal));
        return;
      }
      targetZones = supported;
    }
    // Arm pending suppression so incoming status frames during the BLE
    // round-trip don't stomp the optimistic UI back to OFF.
    heatingCmdPendingUntilRef.current = Date.now() + 3000;
    pushDebug('HEAT-TX', `dispatch modeVal=0x${modeVal.toString(16)} targetZones=[${targetZones.join(',')}]`);
    targetZones.forEach((zone) => {
      const frame = buildHeatingCmd(zone, modeVal);
      pushDebug('HEAT-TX', `  ${zone}: send ${frame.length}B`);
      bleManager.send(frame).catch((e) => pushDebug('HEAT-TX', `  ${zone}: send ERR ${String(e)}`));
    });
    setState((prev) => {
      const nextZoneStates: SofaState['heatingZoneStates'] = { ...prev.heatingZoneStates };
      targetZones.forEach((zone) => {
        const existing = nextZoneStates[zone] || { on: false, level: 0, remainingTime: 0 };
        nextZoneStates[zone] = { ...existing, on, level: on ? modeVal : 0 };
      });
      return {
        ...prev,
        heatingOn: on || HEATING_ZONE_ORDER.some((z) => nextZoneStates[z]?.on),
        heatingMode: on ? mode : prev.heatingMode,
        heatingSelectedZones: targetZones,
        heatingZoneStates: nextZoneStates,
      };
    });
  };

  const sendVentilationCommand = (mode: string, on: boolean, zones?: VentilationZoneKey[]) => {
    if (bleState !== 'connected') return;
    const modeVal = on ? ventilationModeToProtocol(mode) : VENTILATION_MODE.OFF;
    let targetZones = zones ?? state.ventilationSelectedZones;
    if (targetZones.length === 0) {
      const supported = getSupportedVentilationZones(deviceConfigRef.current);
      if (supported.length === 0) {
        bleManager.send(buildVentilationModeCmd(modeVal));
        return;
      }
      targetZones = supported;
    }
    ventilationCmdPendingUntilRef.current = Date.now() + 3000;
    targetZones.forEach((zone) => {
      bleManager.send(buildVentilationCmd(zone, modeVal));
    });
    setState((prev) => {
      const nextZoneStates: SofaState['ventilationZoneStates'] = { ...prev.ventilationZoneStates };
      targetZones.forEach((zone) => {
        const existing = nextZoneStates[zone] || { on: false, level: 0, remainingTime: 0 };
        nextZoneStates[zone] = { ...existing, on, level: on ? modeVal : 0 };
      });
      return {
        ...prev,
        ventilationOn: on || VENTILATION_ZONE_ORDER.some((z) => nextZoneStates[z]?.on),
        ventilationMode: on ? mode : prev.ventilationMode,
        ventilationSelectedZones: targetZones,
        ventilationZoneStates: nextZoneStates,
      };
    });
  };

  const sendVibroCommand = (mode: string, level: number) => {
    if (bleState !== 'connected') return;
    const modeVal = vibroModeToProtocol(mode);
    bleManager.send(buildVibroCmd(modeVal));
    if (modeVal !== VIBRO_MODE.OFF && level > 0) {
      bleManager.send(buildVibroIntensityCmd(level));
    }
  };

  const sendAudioCommand = (profile: string, volume: number, treble: number, bass: number) => {
    if (bleState !== 'connected') return;
    const modeVal = audioModeToProtocol(profile);
    bleManager.send(buildAudioModeCmd(modeVal));
    bleManager.send(buildAudioVolumeCmd(Math.round(volume)));
    bleManager.send(buildAudioTrebleCmd(Math.round(treble)));
    bleManager.send(buildAudioBassCmd(Math.round(bass)));
  };
  // Keep the ref in sync so handleStatusReport can call it without depending
  // on hook ordering.
  sendAudioCommandRef.current = sendAudioCommand;

  const sendAudioModeCommand = (profile: string) => {
    if (bleState !== 'connected') return;
    const modeVal = audioModeToProtocol(profile);
    bleManager.send(buildAudioModeCmd(modeVal));
  };

  const sendLightCommand = (mode: string) => {
    if (bleState !== 'connected') return;
    const modeVal = lightModeToProtocol(mode);
    bleManager.send(buildLightCmd(modeVal));
  };

  const sendLightColorCommand = (r: number, g: number, b: number) => {
    if (bleState !== 'connected') return;
    bleManager.send(buildLightColorCmd(r, g, b));
  };

  const sendMediaCommand = useCallback(async (action: 'playPause' | 'next' | 'previous') => {
    try {
      await MediaControl.sendMediaCommand({ action });
    } catch (e) {
      console.error('[MediaControl] send command failed', e);
    }
  }, []);

  const openNotificationSettings = useCallback(async () => {
    try {
      await MediaControl.openNotificationSettings();
    } catch (e) {
      console.error('[MediaControl] open settings failed', e);
    }
  }, []);

  const addSavedDevice = (device: SavedDevice) => {
    setSavedDevices((prev) => {
      if (prev.find((d) => d.id === device.id)) return prev;
      const next = [...prev, device];
      localStorage.setItem('smartSofa_savedDevices', JSON.stringify(next));
      return next;
    });
  };

  const removeSavedDevice = async (id: string) => {
    const connectedId = bleManager.getConnectedDeviceId();
    console.log('[Device] removeSavedDevice', id, 'connectedId', connectedId, 'bleState', bleState);
    // Suppress auto-connect while removing so the removed device isn't reconnected
    isRemovingDevice.current = true;
    // Prevent any automatic reconnect attempts while we are intentionally removing the device
    bleManager.disableReconnect();
    // Always release BLE resources on device removal so the device becomes discoverable again
    try {
      await bleManager.disconnect();
      console.log('[Device] BLE disconnected after remove');
    } catch (e) {
      console.error('[Device] BLE disconnect on remove failed:', e);
    }
    // Remove OS-level bond so Android doesn't keep a cached GATT connection/autoconnect
    try {
      const result = await BleBond.removeBond({ address: id });
      console.log('[Device] removeBond result:', result);
    } catch (e) {
      console.warn('[Device] removeBond failed:', e);
    }
    try {
      await bleManager.stopScan();
      console.log('[Device] BLE scan stopped after remove');
    } catch (e) {
      console.error('[Device] BLE stopScan on remove failed:', e);
    }
    // Give Android time to drop the link and the peripheral time to resume advertising
    await new Promise((resolve) => setTimeout(resolve, 1200));
    setSavedDevices((prev) => {
      const next = prev.filter((d) => d.id !== id);
      localStorage.setItem('smartSofa_savedDevices', JSON.stringify(next));
      return next;
    });
    // Clear discovered devices so the scan list is fresh
    setDiscoveredDevices([]);
    // Allow auto-connect logic to run again now that the removal is complete
    isRemovingDevice.current = false;
  };

  // Bluetooth
  const handleStatusReport = useCallback((report: FullDeviceState) => {
    console.log('[BLE] Status report:', report);
    // 同步设备状态到 UI
    setState((prev) => {
      const updates: Partial<SofaState> = {};
      // Massage
      if (report.massage.length > 0) {
        const m = report.massage[0];
        const system = getMassageSystem(deviceConfigRef.current);
        const modeId = getMassageModeIdFromProtocol(system, m.mode);
        const isOn = m.mode !== MASSAGE_MODE.OFF;
        const isPending = Date.now() < massageCmdPendingUntilRef.current;
        if (!isPending) {
          updates.massageOn = isOn;
          // 关闭时清空选中模式；打开时使用设备报告的模式
          updates.massageMode = isOn ? (modeId || prev.massageMode) : '';
        }
        updates.massageIntensity = m.intensity || prev.massageIntensity;
        // 设备 remainingTime 驱动本地倒计时（双向同步）：
        // - >0 且本地未开 → 打开（rising edge），由本地 1Hz tick 继续平滑递减
        // - ==0 且本地仍开 → 立即关闭（保证关闭操作一次生效）
        if (m.remainingTime > 0) {
          if (!prev.massageTimerOn) {
            updates.massageTimerOn = true;
            updates.massageTimerRemaining = m.remainingTime;
            updates.massageTimerDuration = Math.max(1, Math.round(m.remainingTime / 60));
            updates.massageTimerStartAt = Date.now();
          }
        } else if (prev.massageTimerOn) {
          updates.massageTimerOn = false;
          updates.massageTimerRemaining = 0;
        }
      }
      // Heating (multi-zone)
      if (report.heating.length > 0) {
        const isHeatingPending = Date.now() < heatingCmdPendingUntilRef.current;
        const supported = getSupportedHeatingZones(deviceConfigRef.current);
        const zoneStates: SofaState['heatingZoneStates'] = { ...prev.heatingZoneStates };
        const onZones: HeatingZoneKey[] = [];
        let commonMode: number | null = null;
        let maxRemaining = 0;
        report.heating.forEach((h, idx) => {
          // 优先按实际支持的部位顺序映射；无配置时回退到全局顺序
          const zone = supported[idx] ?? HEATING_ZONE_ORDER[idx];
          if (!zone) return;
          const isOn = h.mode !== HEATING_MODE.OFF;
          zoneStates[zone] = { on: isOn, level: h.level, remainingTime: h.remainingTime || 0 };
          if (isOn) {
            onZones.push(zone);
            if (commonMode === null) commonMode = h.mode;
            else if (commonMode !== h.mode) commonMode = -1;
            if (h.remainingTime > maxRemaining) maxRemaining = h.remainingTime;
          }
        });
        const anyOn = onZones.length > 0;
        // Skip overwriting optimistic UI state during the pending window;
        // still allow timer/remainingTime to update below.
        if (!isHeatingPending) {
          updates.heatingOn = anyOn;
          updates.heatingMode = anyOn
            ? (commonMode === HEATING_MODE.RAPID ? 'rapid' : commonMode === HEATING_MODE.GENTLE ? 'gentle' : prev.heatingMode)
            : '';
          updates.heatingZoneStates = zoneStates;
          if (anyOn) {
            updates.heatingSelectedZones = onZones;
          }
        }
        // 设备 remainingTime 驱动本地倒计时（同 massage）
        if (maxRemaining > 0) {
          if (!prev.heatingTimerOn) {
            updates.heatingTimerOn = true;
            updates.heatingTimerRemaining = maxRemaining;
            updates.heatingTimerDuration = Math.max(1, Math.round(maxRemaining / 60));
            updates.heatingTimerStartAt = Date.now();
          }
        } else if (prev.heatingTimerOn && !isHeatingPending) {
          updates.heatingTimerOn = false;
          updates.heatingTimerRemaining = 0;
        }
      }
      // Ventilation (multi-zone)
      if (report.ventilation.length > 0) {
        const isVentilationPending = Date.now() < ventilationCmdPendingUntilRef.current;
        const supportedVent = getSupportedVentilationZones(deviceConfigRef.current);
        const zoneStates: SofaState['ventilationZoneStates'] = { ...prev.ventilationZoneStates };
        const onZones: VentilationZoneKey[] = [];
        let commonMode: number | null = null;
        let maxRemaining = 0;
        report.ventilation.forEach((v, idx) => {
          const zone = supportedVent[idx] ?? VENTILATION_ZONE_ORDER[idx];
          if (!zone) return;
          const isOn = v.mode !== VENTILATION_MODE.OFF;
          zoneStates[zone] = { on: isOn, level: v.level, remainingTime: v.remainingTime || 0 };
          if (isOn) {
            onZones.push(zone);
            if (commonMode === null) commonMode = v.mode;
            else if (commonMode !== v.mode) commonMode = -1;
            if (v.remainingTime > maxRemaining) maxRemaining = v.remainingTime;
          }
        });
        const anyOn = onZones.length > 0;
        if (!isVentilationPending) {
          updates.ventilationOn = anyOn;
          updates.ventilationMode = anyOn
            ? (commonMode === VENTILATION_MODE.RAPID ? 'rapid' : commonMode === VENTILATION_MODE.GENTLE ? 'gentle' : prev.ventilationMode)
            : '';
          updates.ventilationZoneStates = zoneStates;
          if (anyOn) {
            updates.ventilationSelectedZones = onZones;
          }
        }
        // 设备 remainingTime 驱动本地倒计时（同 massage）
        if (maxRemaining > 0) {
          if (!prev.ventilationTimerOn) {
            updates.ventilationTimerOn = true;
            updates.ventilationTimerRemaining = maxRemaining;
            updates.ventilationTimerDuration = Math.max(1, Math.round(maxRemaining / 60));
            updates.ventilationTimerStartAt = Date.now();
          }
        } else if (prev.ventilationTimerOn && !isVentilationPending) {
          updates.ventilationTimerOn = false;
          updates.ventilationTimerRemaining = 0;
        }
      }
      // Audio
      // Defensive: only update audio state when the device reports a meaningful
      // audio block. Some devices/firmwares report audioCount > 0 with all zero
      // bytes (or the parser may have read past the buffer end), which would
      // wrongly stomp the user's last value with 0. In that case we keep the
      // previous values AND push them to the device once so they re-sync.
      if (report.audios.length > 0) {
        const a = report.audios[0];
        const mode = a.mode;
        const vol = a.volume;
        const tre = a.treble;
        const bas = a.bass;
        const allDefined =
          typeof mode === 'number' && typeof vol === 'number' &&
          typeof tre === 'number' && typeof bas === 'number';
        const allZero = mode === 0 && vol === 0 && tre === 0 && bas === 0;
        if (allDefined && !allZero) {
          const audioMap: Record<number, string> = {
            [AUDIO_MODE.GENERAL]: 'general',
            [AUDIO_MODE.ROCK]: 'rock',
            [AUDIO_MODE.POP]: 'pop',
            [AUDIO_MODE.CLASSIC]: 'classic',
            [AUDIO_MODE.JAZZ]: 'jazz',
          };
          updates.audioProfile = audioMap[mode] || prev.audioProfile;
          // Skip overwriting volume/treble/bass while the user is dragging
          // their sliders — otherwise echoed status frames would fight the
          // drag and make the slider jitter.
          const dragging = (typeof window !== 'undefined' && (window as any).__audioDragging) || {};
          // Also skip volume overwrite for a short window after a system
          // volume change event — the sofa's status frame may still carry the
          // pre-change value until our BLE write round-trips.
          const sysVolFresh = (Date.now() - lastSysVolChangeAtMs.current) < SYS_VOL_SUPPRESS_MS;
          // Require N consecutive identical reports before trusting a
          // device-reported volume that differs from local state. The sofa's
          // status frame keeps emitting the pre-write value for hundreds of
          // ms after we BLE-push a new volume; a single stale frame must
          // not snap the slider back.
          let trustReportedVol = false;
          if (vol === lastReportedVolRef.current) {
            reportedVolStableCountRef.current += 1;
          } else {
            lastReportedVolRef.current = vol;
            reportedVolStableCountRef.current = 1;
          }
          if (vol === prev.volume) {
            // Already in sync; nothing to do.
            trustReportedVol = false;
          } else if (reportedVolStableCountRef.current >= VOL_STABLE_FRAMES_REQUIRED) {
            trustReportedVol = true;
          }
          if (!dragging.volume && !sysVolFresh && trustReportedVol) updates.volume = vol;
          if (!dragging.treble) updates.treble = tre;
          if (!dragging.bass) updates.bass = bas;
          audioSyncedToDevice.current = true;
        } else if (!audioSyncedToDevice.current) {
          // Device reported invalid/blank audio. Schedule a one-shot push of
          // our current local values so the device matches the UI.
          audioSyncedToDevice.current = true;
          const profileToSync = prev.audioProfile;
          const volToSync = prev.volume;
          const treToSync = prev.treble;
          const basToSync = prev.bass;
          // Defer to next tick to avoid sending inside a setState callback.
          setTimeout(() => {
            console.log(
              `[BLE] Device reported blank audio block; pushing local values: profile=${profileToSync} vol=${volToSync} treble=${treToSync} bass=${basToSync}`
            );
            sendAudioCommandRef.current?.(profileToSync, volToSync, treToSync, basToSync);
          }, 0);
        }
      }
      // Light
      if (report.lights.length > 0) {
        const l = report.lights[0];
        const lightMap: Record<number, string> = {
          [LIGHT_MODE.RHYTHMIC]: 'rhythmic',
          [LIGHT_MODE.STEADY]: 'steady',
          [LIGHT_MODE.BREATH]: 'breath',
          [LIGHT_MODE.CYCLE]: 'cycle',
        };
        updates.lightOn = l.mode !== LIGHT_MODE.OFF;
        updates.lightMode = lightMap[l.mode] || prev.lightMode;
        if (l.color) {
          updates.lightColor = `rgb(${l.color.r},${l.color.g},${l.color.b})`;
        }
      }
      // Vibro
      if (report.vibros.length > 0) {
        const v = report.vibros[0];
        updates.vibroOn = v.mode !== VIBRO_MODE.OFF;
        updates.vibroState = v.mode === VIBRO_MODE.OFF ? 0 : v.intensity;
      }
      // Motor positions
      const cfgRef = deviceConfigRef.current;
      console.log('[BLE] Motor parsing check:', {
        motorCount: report.motors.length,
        hasConfig: !!cfgRef,
        configMotors: cfgRef?.motors?.map(m => m.type),
      });
      if (report.motors.length > 0) {
        const positions: Partial<Record<import('./types').MotorType, number>> = {};
        // Fallback mapping if deviceConfig is not available yet
        const fallbackTypes: import('./types').MotorType[] = ['seat', 'head', 'lumbar', 'back', 'foot'];
        report.motors.forEach((m, i) => {
          const cfg = cfgRef?.motors?.[i];
          const motorType = cfg?.type ?? fallbackTypes[i];
          if (motorType && m.totalStroke > 0) {
            const pct = Math.min(100, Math.max(0, Math.round((m.position / m.totalStroke) * 100)));
            positions[motorType] = pct;
            console.log(`[BLE] Motor[${i}] type=${motorType} pos=${m.position}/${m.totalStroke} => ${pct}%`);
          } else if (motorType) {
            console.log(`[BLE] Motor[${i}] type=${motorType} pos=${m.position} totalStroke=${m.totalStroke} skipped`);
          }
        });
        if (Object.keys(positions).length > 0) {
          updates.motorPositions = positions;
        }
      }
      return { ...prev, ...updates };
    });
  }, []);

  const initializeBle = useCallback(async () => {
    if (bleInitialized.current) return;
    bleInitialized.current = true;

    bleManager.setCallbacks({
      onStateChange: (state) => {
        setBleState(state);
        // Reset the audio-sync flag whenever the link goes down so we re-sync
        // on the next connect.
        if (state === 'disconnected' || state === 'connecting') {
          audioSyncedToDevice.current = false;
        }
      },
      onDeviceFound: (device) => {
        setDiscoveredDevices((prev) => {
          const exists = prev.find((d) => d.deviceId === device.deviceId);
          if (exists) {
            // 只更新 RSSI 变化显著的设备，避免频繁 re-render
            if (Math.abs(exists.rssi - device.rssi) < 5 && exists.name === device.name) {
              return prev;
            }
            return prev.map((d) => (d.deviceId === device.deviceId ? device : d));
          }
          return [...prev, device];
        });
      },
      onStatusReport: handleStatusReport,
      onLog: (direction, hex) => console.log(`[BLE] ${direction}: ${hex}`),
      onError: (err) => console.error('[BLE] Error:', err),
    });

    await bleManager.initialize();
  }, [handleStatusReport]);

  // Auto-connect saved device on app launch
  React.useEffect(() => {
    if (isRemovingDevice.current) return;
    if (autoConnectAttempted.current) return;
    if (bleState === 'connected' || bleState === 'connecting') return;
    if (savedDevices.length === 0) return;

    const tryAutoConnect = async () => {
      autoConnectAttempted.current = true;
      try {
        await initializeBle();
        const device = savedDevices[0];
        const ok = await bleManager.connect(device.id);
        if (ok) {
          console.log('[BLE] Auto-connected to', device.name);
        }
      } catch (e) {
        console.error('[BLE] Auto-connect failed', e);
      }
    };

    tryAutoConnect();
  }, [bleState, savedDevices, initializeBle]);

  const startScan = useCallback(async () => {
    await initializeBle();
    await bleManager.startScan();
  }, [initializeBle]);

  const stopScan = useCallback(async () => {
    await bleManager.stopScan();
  }, []);

  const clearDiscoveredDevices = useCallback(() => {
    setDiscoveredDevices([]);
  }, []);

  const reconnectDevice = useCallback(async () => {
    if (savedDevices.length === 0) return false;
    if (bleState === 'connected' || bleState === 'connecting' || bleState === 'reconnecting') {
      return bleState === 'connected';
    }
    try {
      await initializeBle();
      const device = savedDevices[0];
      autoConnectAttempted.current = true;
      const ok = await bleManager.connect(device.id);
      return ok;
    } catch (e) {
      console.error('[BLE] Manual reconnect failed', e);
      return false;
    }
  }, [savedDevices, bleState, initializeBle]);

  const connectBleDevice = useCallback(async (deviceId: string, name: string) => {
    await bleManager.stopScan();
    const ok = await bleManager.connect(deviceId);
    if (ok) {
      const device = discoveredDevices.find((d) => d.deviceId === deviceId);
      const existing = savedDevices.find((d) => d.id === deviceId);
      const config = device?.config ?? existing?.config ?? null;
      if (config) {
        setDeviceConfig(config);
      }
      setSavedDevices((prev) => {
        if (prev.find((d) => d.id === deviceId)) {
          const next = prev.map((d) => d.id === deviceId ? { ...d, config } : d);
          localStorage.setItem('smartSofa_savedDevices', JSON.stringify(next));
          return next;
        }
        const next = [...prev, { id: deviceId, name, image: '/devices/recliner.png', config }];
        localStorage.setItem('smartSofa_savedDevices', JSON.stringify(next));
        return next;
      });
    }
    return ok;
  }, [discoveredDevices, savedDevices]);

  // Debug: expose scan/config for runtime inspection
  useEffect(() => {
    (window as any).__startScan = startScan;
    (window as any).__connectBleDevice = connectBleDevice;
  }, [startScan, connectBleDevice]);

  return (
    <DeviceContext.Provider value={{
      state, language, setLanguage, updateState,
      sendMotorCommand, simulateMotorPosition, sendPositionCommand, setMemoryPosition,
      savedDevices, addSavedDevice, removeSavedDevice,
      deviceConfig,
      discoveredDevices, bleState, startScan, stopScan, clearDiscoveredDevices, connectBleDevice, reconnectDevice,
      sendMassageCommand, sendTimerCommand, sendHeatingCommand, sendVentilationCommand,
      sendVibroCommand, sendAudioCommand, sendAudioModeCommand, sendLightCommand, sendLightColorCommand,
      mediaState, sendMediaCommand, openNotificationSettings,
      pairTarget, clearPairTarget,
    }}>
      {children}
    </DeviceContext.Provider>
  );
}

export function useDevice() {
  const context = useContext(DeviceContext);
  if (context === undefined) {
    throw new Error('useDevice must be used within a DeviceProvider');
  }
  return context;
}
