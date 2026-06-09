import React from 'react';
import { Sofa } from 'lucide-react';
import { useTranslation } from '../i18n';
import { useDevice } from '../context';

interface DeviceSwitchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDevice: (id: string) => void;
}

export const DeviceSwitchModal: React.FC<DeviceSwitchModalProps> = ({ isOpen, onClose, onSelectDevice }) => {
  const { language, savedDevices } = useDevice();
  const t = useTranslation(language);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div
        className="bg-white rounded-[20px] w-[280px] max-w-[85vw] shadow-xl py-3 px-3 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {savedDevices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6">
              <Sofa size={32} className="text-gray-300 mb-2" />
              <p className="text-[13px] text-gray-400 text-center">{t('noSavedDevices')}</p>
            </div>
          ) : (
            savedDevices.map((device, index) => {
              const isSelected = index === 0;
              return (
                <div
                  key={device.id}
                  onClick={() => {
                    onSelectDevice(device.id);
                    onClose();
                  }}
                  className={`flex items-center rounded-[14px] p-3 cursor-pointer transition-all active:scale-[0.98] ${
                    isSelected
                      ? 'border-2 border-[#0A5BC4] bg-white'
                      : 'border border-gray-100 bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center mr-3 ${
                    isSelected ? 'bg-[#0A5BC4]/10' : 'bg-gray-100'
                  }`}>
                    <Sofa size={18} className={isSelected ? 'text-[#0A5BC4]' : 'text-gray-500'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium text-gray-900 truncate">{device.name}</p>
                    <p className="text-[12px] text-gray-400 mt-0.5">Model: {device.id.slice(0, 8).toUpperCase()}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
