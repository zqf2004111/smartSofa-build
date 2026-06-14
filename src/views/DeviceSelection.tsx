import React, { useState } from 'react';
import { Plus, Minus, Loader2 } from 'lucide-react';
import { useTranslation } from '../i18n';
import { useDevice } from '../context';
import reclinerImg from '../assets/recliner.png';

interface DeviceSelectionProps {
  onSelectDevice: (id: string) => void;
  onAddDevice: () => void;
  isManaging?: boolean;
  onManagingChange?: (v: boolean) => void;
}

export function DeviceSelectionView({ onSelectDevice, onAddDevice, isManaging = false, onManagingChange }: DeviceSelectionProps) {
  const { language, savedDevices, removeSavedDevice } = useDevice();
  const t = useTranslation(language);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const setIsManaging = (v: boolean) => onManagingChange?.(v);

  return (
    <div className="w-full h-screen bg-[#f4f4f4] flex flex-col items-center">
      <div style={{ paddingTop: 'max(0.85rem, calc(env(safe-area-inset-top) + 0.35rem))' }} className="w-full max-w-md bg-white pb-3 flex items-center justify-between px-4 mb-2">
        <button 
          onClick={() => setIsManaging(!isManaging)}
          className="text-[15px] font-medium text-[#0A5BC4] px-2 py-1"
        >
          {isManaging ? t('cancel') || '取消' : t('manage') || '管理'}
        </button>
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
                  onClick={() => !isManaging && onSelectDevice(device.id)}
                  className="flex flex-col items-center cursor-pointer relative"
                >
                  {isManaging && (
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        setDeletingId(device.id);
                        try {
                          await removeSavedDevice(device.id);
                        } finally {
                          setDeletingId(null);
                        }
                      }}
                      disabled={deletingId !== null}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center z-10 disabled:opacity-50"
                    >
                      <Minus size={12} className="text-white" />
                    </button>
                  )}
                  <div className="w-[120px] h-[80px] flex items-center justify-center mb-2">
                    <img 
                      src={reclinerImg} 
                      alt={device.name} 
                      className="w-[100px] h-full object-contain mix-blend-multiply" 
                    />
                  </div>
                  <span className="text-[13px] text-gray-800 text-center font-medium leading-tight">{device.name}</span>
                  <span className="text-[10px] text-gray-400 text-center mt-0.5">{device.id.slice(-8).toUpperCase()}</span>
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

      {/* Deleting loading overlay */}
      {deletingId !== null && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
          <div className="bg-white rounded-2xl px-8 py-6 flex flex-col items-center shadow-xl">
            <Loader2 className="w-8 h-8 text-[#0A5BC4] animate-spin mb-3" />
            <span className="text-[15px] font-medium text-gray-800">{t('deletingDevice')}</span>
          </div>
        </div>
      )}
    </div>
  );
}
