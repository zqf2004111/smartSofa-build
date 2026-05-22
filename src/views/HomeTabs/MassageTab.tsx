import React, { useState } from 'react';
import { useDevice } from '../../context';
import { Activity, PawPrint, Wind, MousePointerClick, Hand, Power, Clock } from 'lucide-react';
import { TimerModal } from '../../components/TimerModal';
import { useTranslation } from '../../i18n';

export function MassageTab() {
  const { state, updateState, language } = useDevice();
  const t = useTranslation(language);
  const [isTimerModalOpen, setIsTimerModalOpen] = useState(false);

  const handleTimerConfirm = (val: number) => {
    updateState({ timerOn: true, timerDuration: val, timerRemaining: val * 60 });
    setIsTimerModalOpen(false);
  };

  const modes = [
    { id: 'wave', label: t('wave'), icon: '/massage-icon/Wave.png', iconSelected: '/massage-icon/Wave-selected.png' },
    { id: 'catwalk', label: t('catwalk'), icon: '/massage-icon/catwalk.png', iconSelected: '/massage-icon/catwalk-selected.png' },
    { id: 'butterfly', label: t('butterfly'), icon: '/massage-icon/butterfly.png', iconSelected: '/massage-icon/butterfly-selected.png' },
    { id: 'acupressure', label: t('acupressure'), icon: '/massage-icon/acupressure.png', iconSelected: '/massage-icon/acrpressure-selected.png' },
    { id: 'pat', label: t('pat'), icon: '/massage-icon/pat.png', iconSelected: '/massage-icon/pat-selected.png' },
  ];

  const times = [5, 10, 15, 20, 25, 30];

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
      
      {/* Power Toggle */}
      <div className="flex justify-between items-center p-5 bg-white rounded-3xl shadow-sm border border-gray-100">
         <div className="flex flex-col">
           <span className="text-sm font-bold text-gray-900">{t('massage')}</span>
           <span className="text-xs text-gray-400">8-Point Airbag Control</span>
         </div>
         <button 
           onClick={() => updateState({ massageOn: !state.massageOn })}
           className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-colors ${state.massageOn ? 'bg-primary text-white shadow-md shadow-primary/30' : 'bg-gray-100 text-gray-400'}`}
         >
           <Power size={20} />
         </button>
      </div>

      <div className={`transition-opacity duration-300 ${!state.massageOn ? 'opacity-50 pointer-events-none' : ''}`}>
        
        {/* Modes */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">{t('massageMode')}</h3>
          <div className="flex flex-wrap gap-3">
            {modes.map((mode) => {
              const isActive = state.massageMode === mode.id;
              return (
                <button
                  key={mode.id}
                  onClick={() => updateState({ massageMode: mode.id })}
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
