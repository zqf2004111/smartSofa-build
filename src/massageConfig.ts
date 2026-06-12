import { MASSAGE_MODE } from './bluetooth/protocol';
import type { MassageSystem } from './bluetooth/parser';
import type { TranslationKey } from './i18n';

export interface MassageModeDef {
  id: string;
  protocol: number;
  labelKey: TranslationKey;
  icon: string;
  iconSelected: string;
  suspendIcon: string;
}

export const MASSAGE_MODES_BY_SYSTEM: Record<MassageSystem, MassageModeDef[]> = {
  // 单排控制的气囊按摩
  single_row: [
    {
      id: 'singleWave',
      protocol: MASSAGE_MODE.SINGLE_WAVE,
      labelKey: 'singleWave',
      icon: '/massage-icon/Wave.svg',
      iconSelected: '/massage-icon/Wave-selected.svg',
      suspendIcon: '/suspend-icon/wave.svg',
    },
    {
      id: 'pat',
      protocol: MASSAGE_MODE.PAT,
      labelKey: 'pat',
      icon: '/massage-icon/pat.svg',
      iconSelected: '/massage-icon/pat-selected.svg',
      suspendIcon: '/suspend-icon/pat.svg',
    },
    {
      id: 'doubleWave',
      protocol: MASSAGE_MODE.DOUBLE_WAVE,
      labelKey: 'doubleWave',
      icon: '/massage-icon/double-wave.svg',
      iconSelected: '/massage-icon/double-wave-selected.svg',
      suspendIcon: '/suspend-icon/double-wave.svg',
    },
  ],
  // 单点控制的气囊按摩（8 点气囊）
  // 实际固件返回低 4 位（0x01~0x05），这里同时兼容 PRD 的高 4 位写法
  eight_point: [
    {
      id: 'wave',
      protocol: MASSAGE_MODE.WAVE,
      labelKey: 'wave',
      icon: '/massage-icon/Wave.svg',
      iconSelected: '/massage-icon/Wave-selected.svg',
      suspendIcon: '/suspend-icon/wave.svg',
    },
    {
      id: 'catwalk',
      protocol: MASSAGE_MODE.CATWALK,
      labelKey: 'catwalk',
      icon: '/massage-icon/catwalk.svg',
      iconSelected: '/massage-icon/catwalk-selected.svg',
      suspendIcon: '/suspend-icon/catwalk.svg',
    },
    {
      id: 'butterfly',
      protocol: MASSAGE_MODE.BUTTERFLY,
      labelKey: 'butterfly',
      icon: '/massage-icon/butterfly.svg',
      iconSelected: '/massage-icon/butterfly-selected.svg',
      suspendIcon: '/suspend-icon/butterfly.svg',
    },
    {
      id: 'acupressure',
      protocol: MASSAGE_MODE.ACUPRESSURE,
      labelKey: 'acupressure',
      icon: '/massage-icon/acupressure.svg',
      iconSelected: '/massage-icon/acupressure-selected.svg',
      suspendIcon: '/suspend-icon/acupressure.svg',
    },
    {
      id: 'pat',
      protocol: MASSAGE_MODE.PAT_B,
      labelKey: 'pat',
      icon: '/massage-icon/pat.svg',
      iconSelected: '/massage-icon/pat-selected.svg',
      suspendIcon: '/suspend-icon/pat.svg',
    },
  ],
  // 仿机芯揉捏的气囊按摩
  knead: [
    {
      id: 'knead',
      protocol: 0x01,
      labelKey: 'knead',
      icon: '/massage-icon/knead.svg',
      iconSelected: '/massage-icon/knead-selected.svg',
      suspendIcon: '/suspend-icon/knead.svg',
    },
    {
      id: 'acupressure',
      protocol: 0x02,
      labelKey: 'acupressure',
      icon: '/massage-icon/acupressure.svg',
      iconSelected: '/massage-icon/acupressure-selected.svg',
      suspendIcon: '/suspend-icon/acupressure.svg',
    },
    {
      id: 'pat',
      protocol: 0x03,
      labelKey: 'pat',
      icon: '/massage-icon/pat.svg',
      iconSelected: '/massage-icon/pat-selected.svg',
      suspendIcon: '/suspend-icon/pat.svg',
    },
  ],
  none: [],
};

export function getMassageSystem(
  deviceConfig: { massage?: { system?: MassageSystem } } | null
): MassageSystem {
  return deviceConfig?.massage?.system || 'eight_point';
}

export function getMassageModes(system: MassageSystem): MassageModeDef[] {
  return MASSAGE_MODES_BY_SYSTEM[system] || MASSAGE_MODES_BY_SYSTEM.eight_point;
}

export function getMassageModeDef(
  system: MassageSystem,
  modeId: string
): MassageModeDef | undefined {
  return getMassageModes(system).find((m) => m.id === modeId);
}

export function getMassageProtocolValue(
  system: MassageSystem,
  modeId: string
): number {
  return getMassageModeDef(system, modeId)?.protocol ?? MASSAGE_MODE.OFF;
}

export function getMassageModeIdFromProtocol(
  system: MassageSystem,
  mode: number
): string {
  // 有些固件返回的是低 4 位，有些按 PRD 返回带高 4 位的值；
  // 这里根据当前 system 做归一化映射。
  if (mode === MASSAGE_MODE.OFF) return '';
  switch (system) {
    case 'single_row':
      switch (mode) {
        case 0x01:
        case MASSAGE_MODE.SINGLE_WAVE:
          return 'singleWave';
        case 0x02:
        case MASSAGE_MODE.PAT:
          return 'pat';
        case 0x03:
        case MASSAGE_MODE.DOUBLE_WAVE:
          return 'doubleWave';
      }
      break;
    case 'eight_point':
      switch (mode) {
        case 0x01:
        case MASSAGE_MODE.WAVE:
          return 'wave';
        case 0x02:
        case MASSAGE_MODE.CATWALK:
          return 'catwalk';
        case 0x03:
        case MASSAGE_MODE.BUTTERFLY:
          return 'butterfly';
        case 0x04:
        case MASSAGE_MODE.ACUPRESSURE:
          return 'acupressure';
        case 0x05:
        case MASSAGE_MODE.PAT_B:
          return 'pat';
      }
      break;
    case 'knead':
      switch (mode) {
        case 0x01:
        case MASSAGE_MODE.KNEAD:
          return 'knead';
        case 0x02:
        case MASSAGE_MODE.ACUPRESSURE_C:
          return 'acupressure';
        case 0x03:
        case MASSAGE_MODE.PAT_C:
          return 'pat';
      }
      break;
  }
  return '';
}

export function getDefaultMassageModeId(system: MassageSystem): string {
  return getMassageModes(system)[0]?.id ?? '';
}

export function isMassageModeSupported(
  system: MassageSystem,
  modeId: string
): boolean {
  return getMassageModes(system).some((m) => m.id === modeId);
}
