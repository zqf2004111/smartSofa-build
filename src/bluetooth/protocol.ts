/**
 * Bluetooth Protocol Layer
 * Based on PRD V01 Chapter 6
 *
 * Frame Format:
 * APP -> Device: 0xAA 0x21 0x01 0x31 0x01 + cmd(2B) + len(2B) + data(5B) + checksum(1B)
 * Device -> APP: 0xBB 0x31 0x01 0x21 0x01 + cmd(2B) + len(2B) + data(nB) + checksum(1B)
 */

// ===== UUIDs (from Changzhou hardware team) =====
export const SERVICE_UUID = '0000ae30-0000-1000-8000-00805f9b34fb';
export const CHARACTERISTIC_TX = '0000ae01-0000-1000-8000-00805f9b34fb'; // APP -> Device (Write No Response)
export const CHARACTERISTIC_RX = '0000ae02-0000-1000-8000-00805f9b34fb'; // Device -> APP (Notify)

// ===== Company ID for Manufacturer Specific Data (placeholder) =====
export const COMPANY_ID = 0xFFFF;

// ===== Frame Headers =====
export const HEADER_TX = [0xAA, 0x21, 0x01, 0x31, 0x01];
export const HEADER_RX = [0xBB, 0x31, 0x01, 0x21, 0x01];

// ===== Chair Position Codes =====
export const CHAIR_LEFT = [0x01, 0x08];   // 左边椅
export const CHAIR_RIGHT = [0x01, 0x0A];  // 右边椅
export const CHAIR_MIDDLE = [0x01, 0x0C]; // 三人位中间

// ===== Command Codes (sub-codes in data[1]) =====
export const CMD = {
  CHILD_LOCK: [0x00, 0x00],
  MOTOR_SEAT: [0x00, 0x01],
  MOTOR_HEAD: [0x00, 0x02],
  MOTOR_LUMBAR: [0x00, 0x03],
  MOTOR_FOOT: [0x00, 0x04],
  MOTOR_BACK: [0x00, 0x05],
  MOTOR_SPEED: [0x00, 0x06],
  POSITION_PRESET: [0x00, 0x10],
  MEMORY_RUN: [0x00, 0x11],
  MEMORY_SET: [0x00, 0x12],
  VENTILATION_SEAT: [0x00, 0x20],
  VENTILATION_BACK: [0x00, 0x21],
  VENTILATION_MODE: [0x00, 0x22],
  VENTILATION_TIMER: [0x00, 0x23],
  HEATING_SEAT: [0x00, 0x30],
  HEATING_BACK: [0x00, 0x31],
  HEATING_SHOULDER: [0x00, 0x32],
  HEATING_LEG: [0x00, 0x33],
  HEATING_ARM: [0x00, 0x34],
  HEATING_MODE: [0x00, 0x35],
  HEATING_TIMER: [0x00, 0x36],
  MASSAGE: [0x00, 0x40],
  MASSAGE_INTENSITY: [0x00, 0x41],
  MASSAGE_TIMER: [0x00, 0x42],
  WAIST: [0x00, 0x50],
  WAIST_INTENSITY: [0x00, 0x51],
  LIGHT: [0x00, 0x60],
  LIGHT_COLOR: [0x00, 0x61],
  VIBRO: [0x00, 0x70],
  VIBRO_INTENSITY: [0x00, 0x71],
  AUDIO_MODE: [0x00, 0x80],
  AUDIO_TREBLE: [0x00, 0x81],
  AUDIO_BASS: [0x00, 0x82],
  AUDIO_VOLUME: [0x00, 0x83],
  PAIR_BLE: [0x00, 0x90],
  PAIR_24G: [0x00, 0x91],
  PAIR_MESH: [0x00, 0x92],
  AUDIO_SOURCE: [0x00, 0x93],
  LANGUAGE: [0x00, 0xA0],
  VERSION: [0x01, 0x20],
} as const;

// ===== Motor direction values =====
export const MOTOR_STOP = 0x00;
export const MOTOR_UP = 0x01;
export const MOTOR_DOWN = 0x02;

// ===== Massage mode values =====
export const MASSAGE_MODE = {
  OFF: 0x00,
  SINGLE_WAVE: 0x01,
  PAT: 0x02,
  DOUBLE_WAVE: 0x03,
  WAVE: 0x11,
  CATWALK: 0x12,
  BUTTERFLY: 0x13,
  ACUPRESSURE: 0x14,
  PAT_B: 0x15,
  KNEAD: 0x21,
  ACUPRESSURE_C: 0x22,
  PAT_C: 0x23,
} as const;

// ===== Heating mode values =====
export const HEATING_MODE = {
  OFF: 0x00,
  RAPID: 0x01,
  GENTLE: 0x02,
  SHOULDER_THERAPY: 0x03,
  WAIST_THERAPY: 0x04,
} as const;

// ===== Ventilation mode values =====
export const VENTILATION_MODE = {
  OFF: 0x00,
  RAPID: 0x01,
  GENTLE: 0x02,
} as const;

