import React, { useState } from 'react';
import { useDevice } from '../../context';
import { TimerModal } from '../../components/TimerModal';
import { useTranslation } from '../../i18n';

export function VentilationTab() {
  const { state, updateState, language } = useDevice();
  const t = useTranslation(language);
  const [isTimerModalOpen, setIsTimerModalOpen] = useState(false);

  const handleTimerConfirm = (val: number) => {
    updateState({ timerOn: true, timerDuration: val, timerRemaining: val * 60 });
    setIsTimerModalOpen(false);
  };
  
  const modes = [
    { id: 'gentle', label: t('gentle'), icon: './ventilation-icon/gentle.png', iconSelected: './ventilation-icon/gentle-selected.png' },
    { id: 'rapid', label: t('rapid'), icon: './ventilation-icon/rapid.png', iconSelected: './ventilation-icon/rapid-selected.png' },
  ];

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
      <div className={`transition-opacity duration-300 ${!state.ventilationOn && false ? 'opacity-50 pointer-events-none' : ''}`}>
        
        {/* Modes */}
        <div className="flex flex-wrap gap-4 mt-2 mb-8">
            {modes.map((mode) => {
              const isActive = state.ventilationMode === mode.id;
              return (
                <button
                  key={mode.id}
                  onClick={() => updateState({ ventilationMode: mode.id, ventilationOn: true })}
                  className="flex flex-col items-center justify-center w-[calc(33.333%-8px)] mb-4"
                >
                  <img 
                    src={isActive ? mode.iconSelected : mode.icon} 
                    alt={mode.label} 
                    className="w-[72px] h-[72px] object-contain mb-2"
                  />
                  <span className="text-[13px] font-semibold text-[#0A5BC4]">{mode.label}</span>
                </button>
              );
            })}
        </div>

        {/* Timer Toggle */}
        <div className="pt-6 border-t border-gray-50 mt-4 mb-2">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[15px] font-medium text-gray-900 leading-tight">{t('timer')}</span>
              <span className="text-[12px] font-medium text-gray-500 mt-1">
                {t('setTimerPrefix')}{state.timerDuration}{t('setTimerSuffix')}
              </span>
            </div>
            
            <div className="flex items-center space-x-4">
              {state.timerOn && (
                <span className="text-[14px] font-semibold text-[#0A5BC4]">
                  {Math.floor(state.timerRemaining / 60).toString().padStart(2, '0')}:{(state.timerRemaining % 60).toString().padStart(2, '0')}
                </span>
              )}
              {/* Toggle Switch */}
              <button 
                className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 ease-in-out border ${
                  state.timerOn ? 'bg-[#0A5BC4] border-[#0A5BC4]' : 'bg-gray-100 border-gray-200'
                }`}
                onClick={() => {
                  if (state.timerOn) {
                    updateState({ timerOn: false });
                  } else {
                    setIsTimerModalOpen(true);
                  }
                }}
              >
                <div 
                  className={`w-5 h-5 bg-white rounded-full shadow-[0_1px_2px_rgba(0,0,0,0.1)] transform transition-transform duration-200 ease-in-out ${
                    state.timerOn ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <TimerModal 
        isOpen={isTimerModalOpen} 
        onClose={() => setIsTimerModalOpen(false)}
        initialTime={state.timerDuration}
        onConfirm={handleTimerConfirm}
      />
    </div>
  );
}


