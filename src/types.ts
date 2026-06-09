import type { DeviceConfig, BleConnectionState } from './bluetooth';

export interface Device {
  id: string;
  name: string;
  model: string;
  connected: boolean;
}

export type MotorType = 'seat' | 'head' | 'lumbar' | 'foot' | 'back';

export interface MotorState {
  type: MotorType;
  position: number;
}

export interface SofaState {
  // Massage (b group: wave, catwalk, butterfly, acupressure, pat)
  massageMode: string;
  massageIntensity: number;
  massageTimer: number;
  massageOn: boolean;
  timerOn: boolean;
  timerDuration: number;
  timerRemaining: number;
  timerStartAt: number | null;

  // Heating
  heatingLevel: number;
  heatingTimer: number;
  heatingOn: boolean;
  heatingMode: string;

  // Ventilation
  ventilationLevel: number;
  ventilationTimer: number;
  ventilationOn: boolean;
  ventilationMode: string;

  // Audio & Vibro
  isPlaying: boolean;
  vibroState: number;
  vibroOn: boolean;
  loopMode: 'all' | 'single';
  volume: number;
  treble: number;
  bass: number;
  audioProfile: string;

  // Light
  lightColor: string;
  lightMode: string;
  lightOn: boolean;

  // Independent Timers
  massageTimerOn: boolean;
  massageTimerDuration: number;
  massageTimerRemaining: number;
  massageTimerStartAt: number | null;

  heatingTimerOn: boolean;
  heatingTimerDuration: number;
  heatingTimerRemaining: number;
  heatingTimerStartAt: number | null;

  ventilationTimerOn: boolean;
  ventilationTimerDuration: number;
  ventilationTimerRemaining: number;
  ventilationTimerStartAt: number | null;

  // Motor positions (percentage 0-100)
  motorPositions: Partial<Record<MotorType, number>>;

  // Which motor animation is currently active (seat/head/etc)
  activeMotorAnim: MotorType | null;
}

// ===== Bluetooth-related types for Context =====

export interface ConnectedDeviceInfo {
  deviceId: string;
  name: string;
  config: DeviceConfig | null;
}

// Music Bluetooth (A2DP) state
export interface MediaBluetoothState {
  a2dpConnected: boolean;
  deviceName: string;
  musicActive: boolean;
  notificationEnabled: boolean;
  title: string;
  artist: string;
  album: string;
  isPlaying: boolean;
  duration: number;
  position: number;
}
