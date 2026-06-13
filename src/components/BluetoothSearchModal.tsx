import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '../i18n';
import { useDevice } from '../context';
import { MediaControl, type ClassicBluetoothDevice } from '../native/MediaControl';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Headphones, Speaker, Bluetooth, Check, Loader2 } from 'lucide-react';

const IS_IOS = Capacitor.getPlatform() === 'ios';

interface BluetoothSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BluetoothSearchModal: React.FC<BluetoothSearchModalProps> = ({ isOpen, onClose }) => {
  const { language, mediaState } = useDevice();
  const t = useTranslation(language);
  const [devices, setDevices] = useState<ClassicBluetoothDevice[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [connectingId, setConnectingId] = useState<string | null>(null);

  const startScan = useCallback(async () => {
    setDevices([]);
    setIsScanning(true);
    try {
      await MediaControl.startDiscovery();
    } catch (e) {
      console.error('Start discovery failed', e);
    }
  }, []);

  const stopScan = useCallback(async () => {
    setIsScanning(false);
    try {
      await MediaControl.stopDiscovery();
    } catch (e) {
      console.error('Stop discovery failed', e);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    // iOS does not expose classic-BT discovery; show settings hint instead.
    if (IS_IOS) return;

    let removeResultListener: (() => void) | undefined;
    let removeStateListener: (() => void) | undefined;

    const init = async () => {
      // Get initial list
      try {
        const result = await MediaControl.getDiscoveredDevices();
        setDevices(result.devices);
        setIsScanning(result.isDiscovering);
      } catch (e) {}

      // Listen for discovery results
      const resultL = await MediaControl.addListener('discoveryResult', (result) => {
        setDevices(result.devices);
      });
      removeResultListener = resultL.remove;

      const stateL = await MediaControl.addListener('discoveryStateChanged', (result) => {
        setIsScanning(result.isDiscovering);
      });
      removeStateListener = stateL.remove;

      // Auto start scan
      startScan();
    };

    init();

    return () => {
      if (removeResultListener) removeResultListener();
      if (removeStateListener) removeStateListener();
      MediaControl.stopDiscovery();
    };
  }, [isOpen, startScan]);

  const handleDeviceClick = async (device: ClassicBluetoothDevice) => {
    if (connectingId) return;
    setConnectingId(device.address);

    try {
      if (device.bondState === 12) {
        // Already bonded, try to connect A2DP
        const result = await MediaControl.connectA2dp({ address: device.address });
        // Give system a moment to update connection state, then check
        await new Promise(r => setTimeout(r, 800));
        const status = await MediaControl.getStatus();
        if (status.a2dpConnected) {
          onClose();
        } else if (!result.success) {
          alert('Connection failed. Please try again.');
        }
      } else {
        // Not bonded, create bond
        const result = await MediaControl.bondDevice({ address: device.address });
        if (result.success) {
          alert('Pairing request sent. Please confirm on your device.');
        } else {
          alert('Pairing failed. Please try again.');
        }
      }
    } catch (e: any) {
      console.error('Device action failed', e);
      alert('Connection error: ' + (e.message || 'Unknown error'));
    } finally {
      setConnectingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 transition-opacity" onClick={onClose}>
      <div
        className="bg-[#FAFAFA] rounded-[24px] w-[320px] shadow-xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[70vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-3 flex items-center justify-between shrink-0">
          <h2 className="text-[15px] font-semibold text-gray-900">{t('search')}</h2>
          {isScanning && !IS_IOS && (
            <div className="flex items-center space-x-1.5 text-[#0A5BC4]">
              <Loader2 size={14} className="animate-spin" />
              <span className="text-[11px] font-medium">{t('scanning')}</span>
            </div>
          )}
        </div>

        {IS_IOS ? (
          <div className="flex-1 px-6 pb-3 flex flex-col items-center justify-center text-center">
            <div className="w-[60px] h-[60px] rounded-full bg-[#0A5BC4]/5 flex items-center justify-center mb-4">
              <Bluetooth size={28} className="text-[#0A5BC4]" />
            </div>
            <p className="text-[12px] text-gray-600 leading-relaxed mb-4">
              {t('iosBluetoothHint')}
            </p>
            <button
              onClick={() => {
                // App-Prefs:Bluetooth jumps to iOS Settings > Bluetooth (works on
                // physical devices). If the URL scheme is rejected, fall back to
                // the generic settings page.
                App.openUrl({ url: 'App-Prefs:Bluetooth' }).catch(() => {
                  App.openUrl({ url: 'app-settings:' }).catch(() => {});
                });
              }}
              className="px-5 h-[36px] bg-[#0A5BC4] text-white rounded-[18px] text-[13px] font-medium"
            >
              {t('openSettings')}
            </button>
          </div>
        ) : (
        /* Device List (Android) */
        <div className="flex-1 overflow-y-auto px-3 pb-3">
          {devices.length === 0 && isScanning && (
            <div className="flex flex-col items-center justify-center py-10">
              <div className="w-[60px] h-[60px] rounded-full bg-[#0A5BC4]/5 flex items-center justify-center mb-3 relative">
                <div className="absolute inset-0 rounded-full border border-[#0A5BC4]/20 animate-ping" style={{ animationDuration: '2s' }} />
                <Bluetooth size={28} className="text-[#0A5BC4]" />
              </div>
              <p className="text-[12px] text-gray-400">{t('searching')}</p>
            </div>
          )}

          {devices.length === 0 && !isScanning && (
            <div className="flex flex-col items-center justify-center py-10">
              <Bluetooth size={32} className="text-gray-300 mb-2" />
              <p className="text-[12px] text-gray-400">{t('noDevicesFound')}</p>
            </div>
          )}

          <div className="space-y-2">
            {devices.map((device) => (
              <button
                key={device.address}
                onClick={() => handleDeviceClick(device)}
                disabled={connectingId === device.address}
                className={`w-full flex items-center space-x-3 px-3 py-3 rounded-[14px] transition-colors text-left ${
                  connectingId === device.address
                    ? 'bg-gray-100 opacity-70'
                    : 'bg-white hover:bg-gray-50 border border-gray-100'
                }`}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                  device.isAudio ? 'bg-[#0A5BC4]/10 text-[#0A5BC4]' : 'bg-gray-100 text-gray-400'
                }`}>
                  {device.isAudio ? <Headphones size={18} /> : <Bluetooth size={18} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[13px] font-medium text-gray-900 truncate">{device.name}</span>
                    {device.bondState === 12 && (
                      <Check size={12} className="text-green-500 shrink-0" />
                    )}
                    {device.isAudio && (
                      <span className="text-[9px] px-1.5 py-0.5 bg-[#0A5BC4]/10 text-[#0A5BC4] rounded-full font-medium shrink-0">
                        Audio
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-gray-400">{device.address}</span>
                </div>
                {connectingId === device.address ? (
                  <Loader2 size={16} className="text-[#0A5BC4] animate-spin shrink-0" />
                ) : (
                  <span className="text-[11px] text-[#0A5BC4] font-medium shrink-0">
                    {device.bondState === 12 ? 'Connect' : 'Pair'}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
        )}

        {/* Footer */}
        <div className="px-4 pb-4 pt-2 shrink-0">
          <button
            onClick={onClose}
            className="w-full h-[42px] bg-white text-gray-800 border border-[#0A5BC4] rounded-[20px] text-[14px] font-medium"
          >
            {t('cancel')}
          </button>
        </div>
      </div>
    </div>
  );
};
