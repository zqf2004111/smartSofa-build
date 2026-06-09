/**
 * Bluetooth Data Parser
 * - Advertising data parser (D0-D15)
 * - Status report parser (0xBB variable-length packet)
 */

import { COMPANY_ID, MASSAGE_MODE } from './protocol';

// ===== Device Config from Advertising Data =====

export type MotorType = 'seat' | 'head' | 'lumbar' | 'back' | 'foot';
export type MotorKind = 'none' | 'brushed' | 'hall_brushed' | 'brushless';

export interface MotorConfig {
  type: MotorType;
  kind: MotorKind;
}

export interface HeatingConfig {
  seat: boolean;
  back: boolean;
  shoulder: boolean;
  waist: boolean;
  leg: boolean;
  arm: boolean;
}

export interface VentilationConfig {
  seat: boolean;
  back: boolean;
}

export type MassageSystem = 'none' | 'single_row' | 'eight_point' | 'knead';

export interface MassageConfig {
  system: MassageSystem;
}

export interface MultimediaConfig {
  light: boolean;
  vibro: boolean;
  audio: boolean;
}

export interface DeviceConfig {
  sofaType: 'single' | 'double' | 'triple';
  motors: MotorConfig[];
  heating: HeatingConfig;
  ventilation: VentilationConfig;
  massage: MassageConfig;
  waist: boolean;
  multimedia: MultimediaConfig;
  customerLevel: number;
  firmwareVersion: string;
  hardwareVersion: string;
}

function parseMotorKind(bits: number): MotorKind {
  switch (bits & 0x07) {
    case 0x01: return 'brushed';
    case 0x02: return 'hall_brushed';
    case 0x03: return 'brushless';
    default: return 'none';
  }
}

function parseMassageSystem(bits: number): MassageSystem {
  switch (bits & 0x07) {
    case 0x01: return 'single_row';
    case 0x02: return 'eight_point';
    case 0x03: return 'knead';
    default: return 'none';
  }
}

/**
 * Parse Manufacturer Specific Data from advertising
 * @param data 16 bytes (D0-D15)
 */
export function parseAdvertisingData(data: Uint8Array): DeviceConfig | null {
  if (data.length < 16) {
    console.log('[BLE] Advertising data too short:', data.length);
    return null;
  }

  const d0 = data[0];
  const d1 = data[1];
  const d2 = data[2];
  const d3 = data[3];
  const d4 = data[4];
  const d5 = data[5];
  const d6 = data[6];
  const d7 = data[7];
  const d8 = data[8];
  const d9 = data[9];
  const d10 = data[10];
  const d11 = data[11];
  const d12 = data[12];
  const d13 = data[13];
  const d14 = data[14];
  const d15 = data[15];

  const sofaType: 'single' | 'double' | 'triple' =
    d0 === 0x02 ? 'double' : d0 === 0x03 ? 'triple' : 'single';

  const motors: MotorConfig[] = [];
  if (parseMotorKind(d1) !== 'none') motors.push({ type: 'seat', kind: parseMotorKind(d1) });
  if (parseMotorKind(d2) !== 'none') motors.push({ type: 'head', kind: parseMotorKind(d2) });
  if (parseMotorKind(d3) !== 'none') motors.push({ type: 'lumbar', kind: parseMotorKind(d3) });
  if (parseMotorKind(d4) !== 'none') motors.push({ type: 'back', kind: parseMotorKind(d4) });
  if (parseMotorKind(d5) !== 'none') motors.push({ type: 'foot', kind: parseMotorKind(d5) });

  const heating: HeatingConfig = {
    seat: !!(d6 & 0x01),
    leg: !!(d6 & 0x02),
    waist: !!(d6 & 0x04),
    shoulder: !!(d6 & 0x08),
    back: !!(d6 & 0x10),
    arm: !!(d6 & 0x20),
  };

  const ventilation: VentilationConfig = {
    seat: !!(d8 & 0x01),
    back: !!(d8 & 0x02),
  };

  const massage: MassageConfig = {
    system: parseMassageSystem(d9),
  };

  const waist = !!(d10 & 0x01);

  const multimedia: MultimediaConfig = {
    audio: !!(d11 & 0x01),
    vibro: !!(d11 & 0x02),
    light: !!(d11 & 0x04),
  };

  const versionNum = ((d13 << 16) | (d14 << 8) | d15);
  const major = Math.floor(versionNum / 100);
  const minor = Math.floor((versionNum % 100) / 10);
  const patch = versionNum % 10;

  const config: DeviceConfig = {
    sofaType,
    motors,
    heating,
    ventilation,
    massage,
    waist,
    multimedia,
    customerLevel: d12,
    firmwareVersion: `V${major}.${minor}.${patch}`,
    hardwareVersion: `V${major}.${minor}.${patch}`,
  };

  console.log('[BLE] Parsed advertising config:', JSON.stringify(config, null, 2));
  return config;
}

