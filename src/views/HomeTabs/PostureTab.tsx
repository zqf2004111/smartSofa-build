import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useDevice } from '../../context';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { useTranslation } from '../../i18n';

export function PostureTab() {
  const { sendPositionCommand, sendMotorCommand, setMemoryPosition, language, deviceConfig } = useDevice();
  const t = useTranslation(language);
  const [activePreset, setActivePreset] = useState('');
  const [toast, setToast] = useState('');
  const [memoryCountdown, setMemoryCountdown] = useState<number | null>(null);

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const isLongPress = useRef(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearMemoryTimers = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (countdownTimer.current) {
      clearInterval(countdownTimer.current);
      countdownTimer.current = null;
    }
  }, []);

  const hasZeroGravity = deviceConfig?.sofaFrameType !== 'normal';

  const posturePreset = hasZeroGravity
    ? { id: 'zg', label: t('zg'), icon: '/posture-icon/zg.svg', iconSelected: '/posture-icon/zg-selected.svg', code: 'zg' as const }
    : { id: 'recline', label: t('recline'), icon: '/posture-icon/recline.svg', iconSelected: '/posture-icon/recline-selected.svg', code: 'recline' as const };

  const presets = [
    { id: 'home', label: t('home'), icon: '/posture-icon/home.svg', iconSelected: '/posture-icon/home-selected.svg', code: 'home' as const },
    { id: 'tv', label: t('tv'), icon: '/posture-icon/tv.svg', iconSelected: '/posture-icon/tv-selected.svg', code: 'tv' as const },
    posturePreset,
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
    setMemoryCountdown(3);
    countdownTimer.current = setInterval(() => {
      setMemoryCountdown((prev) => {
        if (prev === null || prev <= 1) {
          if (countdownTimer.current) {
            clearInterval(countdownTimer.current);
            countdownTimer.current = null;
          }
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      setMemoryPosition(1); // Save to slot 1
      setMemoryCountdown(null);
      clearMemoryTimers();
      // Saving the memory is not a posture activation, so do not keep the slot highlighted
      setActivePreset('');
      // Show toast
      setToast(t('memorySaved'));
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(''), 2500);
    }, 3000);
  }, [setMemoryPosition, clearMemoryTimers, t]);

  const handleMemoryPointerUp = useCallback(() => {
    clearMemoryTimers();
    setMemoryCountdown(null);
    if (!isLongPress.current) {
      // Short press: toggle memory selection
      if (activePreset === 'memory') {
        setActivePreset('');
      } else {
        sendPositionCommand('memory');
        setActivePreset('memory');
      }
    }
  }, [sendPositionCommand, clearMemoryTimers, activePreset]);

  const handleMemoryPointerLeave = useCallback(() => {
    clearMemoryTimers();
    setMemoryCountdown(null);
  }, [clearMemoryTimers]);

  useEffect(() => {
    return () => {
      clearMemoryTimers();
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, [clearMemoryTimers]);

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
              onContextMenu={(e) => e.preventDefault()}
              className="flex flex-col items-center group select-none relative"
            >
              <div className="relative">
                <img 
                  src={isActive ? preset.iconSelected : preset.icon}
                  alt={preset.label}
                  className="w-[66px] h-[66px] object-contain mb-2"
                />
                {isMemory && memoryCountdown !== null && (
                  <div className="absolute inset-0 flex items-center justify-center mb-2">
                    <div className="w-[66px] h-[66px] rounded-full bg-gray-900/60 flex items-center justify-center">
                      <span className="text-white text-2xl font-bold">{memoryCountdown}</span>
                    </div>
                  </div>
                )}
              </div>
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
