import React, { useState } from 'react';
import { Scan, Bluetooth, Sofa, Bed, Check, Plus } from 'lucide-react';
import { useTranslation } from '../i18n';
import { useDevice } from '../context';

interface AddDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddDeviceModal: React.FC<AddDeviceModalProps> = ({ isOpen, onClose }) => {
  const [selectedDevice, setSelectedDevice] = useState<string | null>('recliner');
  const { language } = useDevice();
  const t = useTranslation(language);

  if (!isOpen) return null;

  const toggleDevice = (id: string) => {
    if (selectedDevice === id) {
      setSelectedDevice(null);
    } else {
      setSelectedDevice(id);
    }
  };

  const renderDevice = (id: string, name: string, subtitle: string, icon: React.ReactNode) => {
    const isSelected = selectedDevice === id;

    return (
      <div 
        onClick={() => toggleDevice(id)}
        className={`flex items-center justify-between rounded-[16px] p-4 cursor-pointer transition-colors ${
          isSelected 
            ? 'bg-[#F4F8FE] border border-[#0A5BC4]' 
            : 'bg-gray-50 border border-transparent hover:bg-gray-100/50'
        }`}
      >
        <div className="flex items-center space-x-3">
          <div className={`w-[40px] h-[40px] rounded-[10px] bg-white flex items-center justify-center shadow-sm ${isSelected ? 'text-[#0A5BC4]' : 'text-gray-900 border border-gray-100'}`}>
            {icon}
          </div>
          <div>
            <h4 className="text-[15px] font-medium text-gray-900 leading-tight">{name}</h4>
            <p className="text-[13px] text-gray-500 mt-0.5">{subtitle}</p>
          </div>
        </div>
        
        {isSelected ? (
          <div className="w-5 h-5 bg-[#0A5BC4] rounded-full flex items-center justify-center text-white">
            <Check size={12} strokeWidth={3} />
          </div>
        ) : (
          <div className="w-[20px] h-[20px] rounded-full border border-gray-400 flex items-center justify-center text-gray-500">
            <Plus size={14} />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 transition-opacity" onClick={onClose}>
      <div 
        className="bg-[#FAFAFA] rounded-t-[24px] sm:rounded-[24px] w-full max-w-md p-5 pb-8 sm:pb-5 shadow-xl animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200 relative h-[85vh] sm:h-auto overflow-y-auto" 
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-2 border-b border-gray-100 relative">
          <button onClick={onClose} className="text-[#0A5BC4] font-medium text-[15px]">{t('cancel')}</button>
          <h2 className="text-[17px] font-semibold text-gray-900 absolute left-1/2 -translate-x-1/2">{t('addDevice')}</h2>
          <div className="w-[50px]"></div> {/* spacer for centering */}
        </div>

        {/* Radar Animation */}
        <div className="flex flex-col items-center justify-center mt-6 mb-8 relative">
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

        {/* Nearby Devices */}
        <div className="mb-5">
          <h3 className="text-[14px] text-gray-600 mb-3 px-1">{t('nearbyDevices')}</h3>
          <div className="space-y-3">
            {renderDevice('recliner', 'Smart Recliner Pro', t('model') + 'CS-204-X', <Sofa size={20} />)}
            {renderDevice('bed', 'Smart Bed 1', t('readyToPair'), <Bed size={20} />)}
          </div>
        </div>

        {/* Others */}
        <div className="mb-8">
          <h3 className="text-[14px] text-gray-600 mb-3 px-1">{t('others')}</h3>
          <div className="space-y-3">
            {renderDevice('lamp', 'Aromatherapy Lamp', t('readyToPair'), (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v2"/><path d="M12 18v4"/><path d="M22 17H2c0-4 1.5-8 5-11h10c3.5 3 5 7 5 11Z"/>
              </svg>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="space-y-3">
          <button className="w-full flex items-center justify-center space-x-2 bg-[#0A5BC4] text-white rounded-xl py-3.5 font-medium shadow-[0_2px_10px_rgba(10,91,196,0.2)] hover:bg-[#094ca3] transition-colors">
            <Scan size={18} />
            <span>{t('scanQrCode')}</span>
          </button>
          
          <button 
            onClick={onClose}
            className="w-full flex items-center justify-center space-x-2 bg-white text-[#0A5BC4] border border-blue-100 rounded-xl py-3.5 font-medium shadow-sm hover:bg-blue-50 transition-colors"
          >
            <Bluetooth size={18} />
            <span>{t('addViaBluetooth')}</span>
          </button>
        </div>

        <div className="text-center mt-6">
          <p className="text-[13px] text-gray-500">
            {t('cantFindDevice')} <a href="#" className="text-[#0A5BC4] hover:underline cursor-pointer">{t('troubleshoot')}</a>
          </p>
        </div>

      </div>
    </div>
  );
};
