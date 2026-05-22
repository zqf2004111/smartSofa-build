import React from 'react';
import { Plus } from 'lucide-react';
import { useTranslation } from '../i18n';
import { useDevice } from '../context';

interface DeviceData {
  id: string;
  name: string;
  image: string;
}

const devices: DeviceData[] = [
  { id: '1', name: 'Recliner Plus', image: '/devices/recliner-plus.png' },
  { id: '2', name: 'Recliner Pro', image: '/devices/recliner-pro.png' },
  { id: '3', name: 'Power Recliner', image: '/devices/power-recliner.png' },
  { id: '4', name: 'loveseat Recliner', image: '/devices/loveseat-recliner.png' },
  { id: '5', name: 'Smart Recliner', image: '/devices/smart-recliner.png' },
  { id: '6', name: 'Smart Recliner', image: '/devices/smart-recliner2.png' }
];

interface DeviceSelectionProps {
  onSelectDevice: (id: string) => void;
  onAddDevice: () => void;
}

export function DeviceSelectionView({ onSelectDevice, onAddDevice }: DeviceSelectionProps) {
  const { language } = useDevice();
  const t = useTranslation(language);

  return (
    <div className="w-full h-screen bg-[#f4f4f4] flex flex-col items-center">
      <div className="w-full max-w-md bg-white h-14 flex items-center justify-end px-4 mb-2">
        <button onClick={onAddDevice} className="p-2">
          <Plus size={24} className="text-black" />
        </button>
      </div>
      
      <div className="w-full max-w-[360px] bg-white rounded-3xl p-6 mt-6 shadow-sm">
        <div className="grid grid-cols-2 gap-x-4 gap-y-6 mb-8">
          {devices.map((device, index) => (
            <div 
              key={index}
              onClick={() => onSelectDevice(device.id)}
              className="flex flex-col items-center cursor-pointer"
            >
              {/* Note: In reality they are images, but since we don't have them, I'll put a fallback */}
              <div className="w-[120px] h-[80px] flex items-center justify-center mb-2">
                <img 
                  src="./Recliner.png" 
                  alt={device.name} 
                  className="w-[100px] h-full object-contain mix-blend-multiply" 
                />
              </div>
              <span className="text-[13px] text-gray-800 text-center font-medium leading-tight">{device.name}</span>
            </div>
          ))}
        </div>
        
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