// ===== Light mode values =====
// 0=灯光关闭 1=音律 2=常亮 3=呼吸 4=循环变色
export const LIGHT_MODE = {
  OFF: 0x00,
  RHYTHMIC: 0x01,
  STEADY: 0x02,
  BREATH: 0x03,
  CYCLE: 0x04,
} as const;

// ===== Audio mode values =====
export const AUDIO_MODE = {
  GENERAL: 0x00,
  ROCK: 0x01,
  POP: 0x02,
  CLASSIC: 0x03,
  JAZZ: 0x04,
} as const;

// ===== Position preset values =====
export const POSITION_PRESET = {
  HOME: 0x00,
  TV: 0x01,
  RECLINE: 0x03,
  ZG: 0x02,
  HIGH_LEG: 0x04,
} as const;

// ===== Vibro mode values =====
// 0=震子关闭 1=音乐律动 2=固定振动低 3=固定振动高 4~7=按摩模式1~4
export const VIBRO_MODE = {
  OFF: 0x00,
  MUSIC: 0x01,
  FIXED_LOW: 0x02,
  FIXED_HIGH: 0x03,
  MASSAGE1: 0x04,
  MASSAGE2: 0x05,
  MASSAGE3: 0x06,
  MASSAGE4: 0x07,
} as const;

// ===== Language values =====
export const LANGUAGE_VAL = {
  ZH: 0x00,
  EN: 0x01,
  ES: 0x02,
  FR: 0x03,
} as const;

/**
 * Calculate arithmetic checksum (sum of all bytes, keep low 8 bits)
 */
export function calcChecksum(bytes: number[]): number {
  let sum = 0;
  for (const b of bytes) {
    sum += b & 0xFF;
  }
  return sum & 0xFF;
}

/**
 * Build a TX frame (APP -> Device)
 * @param cmd 2-byte command code
 * @param data 5-byte data payload
 */
export function buildFrame(cmd: readonly number[], data: readonly number[]): Uint8Array {
  if (cmd.length !== 2) throw new Error('Command must be 2 bytes');
  if (data.length !== 5) throw new Error('Data must be 5 bytes');

  const frame: number[] = [
    ...HEADER_TX,
    cmd[0], cmd[1],
    0x00, 0x05, // data length = 5
    ...data,
  ];
  const checksum = calcChecksum(frame);
  frame.push(checksum);
  return new Uint8Array(frame);
}

/**
 * Convert bytes to hex string for logging
 */
export function bytesToHex(bytes: Uint8Array | number[]): string {
  const arr = Array.from(bytes);
  return arr.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
}

/**
 * Parse a RX frame (Device -> APP)
 * Returns parsed frame or null if invalid
 */
export interface ParsedFrame {
  header: number[];
  cmd: number[];
  dataLen: number;
  status: number[];
  data: number[];
  checksum: number;
  valid: boolean;
}

export function parseFrame(buffer: Uint8Array): ParsedFrame | null {
  if (buffer.length < 10) return null;

  // Check header
  const header = Array.from(buffer.slice(0, 5));
  const isValidHeader = header.every((b, i) => b === HEADER_RX[i]);
  if (!isValidHeader) {
    // Try to find header in buffer (partial frame)
    return null;
  }

  const cmd = [buffer[5], buffer[6]];
  const dataLen = (buffer[7] << 8) | buffer[8];

  if (buffer.length < 9 + dataLen + 1) return null; // incomplete

  const payload = Array.from(buffer.slice(9, 9 + dataLen));
  const status = payload.slice(0, 2);
  const data = payload.slice(2);
  const checksum = buffer[9 + dataLen];

  const calculated = calcChecksum(Array.from(buffer.slice(0, 9 + dataLen)));
  const valid = checksum === calculated;

  return { header, cmd, dataLen, status, data, checksum, valid };
}

// ===== Helper builders =====

export function buildMotorCmd(motorType: 'seat' | 'head' | 'lumbar' | 'foot' | 'back', direction: number): Uint8Array {
  const subCmdMap: Record<string, number> = {
    seat: 0x01,
    head: 0x02,
    lumbar: 0x03,
    foot: 0x04,
    back: 0x05,
  };
  // Single sofa defaults to left chair (0x01 0x08), sub-code in data[1]
  return buildFrame(CHAIR_LEFT, [0x00, subCmdMap[motorType], 0x00, 0x00, direction & 0xFF]);
}

export function buildPositionCmd(preset: number): Uint8Array {
  return buildFrame(CHAIR_LEFT, [0x00, 0x10, 0x00, 0x00, preset & 0xFF]);
}

export function buildMemoryRunCmd(slot: number): Uint8Array {
  return buildFrame(CHAIR_LEFT, [0x00, 0x11, 0x00, 0x00, slot & 0xFF]);
}

export function buildMemorySetCmd(slot: number): Uint8Array {
  return buildFrame(CHAIR_LEFT, [0x00, 0x12, 0x00, 0x00, slot & 0xFF]);
}

