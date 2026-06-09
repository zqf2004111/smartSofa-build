import React, { useState } from 'react';
import { useDevice } from '../../context';
import { Clock } from 'lucide-react';
import { TimerModal } from '../../components/TimerModal';
import { useTranslation } from '../../i18n';

export function MassageTab() {
  const { state, updateState, language, sendMassageCommand, sendTimerCommand } = useDevice();
  const t = useTranslation(language);
  const [isTimerModalOpen, setIsTimerModalOpen] = useState(false);

  const handleTimerConfirm = (val: number) => {
    updateState({ massageTimerOn: true, massageTimerDuration: val, massageTimerRemaining: val * 60, massageTimerStartAt: Date.now() });
    sendTimerCommand('massage', val);
    setIsTimerModalOpen(false);
  };

  const handleModeClick = (modeId: string) => {
    if (state.massageMode === modeId) {
      updateState({ massageMode: '' });
      sendMassageCommand('', 0);
    } else {
      updateState({ massageMode: modeId });
      sendMassageCommand(modeId, state.massageIntensity);
    }
  };

  const handleIntensityChange = (level: number) => {
    updateState({ massageIntensity: level });
    if (state.massageMode !== '') {
      sendMassageCommand(state.massageMode, level);
    }
  };

  const modes = [
    { id: 'wave', label: t('wave'), icon: '/massage-icon/Wave.svg', iconSelected: '/massage-icon/Wave-selected.svg' },
    { id: 'catwalk', label: t('catwalk'), icon: '/massage-icon/catwalk.svg', iconSelected: '/massage-icon/catwalk-selected.svg' },
    { id: 'butterfly', label: t('butterfly'), icon: '/massage-icon/butterfly.svg', iconSelected: '/massage-icon/butterfly-selected.svg' },
    { id: 'acupressure', label: t('acupressure'), icon: '/massage-icon/acupressure.svg', iconSelected: '/massage-icon/acupressure-selected.svg' },
    { id: 'pat', label: t('pat'), icon: '/massage-icon/pat.svg', iconSelected: '/massage-icon/pat-selected.svg' },
  ];

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
      
      {/* Modes */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 mb-6">
        <div className="flex flex-wrap gap-3">
          {modes.map((mode) => {
            const isActive = state.massageMode === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => handleModeClick(mode.id)}
                className="flex flex-col items-center justify-center w-[calc(33.333%-8px)] mb-4"
              >
                <img 
                  src={isActive ? mode.iconSelected : mode.icon} 
                  alt={mode.label} 
                  className="w-[72px] h-[72px] object-contain mb-2"
                />
                <span className={`text-[13px] font-semibold ${isActive ? 'text-[#0A5BC4]' : 'text-gray-500'}`}>{mode.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Intensity */}
      {state.massageMode !== '' && (
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center mb-4">
            <span className="text-[15px] font-medium text-gray-900">{t('intensity') || 'Intensity'}</span>
          </div>
          <div className="flex items-center space-x-3">
            {[1, 2, 3].map((level) => (
              <button
                key={level}
                onClick={() => handleIntensityChange(level)}
                className={`flex-1 h-11 rounded-xl text-sm font-semibold transition-colors ${
                  state.massageIntensity === level
                    ? 'bg-[#0A5BC4] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Timer Toggle */}
      <div className="pt-6 border-t border-gray-50 mt-4 mb-2">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[15px] font-medium text-gray-900 leading-tight">{t('timer')}</span>
            <span className="text-[12px] font-medium text-gray-500 mt-1">
              {t('setTimerPrefix')}{state.massageTimerDuration}{t('setTimerSuffix')}
            </span>
          </div>
          
          <div className="flex items-center space-x-4">
            {state.massageTimerOn && (
              <span className="text-[14px] font-semibold text-[#0A5BC4]">
                {Math.floor(state.massageTimerRemaining / 60).toString().padStart(2, '0')}:{(state.massageTimerRemaining % 60).toString().padStart(2, '0')}
              </span>
            )}
            {/* Toggle Switch */}
            <button 
              className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 ease-in-out border ${
                state.massageTimerOn ? 'bg-[#0A5BC4] border-[#0A5BC4]' : 'bg-gray-100 border-gray-200'
              }`}
              onClick={() => {
                if (state.massageTimerOn) {
                  updateState({ massageTimerOn: false, massageTimerStartAt: null });
                  sendTimerCommand('massage', 0);
                } else if (state.massageMode !== '') {
                  setIsTimerModalOpen(true);
                }
              }}
            >
              <div 
                className={`w-5 h-5 bg-white rounded-full shadow-[0_1px_2px_rgba(0,0,0,0.1)] transform transition-transform duration-200 ease-in-out ${
                  state.massageTimerOn ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      <TimerModal 
        isOpen={isTimerModalOpen} 
        onClose={() => setIsTimerModalOpen(false)}
        initialTime={state.massageTimerDuration}
        onConfirm={handleTimerConfirm}
      />
    </div>
  );
}
