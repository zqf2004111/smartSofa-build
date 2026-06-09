import React, { useState } from 'react';
import { BluetoothSearchModal } from './BluetoothSearchModal';
import { useTranslation } from '../i18n';
import { useDevice } from '../context';

interface BluetoothModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BluetoothModal: React.FC<BluetoothModalProps> = ({ isOpen, onClose }) => {
  const [audioType, setAudioType] = useState<'BLE' | 'TV'>('BLE');
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const { language } = useDevice();
  const t = useTranslation(language);

  if (!isOpen) return null;

  return (
    <>
      <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/40 transition-opacity ${isSearchModalOpen ? 'opacity-0 pointer-events-none' : ''}`} onClick={onClose}>
        <div 
          className="bg-[#FAFAFA] rounded-[24px] w-[300px] p-6 shadow-xl animate-in zoom-in-95 duration-200" 
          onClick={e => e.stopPropagation()}
        >
          <h2 className="text-[14px] font-semibold text-gray-900 mb-8 mt-1">{t('connectBluetooth')}</h2>
          
          <div className="space-y-6 mb-8">
            <div className="flex items-center justify-between">
              <span className="text-[14px] text-gray-800">{t('audio')}</span>
              <div className="flex space-x-2">
                <button 
                  onClick={() => setAudioType('BLE')}
                  className={`w-[72px] h-[32px] rounded-[12px] text-[13px] font-medium transition-colors ${
                    audioType === 'BLE' 
                      ? 'bg-[#0A5BC4] text-white' 
                      : 'bg-[#E5E7EB] text-[#0A5BC4]'
                  }`}
                >
                  BLE
                </button>
                <button 
                  onClick={() => setAudioType('TV')}
                  className={`w-[72px] h-[32px] rounded-[12px] text-[13px] font-medium transition-colors ${
                    audioType === 'TV' 
                      ? 'bg-[#0A5BC4] text-white' 
                      : 'bg-[#E5E7EB] text-[#0A5BC4]'
                  }`}
                >
                  TV
                </button>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-[14px] text-gray-800">{t('adHocNetwork')}</span>
              <button 
                onClick={(e) => { e.stopPropagation(); setIsSearchModalOpen(true); }}
                className="w-[152px] h-[32px] rounded-[12px] bg-[#E5E7EB] text-[#0A5BC4] text-[13px] font-medium"
              >
                {t('search')}
              </button>
            </div>
          </div>

          <div className="flex flex-col space-y-3">
            <button 
              onClick={onClose}
              className="w-full h-[42px] bg-[#0A5BC4] text-white rounded-[20px] text-[14px] font-medium"
            >
              {t('confirm')}
            </button>
            <button 
              onClick={onClose}
              className="w-full h-[42px] bg-white text-gray-800 border border-[#0A5BC4] rounded-[20px] text-[14px] font-medium box-border"
            >
              {t('cancel')}
            </button>
          </div>
        </div>
      </div>

      <BluetoothSearchModal 
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
      />
    </>
  );
};
