import React, { useState } from 'react';
import { useDevice } from '../../context';
import { TimerModal } from '../../components/TimerModal';
import { useTranslation } from '../../i18n';
import type { VentilationZoneKey } from '../../bluetooth/parser';
import { VENTILATION_ZONE_ORDER } from '../../bluetooth/parser';

export function VentilationTab() {
  const { state, updateState, language, sendVentilationCommand, sendHeatingCommand, sendTimerCommand, deviceConfig } = useDevice();
  const t = useTranslation(language);
  const [isTimerModalOpen, setIsTimerModalOpen] = useState(false);

  const supportedZones = React.useMemo<VentilationZoneKey[]>(() => {
    const cfg = deviceConfig?.ventilation;
    if (!cfg) return [];
    return VENTILATION_ZONE_ORDER.filter((z) => cfg[z]);
  }, [deviceConfig?.ventilation]);

  const handleTimerConfirm = (val: number) => {
    if (val <= 0) {
      // 关闭：UI 不本地更新，等设备响应驱动
      sendTimerCommand('ventilation', 0);
    } else {
      updateState({ ventilationTimerOn: true, ventilationTimerDuration: val, ventilationTimerRemaining: val * 60, ventilationTimerStartAt: Date.now() });
      sendTimerCommand('ventilation', val);
    }
    setIsTimerModalOpen(false);
  };

  const modes = [
    { id: 'gentle', label: t('gentle'), icon: '/ventilation-icon/gentle.svg', iconSelected: '/ventilation-icon/gentle-selected.svg' },
    { id: 'rapid', label: t('rapid'), icon: '/ventilation-icon/rapid.svg', iconSelected: '/ventilation-icon/rapid-selected.svg' },
  ];

  const turnOffHeatingIfOn = () => {
    if (state.heatingOn) {
      sendHeatingCommand(state.heatingMode, false);
    }
    if (state.heatingTimerOn) {
      // 只发命令，等响应驱动
      sendTimerCommand('heating', 0);
    }
  };

  const handleModeClick = (modeId: string) => {
    if (state.ventilationMode === modeId && state.ventilationOn) {
      updateState({ ventilationOn: false });
      sendVentilationCommand(modeId, false);
    } else {
      turnOffHeatingIfOn();
      const targetZones = state.ventilationSelectedZones.length > 0 ? state.ventilationSelectedZones : supportedZones;
      updateState({ ventilationMode: modeId, ventilationOn: true, ventilationSelectedZones: targetZones });
      sendVentilationCommand(modeId, true, targetZones);
    }
  };

  const handleZoneToggle = (zone: VentilationZoneKey) => {
    const isSelected = state.ventilationSelectedZones.includes(zone);
    const effectiveMode = state.ventilationMode || 'gentle';
    if (isSelected) {
      const nextSelected = state.ventilationSelectedZones.filter((z) => z !== zone);
      updateState({ ventilationSelectedZones: nextSelected });
      sendVentilationCommand(effectiveMode, false, [zone]);
    } else {
      turnOffHeatingIfOn();
      const nextSelected = [...state.ventilationSelectedZones, zone];
      updateState({ ventilationSelectedZones: nextSelected, ventilationOn: true, ventilationMode: effectiveMode });
      sendVentilationCommand(effectiveMode, true, [zone]);
    }
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
      <div className={`transition-opacity duration-300 ${!state.ventilationOn && false ? 'opacity-50 pointer-events-none' : ''}`}>
        {/* Modes */}
        <div className="flex flex-wrap gap-4 mt-2 mb-4">
          {modes.map((mode) => {
            const isActive = state.ventilationMode === mode.id;
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

        {/* Zone selector (only when multiple zones are supported) */}
        {supportedZones.length > 1 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {supportedZones.map((zone) => {
              const isSelected = state.ventilationSelectedZones.includes(zone);
              const isOn = state.ventilationZoneStates[zone]?.on;
              return (
                <button
                  key={zone}
                  onClick={() => handleZoneToggle(zone)}
                  className={`px-3 py-1.5 rounded-full text-[13px] font-medium border transition-colors ${
                    isOn
                      ? 'bg-[#0A5BC4] text-white border-[#0A5BC4]'
                      : isSelected
                      ? 'text-[#0A5BC4] border-[#0A5BC4] bg-blue-50'
                      : 'text-gray-500 border-gray-200 bg-white'
                  }`}
                >
                  {t(zone)}
                </button>
              );
            })}
          </div>
        )}

        {/* Timer Toggle */}
        <div className="pt-6 border-t border-gray-50 mt-4 mb-2">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[15px] font-medium text-gray-900 leading-tight">{t('timer')}</span>
              <span className="text-[12px] font-medium text-gray-500 mt-1">
                {t('setTimerPrefix')}{state.ventilationTimerDuration}{t('setTimerSuffix')}
              </span>
            </div>

            <div className="flex items-center space-x-4">
              {state.ventilationTimerOn && (
                <button
                  type="button"
                  onClick={() => setIsTimerModalOpen(true)}
                  className="text-[14px] font-semibold text-[#0A5BC4]"
                >
                  {Math.floor(state.ventilationTimerRemaining / 60).toString().padStart(2, '0')}:{(state.ventilationTimerRemaining % 60).toString().padStart(2, '0')}
                </button>
              )}
              {/* Toggle Switch */}
              <button
                className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 ease-in-out border ${
                  state.ventilationTimerOn ? 'bg-[#0A5BC4] border-[#0A5BC4]' : 'bg-gray-100 border-gray-200'
                }`}
                onClick={() => {
                  if (state.ventilationTimerOn) {
                    // 关闭倒计时：只发命令，等响应驱动 UI
                    sendTimerCommand('ventilation', 0);
                  } else if (state.ventilationOn) {
                    setIsTimerModalOpen(true);
                  }
                }}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full shadow-[0_1px_2px_rgba(0,0,0,0.1)] transform transition-transform duration-200 ease-in-out ${
                    state.ventilationTimerOn ? 'translate-x-5' : 'translate-x-0'
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
        initialTime={state.ventilationTimerDuration}
        onConfirm={handleTimerConfirm}
      />
    </div>
  );
}