/**
 * Extract manufacturer data from BLE scan result
 */
export function extractManufacturerData(manufacturerData?: Record<string, number[]>): Uint8Array | null {
  if (!manufacturerData) return null;
  const key = COMPANY_ID.toString(16).toLowerCase().padStart(4, '0');
  const data = manufacturerData[key] || manufacturerData[COMPANY_ID.toString()] || Object.values(manufacturerData)[0];
  if (!data) return null;
  return new Uint8Array(data);
}

// ===== Status Report Parser (0xBB variable-length) =====

export interface MotorState {
  speed: number;
  position: number;
  positionType: number;
  totalStroke: number;
}

export interface MassageState {
  mode: number;
  intensity: number;
  remainingTime: number; // seconds
}

export interface HeatingZoneState {
  mode: number;
  level: number;
  remainingTime: number; // seconds
}

export interface VentilationZoneState {
  mode: number;
  level: number;
  remainingTime: number; // seconds
}

export interface LightState {
  mode: number;
  color: { r: number; g: number; b: number };
}

export interface WaistState {
  mode: number;
  intensity: number;
}

export interface VibroState {
  mode: number;
  intensity: number;
}

export interface AudioState {
  mode: number;
  treble: number;
  bass: number;
  volume: number;
}

export interface PairingState {
  ble: number;
  tv24g: number;
  mesh: number;
}

export interface FullDeviceState {
  motors: MotorState[];
  massage: MassageState[];
  heating: HeatingZoneState[];
  ventilation: VentilationZoneState[];
  lights: LightState[];
  waists: WaistState[];
  vibros: VibroState[];
  audios: AudioState[];
  pairing: PairingState;
  languages: number[];
}

function readUint16(data: number[], offset: number): number {
  return ((data[offset] << 8) | data[offset + 1]) >>> 0;
}

