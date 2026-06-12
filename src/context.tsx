import React, { createContext, useContext, useState, ReactNode, useRef, useCallback, useEffect } from 'react';
import { SofaState, type MediaBluetoothState } from './types';
import { bleManager, type DiscoveredDevice, type BleConnectionState, type FullDeviceState } from './bluetooth';
import { MediaControl } from './native/MediaControl';
import { type DeviceConfig } from './bluetooth/parser';
import {
  buildMotorCmd, buildPositionCmd, buildMemoryRunCmd, buildMemorySetCmd,
  buildMassageCmd, buildMassageIntensityCmd,
  buildHeatingModeCmd, buildVentilationModeCmd, buildTimerCmd,
  buildVibroCmd, buildVibroIntensityCmd,
  buildLightCmd,
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
  sendPositionCommand: (position: 'home' | 'tv' | 'zg' | 'memory') => void;
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
  // Feature commands
  sendMassageCommand: (mode: string, intensity: number) => void;
  sendTimerCommand: (type: 'massage' | 'heating' | 'ventilation', minutes: number) => void;
  sendHeatingCommand: (mode: string, on: boolean) => void;
  sendVentilationCommand: (mode: string, on: boolean) => void;
  sendVibroCommand: (mode: string, level: number) => void;
  sendAudioCommand: (profile: string, volume: number, treble: number, bass: number) => void;
  sendAudioModeCommand: (profile: string) => void;
  sendLightCommand: (mode: string) => void;
  sendLightColorCommand: (r: number, g: number, b: number) => void;
  // Media Bluetooth (A2DP)
  mediaState: MediaBluetoothState;
  sendMediaCommand: (action: 'playPause' | 'next' | 'previous') => Promise<void>;
  openNotificationSettings: () => Promise<void>;
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
  heatingMode: 'gentle',

  ventilationLevel: 1,
  ventilationTimer: 5,
  ventilationOn: false,
  ventilationMode: 'gentle',

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
      if (interval) clearInterval(interval);
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

  const sendPositionCommand = (position: 'home' | 'tv' | 'zg' | 'memory') => {
    if (bleState !== 'connected') return;
    let preset: number;
    switch (position) {
      case 'home': preset = POSITION_PRESET.HOME; break;
      case 'tv': preset = POSITION_PRESET.TV; break;
      case 'zg': preset = POSITION_PRESET.ZG; break;
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

  const sendHeatingCommand = (mode: string, on: boolean) => {
    if (bleState !== 'connected') return;
    const modeVal = on ? heatingModeToProtocol(mode) : HEATING_MODE.OFF;
    bleManager.send(buildHeatingModeCmd(modeVal));
  };

  const sendVentilationCommand = (mode: string, on: boolean) => {
    if (bleState !== 'connected') return;
    const modeVal = on ? ventilationModeToProtocol(mode) : VENTILATION_MODE.OFF;
    bleManager.send(buildVentilationModeCmd(modeVal));
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
    // Always release BLE resources on device removal so the device becomes discoverable again
    try {
      await bleManager.disconnect();
      console.log('[Device] BLE disconnected after remove');
    } catch (e) {
      console.error('[Device] BLE disconnect on remove failed:', e);
    }
    try {
      await bleManager.stopScan();
      console.log('[Device] BLE scan stopped after remove');
    } catch (e) {
      console.error('[Device] BLE stopScan on remove failed:', e);
    }
    // Give Android time to drop the link and the peripheral time to resume advertising
    await new Promise((resolve) => setTimeout(resolve, 800));
    setSavedDevices((prev) => {
      const next = prev.filter((d) => d.id !== id);
      localStorage.setItem('smartSofa_savedDevices', JSON.stringify(next));
      return next;
    });
    // Clear discovered devices so the scan list is fresh
    setDiscoveredDevices([]);
    // Reset auto-connect flag so removed device won't auto-connect on restart
    autoConnectAttempted.current = false;
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
        updates.massageTimerRemaining = m.remainingTime || 0;
      }
      // Heating
      if (report.heating.length > 0) {
        const h = report.heating[0];
        updates.heatingOn = h.mode !== HEATING_MODE.OFF;
        updates.heatingMode = h.mode === HEATING_MODE.RAPID ? 'rapid' : h.mode === HEATING_MODE.GENTLE ? 'gentle' : prev.heatingMode;
        updates.heatingTimerRemaining = h.remainingTime || 0;
      }
      // Ventilation
      if (report.ventilation.length > 0) {
        const v = report.ventilation[0];
        updates.ventilationOn = v.mode !== VENTILATION_MODE.OFF;
        updates.ventilationMode = v.mode === VENTILATION_MODE.RAPID ? 'rapid' : v.mode === VENTILATION_MODE.GENTLE ? 'gentle' : prev.ventilationMode;
        updates.ventilationTimerRemaining = v.remainingTime || 0;
      }
      // Audio
      if (report.audios.length > 0) {
        const a = report.audios[0];
        const audioMap: Record<number, string> = {
          [AUDIO_MODE.GENERAL]: 'general',
          [AUDIO_MODE.ROCK]: 'rock',
          [AUDIO_MODE.POP]: 'pop',
          [AUDIO_MODE.CLASSIC]: 'classic',
          [AUDIO_MODE.JAZZ]: 'jazz',
        };
        updates.audioProfile = audioMap[a.mode] || prev.audioProfile;
        updates.volume = a.volume;
        updates.treble = a.treble;
        updates.bass = a.bass;
      }
      // Light
      if (report.lights.length > 0) {
        const l = report.lights[0];
        const lightMap: Record<number, string> = {
          [LIGHT_MODE.STEADY]: 'steady',
          [LIGHT_MODE.BREATH]: 'breath',
          [LIGHT_MODE.CYCLE]: 'cycle',
          [LIGHT_MODE.RHYTHMIC]: 'rhythmic',
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
      onStateChange: (state) => setBleState(state),
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

  const connectBleDevice = useCallback(async (deviceId: string, name: string) => {
    await bleManager.stopScan();
    const ok = await bleManager.connect(deviceId);
    if (ok) {
      const device = discoveredDevices.find((d) => d.deviceId === deviceId);
      const config = device?.config ?? null;
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
  }, [discoveredDevices]);

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
      discoveredDevices, bleState, startScan, stopScan, clearDiscoveredDevices, connectBleDevice,
      sendMassageCommand, sendTimerCommand, sendHeatingCommand, sendVentilationCommand,
      sendVibroCommand, sendAudioCommand, sendAudioModeCommand, sendLightCommand, sendLightColorCommand,
      mediaState, sendMediaCommand, openNotificationSettings,
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
