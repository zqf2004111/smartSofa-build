import React from 'react';
import { Plus } from 'lucide-react';
import { useTranslation } from '../i18n';
import { useDevice } from '../context';
import reclinerImg from '../assets/recliner.png';

interface DeviceSelectionProps {
  onSelectDevice: (id: string) => void;
  onAddDevice: () => void;
}

export function DeviceSelectionView({ onSelectDevice, onAddDevice }: DeviceSelectionProps) {
  const { language, savedDevices } = useDevice();
  const t = useTranslation(language);

  return (
    <div className="w-full h-screen bg-[#f4f4f4] flex flex-col items-center">
      <div className="w-full max-w-md bg-white pt-12 pb-3 flex items-center justify-end px-4 mb-2">
        <button onClick={onAddDevice} className="p-2">
          <Plus size={24} className="text-black" />
        </button>
      </div>
      
      <div className="w-full max-w-[360px] bg-white rounded-3xl px-6 pt-6 pb-5 mt-6 shadow-sm overflow-y-auto">
        {savedDevices.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-4 pb-2">
            <p className="text-[15px] text-gray-400 text-center">{t('noSavedDevices')}</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-x-4 gap-y-6 mb-8">
              {savedDevices.map((device) => (
                <div 
                  key={device.id}
                  onClick={() => onSelectDevice(device.id)}
                  className="flex flex-col items-center cursor-pointer"
                >
                  <div className="w-[120px] h-[80px] flex items-center justify-center mb-2">
                    <img 
                      src={reclinerImg} 
                      alt={device.name} 
                      className="w-[100px] h-full object-contain mix-blend-multiply" 
                    />
                  </div>
                  <span className="text-[13px] text-gray-800 text-center font-medium leading-tight">{device.name}</span>
                </div>
              ))}
            </div>
          </>
        )}
        
        <button 
          onClick={onAddDevice}
          className="w-full bg-[#0A5BC4] hover:bg-[#094ca3] text-white py-3.5 rounded-xl text-[15px] font-medium transition-colors"
        >
          {t('addDevice')}
        </button>
      </div>
    </div>
  );
}
