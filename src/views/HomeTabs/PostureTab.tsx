import React, { useState } from 'react';
import { useDevice } from '../../context';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { useTranslation } from '../../i18n';

export function PostureTab() {
  const { sendPositionCommand, sendMotorCommand, language } = useDevice();
  const t = useTranslation(language);
  const [activePreset, setActivePreset] = useState('zg');

  const presets = [
    { id: 'home', label: t('home'), icon: '/posture-icon/home.png', iconSelected: '/posture-icon/home-selected.png', code: 'home' },
    { id: 'tv', label: t('tv'), icon: '/posture-icon/tv.png', iconSelected: '/posture-icon/tv-selected.png', code: 'tv' },
    { id: 'zg', label: t('zg'), icon: '/posture-icon/zg.png', iconSelected: '/posture-icon/zg-selected.png', code: 'zg' },
    { id: 'memory', label: t('memory'), icon: '/posture-icon/memory.png', iconSelected: '/posture-icon/memory-selected.png', code: 'memory' },
  ];

  const motors = [
    { id: 'seat', label: t('seat') },
    { id: 'head', label: t('head') },
  ];

  return (
    <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
      
      {/* Presets */}
      <div className="grid grid-cols-4 gap-4 px-2">
        {presets.map((preset) => {
          const isActive = preset.id === activePreset;
          return (
            <button 
              key={preset.id}
              onClick={() => {
                setActivePreset(preset.id);
                sendPositionCommand(preset.code);
              }}
              className="flex flex-col items-center group"
            >
              <img 
                src={isActive ? preset.iconSelected : preset.icon}
                alt={preset.label}
                className="w-[66px] h-[66px] object-contain mb-2"
              />
              <span className={`text-xs font-semibold tracking-wide text-[#0A5BC4]`}>
                {preset.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Motors */}
      <div className="grid grid-cols-2 gap-6 px-3">
        {motors.map((motor) => (
          <div key={motor.id} className="flex flex-col items-center bg-[#F4F6F9] rounded-[24px] p-2 py-3 pb-2 border border-gray-100/50">
            <button 
              onPointerDown={() => sendMotorCommand(motor.id as any, 'up')}
              onPointerUp={() => sendMotorCommand(motor.id as any, 'stop')}
              onPointerLeave={() => sendMotorCommand(motor.id as any, 'stop')}
              className="w-[90%] h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm active:scale-95 transition-transform"
            >
              <ChevronUp size={28} className="text-gray-800" strokeWidth={3} />
            </button>
            
            <span className="text-sm font-semibold text-gray-800 my-4 tracking-wide">{motor.label}</span>
            
            <button 
              onPointerDown={() => sendMotorCommand(motor.id as any, 'down')}
              onPointerUp={() => sendMotorCommand(motor.id as any, 'stop')}
              onPointerLeave={() => sendMotorCommand(motor.id as any, 'stop')}
              className="w-[90%] h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm active:scale-95 transition-transform"
            >
              <ChevronDown size={28} className="text-gray-800" strokeWidth={3} />
            </button>
          </div>
        ))}
      </div>

    </div>
  );
}