export function buildMassageCmd(mode: number): Uint8Array {
  return buildFrame(CHAIR_LEFT, [0x00, 0x40, 0x00, 0x00, mode & 0xFF]);
}

export function buildMassageIntensityCmd(level: number): Uint8Array {
  return buildFrame(CHAIR_LEFT, [0x00, 0x41, 0x00, 0x00, level & 0xFF]);
}

export function buildHeatingCmd(zone: 'seat' | 'back' | 'shoulder' | 'leg' | 'arm', level: number): Uint8Array {
  const subCmdMap: Record<'seat' | 'back' | 'shoulder' | 'leg' | 'arm', number> = {
    seat: 0x30,
    back: 0x31,
    shoulder: 0x32,
    leg: 0x33,
    arm: 0x34,
  };
  return buildFrame(CHAIR_LEFT, [0x00, subCmdMap[zone], 0x00, 0x00, level & 0xFF]);
}

export function buildHeatingModeCmd(mode: number): Uint8Array {
  return buildFrame(CHAIR_LEFT, [0x00, 0x35, 0x00, 0x00, mode & 0xFF]);
}

export function buildVentilationCmd(zone: 'seat' | 'back', level: number): Uint8Array {
  const subCmdMap: Record<'seat' | 'back', number> = {
    seat: 0x20,
    back: 0x21,
  };
  return buildFrame(CHAIR_LEFT, [0x00, subCmdMap[zone], 0x00, 0x00, level & 0xFF]);
}

export function buildVentilationModeCmd(mode: number): Uint8Array {
  return buildFrame(CHAIR_LEFT, [0x00, 0x22, 0x00, 0x00, mode & 0xFF]);
}

export function buildTimerCmd(type: 'massage' | 'heating' | 'ventilation', minutes: number): Uint8Array {
  const subCmdMap: Record<string, number> = {
    massage: 0x42,
    heating: 0x36,
    ventilation: 0x23,
  };
  return buildFrame(CHAIR_LEFT, [0x00, subCmdMap[type], 0x00, 0x00, minutes & 0xFF]);
}

export function buildLightCmd(mode: number): Uint8Array {
  return buildFrame(CHAIR_LEFT, [0x00, 0x60, 0x00, 0x00, mode & 0xFF]);
}

export function buildLightColorCmd(r: number, g: number, b: number): Uint8Array {
  return buildFrame(CHAIR_LEFT, [0x00, 0x61, r & 0xFF, g & 0xFF, b & 0xFF]);
}

export function buildVibroCmd(mode: number): Uint8Array {
  return buildFrame(CHAIR_LEFT, [0x00, 0x70, 0x00, 0x00, mode & 0xFF]);
}

export function buildVibroIntensityCmd(level: number): Uint8Array {
  return buildFrame(CHAIR_LEFT, [0x00, 0x71, 0x00, 0x00, level & 0xFF]);
}

export function buildAudioModeCmd(mode: number): Uint8Array {
  return buildFrame(CHAIR_LEFT, [0x00, 0x80, 0x00, 0x00, mode & 0xFF]);
}

export function buildAudioTrebleCmd(value: number): Uint8Array {
  return buildFrame(CHAIR_LEFT, [0x00, 0x81, 0x00, 0x00, value & 0xFF]);
}

export function buildAudioBassCmd(value: number): Uint8Array {
  return buildFrame(CHAIR_LEFT, [0x00, 0x82, 0x00, 0x00, value & 0xFF]);
}

export function buildAudioVolumeCmd(value: number): Uint8Array {
  return buildFrame(CHAIR_LEFT, [0x00, 0x83, 0x00, 0x00, value & 0xFF]);
}

// ===== Audio source switching (0x00 0x93) =====
// 0x00 = no change, 0x01 = BLE, 0x02 = 2.4G
export const AUDIO_SOURCE = {
  NO_CHANGE: 0x00,
  BLE: 0x01,
  RF24G: 0x02,
} as const;

export function buildAudioSourceCmd(src: number): Uint8Array {
  return buildFrame(CHAIR_LEFT, [0x00, 0x93, 0x00, 0x00, src & 0xFF]);
}

// ===== Pairing commands =====
// PAIR_BLE (0x00 0x90): 0x01 = allow pair, 0x02 = unpair
export function buildPairBleCmd(action: number): Uint8Array {
  return buildFrame(CHAIR_LEFT, [0x00, 0x90, 0x00, 0x00, action & 0xFF]);
}

// PAIR_24G (0x00 0x91): 0x01 = allow pair
export function buildPair24GCmd(action: number): Uint8Array {
  return buildFrame(CHAIR_LEFT, [0x00, 0x91, 0x00, 0x00, action & 0xFF]);
}

export function buildChildLockCmd(lock: boolean): Uint8Array {
  return buildFrame(CHAIR_LEFT, [0x00, 0x00, 0x00, 0x00, lock ? 0x01 : 0x00]);
}

export function buildVersionCmd(): Uint8Array {
  // Version query uses its own command code per PRD
  return buildFrame(CMD.VERSION, [0x00, 0x00, 0x00, 0x00, 0x00]);
}
