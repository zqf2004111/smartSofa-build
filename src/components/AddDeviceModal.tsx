import React, { useState, useEffect } from 'react';
import { Scan, Bluetooth, Sofa, Bed, Check, Plus, Loader2 } from 'lucide-react';
import { useTranslation } from '../i18n';
import { useDevice } from '../context';
import type { DiscoveredDevice } from '../bluetooth';
import { bleManager } from '../bluetooth';
import { QrScannerModal } from './QrScannerModal';

interface AddDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeviceAdded?: () => void;
  /** Auto-pair target BLE name (from NFC App Link). When isOpen+set, modal auto-scans and connects. */
  autoPairName?: string | null;
}

type QrStatus = 'idle' | 'searching' | 'found';

export const AddDeviceModal: React.FC<AddDeviceModalProps> = ({ isOpen, onClose, onDeviceAdded, autoPairName }) => {
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [isQrScanning, setIsQrScanning] = useState(false);
  const [qrTargetName, setQrTargetName] = useState<string>('');
  const [qrStatus, setQrStatus] = useState<QrStatus>('idle');
  const [qrError, setQrError] = useState<string>('');
  const { language, discoveredDevices, startScan, stopScan, clearDiscoveredDevices, connectBleDevice, bleState, savedDevices } = useDevice();
  const t = useTranslation(language);

  useEffect(() => {
    if (!isOpen) {
      setQrStatus('idle');
      setQrTargetName('');
      setQrError('');
      return;
    }
    clearDiscoveredDevices();
    // NFC auto-pair: seed target name and start searching state immediately.
    if (autoPairName) {
      setQrTargetName(autoPairName);
      setQrStatus('searching');
      setQrError('');
    }
    const timer = setTimeout(() => {
      startScan().catch(() => {});
    }, 300);
    return () => {
      clearTimeout(timer);
      stopScan().catch(() => {});
    };
  }, [isOpen, autoPairName, startScan, stopScan, clearDiscoveredDevices]);

  const handleDeviceClick = async (device: DiscoveredDevice) => {
    if (connectingId) return;
    setConnectingId(device.deviceId);
    try {
      const ok = await connectBleDevice(device.deviceId, device.name);
      if (ok) {
        onDeviceAdded?.();
        onClose();
      }
    } catch (e) {
      console.error('Connect failed', e);
    } finally {
      setConnectingId(null);
    }
  };

  const nearbyDevices = discoveredDevices.filter((d) => (d.name || '').startsWith('KD_'));
  const otherDevices = discoveredDevices.filter((d) => {
    const name = (d.name || '').trim();
    return !name.startsWith('KD_') && name !== '' && name !== 'Unknown Device';
  });

  const handleQrScan = (result: string) => {
    setIsQrScanning(false);
    setQrError('');
    const prefix = 'KAIDI_SMART_SOFA:';
    const trimmed = result.trim();
    if (trimmed.startsWith(prefix)) {
      const bleName = trimmed.slice(prefix.length).trim();
      if (bleName) {
        // Check if this device is already connected
        const connectedId = bleManager.getConnectedDeviceId();
        if (connectedId && bleState === 'connected') {
          const connectedDevice = savedDevices.find((d) => d.id === connectedId);
          if (connectedDevice?.name === bleName) {
            setQrError(t('deviceAlreadyConnected')?.replace('{name}', bleName) || `Device already connected!`);
            return;
          }
        }
        setQrTargetName(bleName);
        setQrStatus('searching');
        // Ensure scan is running to find the target device
        startScan().catch(() => {});
        return;
      }
    }
    setQrError(t('invalidQrCode'));
  };

  // Auto-connect when QR target device appears in scan results
  useEffect(() => {
    if (!qrTargetName || connectingId) return;
    const target = discoveredDevices.find((d) => {
      const name = (d.name || '').trim();
      return name === qrTargetName || name.includes(qrTargetName);
    });
    if (target) {
      setQrStatus('found');
      setQrTargetName('');
      handleDeviceClick(target);
    }
  }, [discoveredDevices, qrTargetName, connectingId]);

  // Timeout: if searching for >15s, show not-found hint
  useEffect(() => {
    if (qrStatus !== 'searching') return;
    const timer = setTimeout(() => {
      setQrStatus('idle');
      setQrTargetName('');
      setQrError(t('deviceNotFoundTimeout') || 'Device not found, please make sure it is powered on and nearby');
    }, 15000);
    return () => clearTimeout(timer);
  }, [qrStatus, qrTargetName, t]);

  const renderDevice = (device: DiscoveredDevice) => {
    const isConnecting = connectingId === device.deviceId;
    const icon = (device.name || '').startsWith('KD_') ? <Sofa size={20} /> : <Bed size={20} />;

    return (
      <div
        key={device.deviceId}
        onClick={() => handleDeviceClick(device)}
        className={`flex items-center justify-between rounded-[16px] p-4 cursor-pointer transition-colors bg-gray-50 border border-transparent hover:bg-gray-100/50 ${isConnecting ? 'opacity-60' : ''}`}
      >
        <div className="flex items-center space-x-3">
          <div className="w-[40px] h-[40px] rounded-[10px] bg-white flex items-center justify-center shadow-sm text-gray-900 border border-gray-100">
            {icon}
          </div>
          <div>
            <h4 className="text-[15px] font-medium text-gray-900 leading-tight">{device.name || t('unknownDevice')}</h4>
            <p className="text-[13px] text-gray-500 mt-0.5">{device.deviceId}</p>
          </div>
        </div>
        {isConnecting ? (
          <Loader2 size={18} className="text-[#0A5BC4] animate-spin" />
        ) : (
          <div className="w-[20px] h-[20px] rounded-full border border-gray-400 flex items-center justify-center text-gray-500">
            <Plus size={14} />
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 transition-opacity pt-16" onClick={onClose}>
      <div
        className="bg-[#FAFAFA] rounded-[24px] w-full max-w-md shadow-xl animate-in zoom-in-95 duration-200 relative flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fixed Header */}
        <div className="shrink-0 pt-5 px-5 pb-2">
          <div className="flex items-center justify-between mb-6 pb-2 border-b border-gray-100 relative">
            <button onClick={onClose} className="text-[#0A5BC4] font-medium text-[15px]">{t('cancel')}</button>
            <h2 className="text-[17px] font-semibold text-gray-900 absolute left-1/2 -translate-x-1/2">{t('addDevice')}</h2>
            <div className="w-[50px]"></div>
          </div>

          {/* Radar Animation */}
          <div className="flex flex-col items-center justify-center mt-4 mb-5 relative">
            <style dangerouslySetInnerHTML={{__html: `
              @keyframes scan-ripple {
                0% { transform: scale(0.8); opacity: 0.5; }
                100% { transform: scale(2.5); opacity: 0; }
              }
              .ripple-1 { animation: scan-ripple 2s cubic-bezier(0, 0.2, 0.8, 1) infinite; }
              .ripple-2 { animation: scan-ripple 2s cubic-bezier(0, 0.2, 0.8, 1) infinite 0.6s; }
              .ripple-3 { animation: scan-ripple 2s cubic-bezier(0, 0.2, 0.8, 1) infinite 1.2s; }
            `}} />
            <div className="w-[88px] h-[88px] flex items-center justify-center relative">
               <div className="absolute w-[66px] h-[66px] rounded-full border-2 border-[#0A5BC4] ripple-1"></div>
               <div className="absolute w-[66px] h-[66px] rounded-full border-2 border-[#0A5BC4] ripple-2" style={{ opacity: 0 }}></div>
               <div className="absolute w-[66px] h-[66px] rounded-full border-2 border-[#0A5BC4] ripple-3" style={{ opacity: 0 }}></div>
               <div className="w-[66px] h-[66px] rounded-full bg-[#0A5BC4]/10 flex items-center justify-center relative z-10">
                  <div className="w-[44px] h-[44px] rounded-full bg-[#0A5BC4]"></div>
               </div>
            </div>
            <p className="text-[11px] font-medium text-gray-500 tracking-wider mt-5 uppercase">{t('scanningForLocalDevices')}</p>
          </div>
        </div>

        {/* Scrollable Device List */}
        <div className="flex-1 overflow-y-auto min-h-0 px-5">
          {/* Nearby Devices */}
          <div className="mb-3">
            <h3 className="text-[14px] text-gray-600 mb-3 px-1">{t('nearbyDevices')}</h3>
            <div className="space-y-3">
              {nearbyDevices.length > 0 ? (
                nearbyDevices.map(renderDevice)
              ) : (
                <div className="text-center py-4 text-gray-400 text-sm">
                  {bleState === 'scanning' ? t('scanning') + '...' : t('noDevicesFound')}
                </div>
              )}
            </div>
          </div>

          {/* Others */}
          <div className="mb-4">
            <h3 className="text-[14px] text-gray-600 mb-3 px-1">{t('others')}</h3>
            <div className="space-y-3">
              {otherDevices.length > 0 ? (
                otherDevices.map(renderDevice)
              ) : (
                <div className="text-center py-4 text-gray-400 text-sm">
                  {bleState === 'scanning' ? t('scanning') + '...' : t('noDevicesFound')}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="shrink-0 px-5 pt-2 pb-2.5">
          <div className="space-y-2">
            {qrStatus === 'searching' && qrTargetName && (
              <div className="w-full bg-blue-50 border border-blue-100 rounded-xl py-3 px-4 flex items-center justify-center space-x-2">
                <Loader2 size={16} className="text-[#0A5BC4] animate-spin" />
                <span className="text-sm text-[#0A5BC4] font-medium">
                  {t('qrScanSuccess')?.replace('{name}', qrTargetName) || `Recognized ${qrTargetName}, searching and auto-connecting...`}
                </span>
              </div>
            )}
            {qrError && (
              <div className="w-full bg-red-50 border border-red-100 rounded-xl py-3 px-4 text-center">
                <span className="text-sm text-red-600">{qrError}</span>
              </div>
            )}
            <button
              onClick={() => setIsQrScanning(true)}
              className="w-full flex items-center justify-center space-x-2 bg-[#0A5BC4] text-white rounded-xl py-3.5 font-medium shadow-[0_2px_10px_rgba(10,91,196,0.2)] hover:bg-[#094ca3] transition-colors"
            >
              <Scan size={18} />
              <span>{t('scanQrCode')}</span>
            </button>

            <button
              onClick={onClose}
              className="w-full flex items-center justify-center space-x-2 bg-white text-[#0A5BC4] border border-blue-100 rounded-xl py-3.5 font-medium shadow-sm hover:bg-blue-50 transition-colors"
            >
              <img src="/bluetooth-replace.svg" alt="" className="w-[18px] h-[18px] object-contain" />
              <span>{t('addViaBluetooth')}</span>
            </button>
          </div>

          <div className="text-center mt-2">
            <p className="text-[13px] text-gray-500">
              {t('cantFindDevice')} <a href="#" className="text-[#0A5BC4] hover:underline cursor-pointer">{t('troubleshoot')}</a>
            </p>
          </div>
        </div>
      </div>

      <QrScannerModal
        isOpen={isQrScanning}
        onClose={() => setIsQrScanning(false)}
        onScan={handleQrScan}
      />
    </div>
  );
};
