import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useDevice } from '../../context';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { useTranslation } from '../../i18n';

export function PostureTab() {
  const { sendPositionCommand, sendMotorCommand, setMemoryPosition, language, deviceConfig } = useDevice();
  const t = useTranslation(language);
  const [activePreset, setActivePreset] = useState('');
  const [toast, setToast] = useState('');

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPress = useRef(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const presets = [
    { id: 'home', label: t('home'), icon: '/posture-icon/home.svg', iconSelected: '/posture-icon/home-selected.svg', code: 'home' as const },
    { id: 'tv', label: t('tv'), icon: '/posture-icon/tv.svg', iconSelected: '/posture-icon/tv-selected.svg', code: 'tv' as const },
    { id: 'zg', label: t('zg'), icon: '/posture-icon/zg.svg', iconSelected: '/posture-icon/zg-selected.svg', code: 'zg' as const },
    { id: 'memory', label: t('memory'), icon: '/posture-icon/memory.svg', iconSelected: '/posture-icon/memory-selected.svg', code: 'memory' as const },
  ];

  // Dynamic motor list from device config, fallback to seat+head for demo
  const allMotors = [
    { id: 'seat', label: t('seat') },
    { id: 'head', label: t('head') },
    { id: 'lumbar', label: t('lumbar') },
    { id: 'back', label: t('back') },
    { id: 'foot', label: t('foot') },
  ];

  const motors = deviceConfig?.motors.length
    ? allMotors.filter((m) => deviceConfig.motors.some((cfg) => cfg.type === m.id))
    : allMotors.slice(0, 2); // Default: seat + head

  const handlePresetClick = (preset: typeof presets[0]) => {
    if (preset.id === 'memory') {
      // Short press: run memory
      sendPositionCommand('memory');
      setActivePreset('memory');
      return;
    }

    if (activePreset === preset.id) {
      setActivePreset('');
    } else {
      setActivePreset(preset.id);
      sendPositionCommand(preset.code);
    }
  };

  const handleMemoryPointerDown = useCallback(() => {
    isLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      setMemoryPosition(1); // Save to slot 1
      // Visual feedback
      setActivePreset('memory');
      // Show toast
      setToast(t('memorySaved'));
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(''), 2500);
    }, 3000);
  }, [setMemoryPosition]);

  const handleMemoryPointerUp = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (!isLongPress.current) {
      // Short press: run memory
      sendPositionCommand('memory');
      setActivePreset('memory');
    }
  }, [sendPositionCommand]);

  const handleMemoryPointerLeave = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  return (
    <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
      
      {/* Presets */}
      <div className="grid grid-cols-4 gap-4 px-2">
        {presets.map((preset) => {
          const isActive = preset.id === activePreset;
          const isMemory = preset.id === 'memory';
          return (
            <button 
              key={preset.id}
              onClick={() => {
                if (!isMemory) handlePresetClick(preset);
              }}
              onPointerDown={isMemory ? handleMemoryPointerDown : undefined}
              onPointerUp={isMemory ? handleMemoryPointerUp : undefined}
              onPointerLeave={isMemory ? handleMemoryPointerLeave : undefined}
              className="flex flex-col items-center group select-none"
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

      {/* Motors - Dynamic based on device config */}
      <div className={`grid gap-6 px-3 ${motors.length === 1 ? 'grid-cols-1' : motors.length === 2 ? 'grid-cols-2' : 'grid-cols-2'}`}>
        {motors.map((motor) => (
          <div key={motor.id} className="flex flex-col items-center bg-[#F4F6F9] rounded-[24px] p-2 py-3 pb-2 border border-gray-100/50">
            <button
              onPointerDown={() => sendMotorCommand(motor.id, 'up')}
              onPointerUp={() => sendMotorCommand(motor.id, 'stop')}
              onPointerLeave={() => sendMotorCommand(motor.id, 'stop')}
              className="w-[90%] h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm active:scale-95 transition-transform select-none"
            >
              <ChevronUp size={28} className="text-gray-800" strokeWidth={3} />
            </button>

            <span className="text-sm font-semibold text-gray-800 my-4 tracking-wide select-none" onContextMenu={(e) => e.preventDefault()}>{motor.label}</span>

            <button
              onPointerDown={() => sendMotorCommand(motor.id, 'down')}
              onPointerUp={() => sendMotorCommand(motor.id, 'stop')}
              onPointerLeave={() => sendMotorCommand(motor.id, 'stop')}
              className="w-[90%] h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm active:scale-95 transition-transform select-none"
            >
              <ChevronDown size={28} className="text-gray-800" strokeWidth={3} />
            </button>
          </div>
        ))}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-gray-900/90 text-white text-[14px] font-medium px-5 py-2.5 rounded-full shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
          {toast}
        </div>
      )}
    </div>
  );
}