export function parseStatusReport(data: number[]): FullDeviceState | null {
  try {
    let idx = 0;

    // Motors
    const motorCount = data[idx++];
    const motors: MotorState[] = [];
    for (let i = 0; i < motorCount; i++) {
      motors.push({
        speed: readUint16(data, idx),
        position: readUint16(data, idx + 2),
        positionType: data[idx + 4],
        totalStroke: readUint16(data, idx + 5),
      });
      idx += 7;
    }

    // Massage
    const massageCount = data[idx++];
    const massage: MassageState[] = [];
    for (let i = 0; i < massageCount; i++) {
      massage.push({
        mode: data[idx],
        intensity: data[idx + 1],
        remainingTime: readUint16(data, idx + 2),
      });
      idx += 4;
    }

    // Heating
    const heatingCount = data[idx++];
    const heating: HeatingZoneState[] = [];
    for (let i = 0; i < heatingCount; i++) {
      heating.push({
        mode: data[idx],
        level: data[idx + 1],
        remainingTime: readUint16(data, idx + 2),
      });
      idx += 4;
    }

    // Ventilation
    const ventilationCount = data[idx++];
    const ventilation: VentilationZoneState[] = [];
    for (let i = 0; i < ventilationCount; i++) {
      ventilation.push({
        mode: data[idx],
        level: data[idx + 1],
        remainingTime: readUint16(data, idx + 2),
      });
      idx += 4;
    }

    // Lights
    const lightCount = data[idx++];
    const lights: LightState[] = [];
    for (let i = 0; i < lightCount; i++) {
      lights.push({
        mode: data[idx],
        color: { r: data[idx + 1], g: data[idx + 2], b: data[idx + 3] },
      });
      idx += 4;
    }

    // Waist
    const waistCount = data[idx++];
    const waists: WaistState[] = [];
    for (let i = 0; i < waistCount; i++) {
      waists.push({
        mode: data[idx],
        intensity: data[idx + 1],
      });
      idx += 2;
    }

    // Vibro
    const vibroCount = data[idx++];
    const vibros: VibroState[] = [];
    for (let i = 0; i < vibroCount; i++) {
      vibros.push({
        mode: data[idx],
        intensity: data[idx + 1],
      });
      idx += 2;
    }

    // Audio
    const audioCount = data[idx++];
    const audios: AudioState[] = [];
    for (let i = 0; i < audioCount; i++) {
      audios.push({
        mode: data[idx],
        treble: data[idx + 1],
        bass: data[idx + 2],
        volume: data[idx + 3],
      });
      idx += 4;
    }

    // Pairing
    const pairing: PairingState = {
      ble: readUint16(data, idx),
      tv24g: readUint16(data, idx + 2),
      mesh: readUint16(data, idx + 4),
    };
    idx += 6;

    // Languages
    const langCount = data[idx++];
    const languages: number[] = [];
    for (let i = 0; i < langCount; i++) {
      languages.push(data[idx++]);
    }

    const result: FullDeviceState = {
      motors,
      massage,
      heating,
      ventilation,
      lights,
      waists,
      vibros,
      audios,
      pairing,
      languages,
    };

    console.log('[BLE] Parsed status report:', JSON.stringify(result, null, 2));
    return result;
  } catch (e) {
    console.error('[BLE] Failed to parse status report:', e);
    return null;
  }
}

// ===== Massage mode mapping for UI =====

export function massageModeFromProtocol(mode: number): string {
  switch (mode) {
    case MASSAGE_MODE.WAVE: return 'wave';
    case MASSAGE_MODE.CATWALK: return 'catwalk';
    case MASSAGE_MODE.BUTTERFLY: return 'butterfly';
    case MASSAGE_MODE.ACUPRESSURE:
    case MASSAGE_MODE.ACUPRESSURE_C: return 'acupressure';
    case MASSAGE_MODE.PAT:
    case MASSAGE_MODE.PAT_B: return 'pat';
    default: return '';
  }
}

export function massageModeToProtocol(mode: string): number {
  switch (mode) {
    case 'wave': return MASSAGE_MODE.WAVE;
    case 'catwalk': return MASSAGE_MODE.CATWALK;
    case 'butterfly': return MASSAGE_MODE.BUTTERFLY;
    case 'acupressure': return MASSAGE_MODE.ACUPRESSURE;
    case 'pat': return MASSAGE_MODE.PAT;
    default: return MASSAGE_MODE.OFF;
  }
}

export function heatingModeToProtocol(mode: string): number {
  switch (mode) {
    case 'rapid': return 0x01;
    case 'gentle': return 0x02;
    default: return 0x00;
  }
}

export function ventilationModeToProtocol(mode: string): number {
  switch (mode) {
    case 'rapid': return 0x01;
    case 'gentle': return 0x02;
    default: return 0x00;
  }
}

export function audioModeToProtocol(mode: string): number {
  switch (mode) {
    case 'rock': return 0x01;
    case 'pop': return 0x02;
    case 'classic': return 0x03;
    case 'jazz': return 0x04;
    default: return 0x00;
  }
}

export function vibroModeToProtocol(mode: string): number {
  switch (mode) {
    case 'music': return 0x01;
    case 'massage1': return 0x04;
    case 'massage2': return 0x05;
    default: return 0x00;
  }
}

export function lightModeToProtocol(mode: string): number {
  switch (mode) {
    case 'steady': return 0x01;
    case 'breath': return 0x02;
    case 'cycle': return 0x03;
    case 'rhythmic': return 0x04;
    default: return 0x00;
  }
}
