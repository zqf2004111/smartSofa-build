import { registerPlugin } from '@capacitor/core';

export interface MediaState {
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

export interface ClassicBluetoothDevice {
  address: string;
  name: string;
  rssi: number;
  bondState: number;
  isBonded: boolean;
  isAudio: boolean;
}

export interface DiscoveryResult {
  devices: ClassicBluetoothDevice[];
  isDiscovering: boolean;
}

export interface MediaControlPlugin {
  getStatus(): Promise<MediaState>;
  sendMediaCommand(options: { action: 'playPause' | 'next' | 'previous' }): Promise<{ success: boolean }>;
  openNotificationSettings(): Promise<void>;
  isNotificationListenerEnabled(): Promise<{ enabled: boolean }>;

  // Classic Bluetooth Discovery
  startDiscovery(): Promise<{ started: boolean }>;
  stopDiscovery(): Promise<void>;
  getDiscoveredDevices(): Promise<DiscoveryResult>;
  bondDevice(options: { address: string }): Promise<{ success: boolean }>;
  connectA2dp(options: { address: string }): Promise<{ success: boolean }>;

  addListener(
    eventName: 'mediaStateChanged',
    listenerFunc: (state: MediaState) => void
  ): Promise<{ remove: () => void }>;
  addListener(
    eventName: 'discoveryResult',
    listenerFunc: (result: DiscoveryResult) => void
  ): Promise<{ remove: () => void }>;
  addListener(
    eventName: 'discoveryStateChanged',
    listenerFunc: (result: { isDiscovering: boolean }) => void
  ): Promise<{ remove: () => void }>;
  removeAllListeners(): Promise<void>;
}

const MediaControl = registerPlugin<MediaControlPlugin>('MediaControl');

export { MediaControl };
