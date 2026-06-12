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
  (globalThis as any).__lastParsedDeviceConfig = config;
  return config;
}

/**
 * Extract manufacturer data from BLE scan result
 */
export function extractManufacturerData(manufacturerData?: Record<string, unknown>): Uint8Array | null {
  if (!manufacturerData) return null;
  const key = COMPANY_ID.toString(16).toLowerCase().padStart(4, '0');
  const data = manufacturerData[key] || manufacturerData[COMPANY_ID.toString()] || Object.values(manufacturerData)[0];
  if (!data) return null;
  // The Capacitor bridge returns different shapes across OS versions:
  // plain number array, hex string, DataView, ArrayBuffer, or an empty object.
  if (typeof data === 'string') {
    const hex = data.replace(/\s/g, '');
    const bytes: number[] = [];
    for (let i = 0; i < hex.length; i += 2) {
      bytes.push(parseInt(hex.slice(i, i + 2), 16));
    }
    return new Uint8Array(bytes);
  }
  if (ArrayBuffer.isView(data) && !(data instanceof Uint8Array)) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  }
  if (data instanceof ArrayBuffer) {
    return new Uint8Array(data);
  }
  if (Array.isArray(data)) {
    return new Uint8Array(data);
  }
  // Some Android builds return empty/plain objects; treat as no usable data.
  return null;
}

function toByteArray(raw: unknown): number[] | null {
  if (!raw) return null;
  if (typeof raw === 'string') {
    const hex = raw.replace(/\s/g, '');
    if (hex.length < 2) return null;
    const bytes: number[] = [];
    for (let i = 0; i < hex.length; i += 2) {
      bytes.push(parseInt(hex.slice(i, i + 2), 16));
    }
    return bytes;
  }
  if (raw instanceof Uint8Array || raw instanceof ArrayBuffer) {
    return Array.from(new Uint8Array(raw));
  }
  if (ArrayBuffer.isView(raw)) {
    return Array.from(new Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength));
  }
  if (Array.isArray(raw)) {
    return raw.map((v) => Number(v));
  }
  if (typeof (raw as any).length === 'number') {
    try {
      return Array.from(raw as any).map((v) => Number(v));
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Parse a BLE raw advertisement payload and extract the manufacturer-specific
 * config block (AD type 0xFF). The input may be a hex string, Uint8Array,
 * ArrayBuffer, DataView or plain number array depending on the Capacitor bridge.
 */
export function parseRawAdvertisement(raw: unknown): Uint8Array | null {
  const bytes = toByteArray(raw);
  console.log('[BLE] parseRawAdvertisement input:', typeof raw, 'len=', bytes?.length);
  if (!bytes || bytes.length === 0) return null;
  try {
    let i = 0;
    while (i < bytes.length) {
      const len = bytes[i];
      if (len === 0 || i + 1 + len > bytes.length) break;
      const type = bytes[i + 1];
      if (type === 0xff) {
        const data = bytes.slice(i + 2, i + 1 + len);
        console.log('[BLE] rawAdvertisement manufacturer data:', data.map(b => b.toString(16).padStart(2, '0')).join(' '));
        // KD_SOF advertises a 16-byte config block right after the 0xFF type
        // (the first 2 bytes double as the custom company ID).
        if (data.length >= 16) {
          return new Uint8Array(data.slice(0, 16));
        }
        return null;
      }
      i += 1 + len;
    }
  } catch (e) {
    console.error('[BLE] Failed to parse rawAdvertisement:', e);
  }
  return null;
}

/**
 * Try to extract the 16-byte advertising config block from a scan result,
 * first from manufacturerData, then from rawAdvertisement.
 */
export function extractAdvertisingPayload(result: {
  manufacturerData?: Record<string, number[]>;
  rawAdvertisement?: unknown;
}): Uint8Array | null {
  // Prefer the structured field when it actually contains data
  const manu = extractManufacturerData(result.manufacturerData);
  if (manu && manu.length >= 16) {
    console.log('[BLE] Using manufacturerData payload');
    return manu.slice(0, 16);
  }
  // Fall back to the raw advertisement payload
  if (result.rawAdvertisement) {
    console.log('[BLE] Falling back to rawAdvertisement');
    return parseRawAdvertisement(result.rawAdvertisement);
  }
  return null;
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
    // 单排控制的气囊按摩
    case MASSAGE_MODE.SINGLE_WAVE: return 'singleWave';
    case MASSAGE_MODE.PAT: return 'pat';
    case MASSAGE_MODE.DOUBLE_WAVE: return 'doubleWave';
    // 单点控制的气囊按摩（8 点气囊）
    case MASSAGE_MODE.WAVE: return 'wave';
    case MASSAGE_MODE.CATWALK: return 'catwalk';
    case MASSAGE_MODE.BUTTERFLY: return 'butterfly';
    case MASSAGE_MODE.ACUPRESSURE: return 'acupressure';
    case MASSAGE_MODE.PAT_B: return 'pat';
    // 仿机芯揉捏的气囊按摩
    case MASSAGE_MODE.KNEAD: return 'knead';
    case MASSAGE_MODE.ACUPRESSURE_C: return 'acupressure';
    case MASSAGE_MODE.PAT_C: return 'pat';
    default: return '';
  }
}

export function massageModeToProtocol(mode: string): number {
  switch (mode) {
    // 单排控制的气囊按摩
    case 'singleWave': return MASSAGE_MODE.SINGLE_WAVE;
    case 'doubleWave': return MASSAGE_MODE.DOUBLE_WAVE;
    // 单点控制的气囊按摩（8 点气囊）
    case 'wave': return MASSAGE_MODE.WAVE;
    case 'catwalk': return MASSAGE_MODE.CATWALK;
    case 'butterfly': return MASSAGE_MODE.BUTTERFLY;
    // 仿机芯揉捏的气囊按摩
    case 'knead': return MASSAGE_MODE.KNEAD;
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
    case 'off':
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
