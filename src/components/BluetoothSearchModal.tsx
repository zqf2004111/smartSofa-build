import React from 'react';
import { useTranslation } from '../i18n';
import { useDevice } from '../context';

interface BluetoothSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BluetoothSearchModal: React.FC<BluetoothSearchModalProps> = ({ isOpen, onClose }) => {
  const { language } = useDevice();
  const t = useTranslation(language);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 transition-opacity" onClick={onClose}>
      <div 
        className="bg-[#FAFAFA] rounded-[24px] w-[300px] p-6 shadow-xl animate-in zoom-in-95 duration-200 h-[320px] flex flex-col justify-between" 
        onClick={e => e.stopPropagation()}
      >
        {/* Radar Animation */}
        <div className="flex flex-col items-center justify-center flex-1 w-full relative pt-10 pb-6">
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes scan-ripple-blue {
              0% { transform: scale(0.8); opacity: 0.5; }
              100% { transform: scale(2.5); opacity: 0; }
            }
            .ripple-blue-1 { animation: scan-ripple-blue 2s cubic-bezier(0, 0.2, 0.8, 1) infinite; }
            .ripple-blue-2 { animation: scan-ripple-blue 2s cubic-bezier(0, 0.2, 0.8, 1) infinite 0.6s; }
            .ripple-blue-3 { animation: scan-ripple-blue 2s cubic-bezier(0, 0.2, 0.8, 1) infinite 1.2s; }
          `}} />
          <div className="w-[88px] h-[88px] flex items-center justify-center relative mb-8">
             <div className="absolute w-[66px] h-[66px] rounded-full border border-[#0A5BC4] ripple-blue-1"></div>
             <div className="absolute w-[66px] h-[66px] rounded-full border border-[#0A5BC4] ripple-blue-2" style={{ opacity: 0 }}></div>
             <div className="absolute w-[66px] h-[66px] rounded-full border border-[#0A5BC4] ripple-blue-3" style={{ opacity: 0 }}></div>
             
             <div className="w-[66px] h-[66px] rounded-full bg-[#0A5BC4]/5 flex items-center justify-center relative z-10 shadow-sm border border-[#0A5BC4]/10">
                <div className="w-[44px] h-[44px] rounded-full bg-[#0A5BC4] shadow-[0_4px_12px_rgba(10,91,196,0.4)]"></div>
             </div>
          </div>
          <p className="text-[11px] font-medium text-gray-500 tracking-wide uppercase mt-4">{t('scanningForLocalDevices')}</p>
        </div>

        <div className="w-full mt-4">
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
