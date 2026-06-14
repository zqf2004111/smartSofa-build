import React, { useState } from 'react';
import { useDevice } from '../../context';
import { TimerModal } from '../../components/TimerModal';
import { pushDebug } from '../../debug/debugLog';
import { useTranslation } from '../../i18n';
import type { HeatingZoneKey } from '../../bluetooth/parser';
import { HEATING_ZONE_ORDER } from '../../bluetooth/parser';

export function HeatingTab() {
  const { state, updateState, language, sendHeatingCommand, sendVentilationCommand, sendTimerCommand, deviceConfig } = useDevice();
  const t = useTranslation(language);
  const [isTimerModalOpen, setIsTimerModalOpen] = useState(false);

  const supportedZones = React.useMemo<HeatingZoneKey[]>(() => {
    const cfg = deviceConfig?.heating;
    if (!cfg) return [];
    return HEATING_ZONE_ORDER.filter((z) => cfg[z]);
  }, [deviceConfig?.heating]);

  const handleTimerConfirm = (val: number) => {
    if (val <= 0) {
      // 关闭倒计时：只发命令，等响应驱动 UI
      sendTimerCommand('heating', 0);
    } else {
      updateState({ heatingTimerOn: true, heatingTimerDuration: val, heatingTimerRemaining: val * 60, heatingTimerStartAt: Date.now() });
      sendTimerCommand('heating', val);
    }
    setIsTimerModalOpen(false);
  };

  const modes = [
    { id: 'gentle', label: t('gentle'), icon: '/heating-icon/gentle.svg', iconSelected: '/heating-icon/gentle-selected.svg' },
    { id: 'rapid', label: t('rapid'), icon: '/heating-icon/rapid.svg', iconSelected: '/heating-icon/rapid-selected.svg' },
  ];

  const turnOffVentilationIfOn = () => {
    if (state.ventilationOn) {
      sendVentilationCommand(state.ventilationMode, false);
    }
    if (state.ventilationTimerOn) {
      // 只发命令，等响应驱动
      sendTimerCommand('ventilation', 0);
    }
  };

  const handleModeClick = (modeId: string) => {
    pushDebug('HEAT-CLICK', `mode=${modeId} stMode=${state.heatingMode} stOn=${state.heatingOn} sel=[${state.heatingSelectedZones.join(',')}] sup=[${supportedZones.join(',')}]`);
    if (state.heatingMode === modeId && state.heatingOn) {
      pushDebug('HEAT-CLICK', 'branch=OFF');
      // 关闭命令只发送，不乐观更新 UI；等设备状态报告驱动关闭
      sendHeatingCommand(modeId, false);
    } else {
      pushDebug('HEAT-CLICK', 'branch=ON');
      turnOffVentilationIfOn();
      const targetZones = state.heatingSelectedZones.length > 0 ? state.heatingSelectedZones : supportedZones;
      updateState({ heatingMode: modeId, heatingOn: true, heatingSelectedZones: targetZones });
      sendHeatingCommand(modeId, true, targetZones);
    }
  };

  const handleZoneToggle = (zone: HeatingZoneKey) => {
    const isSelected = state.heatingSelectedZones.includes(zone);
    const effectiveMode = state.heatingMode || 'gentle';
    if (isSelected) {
      const nextSelected = state.heatingSelectedZones.filter((z) => z !== zone);
      updateState({ heatingSelectedZones: nextSelected });
      sendHeatingCommand(effectiveMode, false, [zone]);
    } else {
      turnOffVentilationIfOn();
      const nextSelected = [...state.heatingSelectedZones, zone];
      updateState({ heatingSelectedZones: nextSelected, heatingOn: true, heatingMode: effectiveMode });
      sendHeatingCommand(effectiveMode, true, [zone]);
    }
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
      {/* Modes */}
      <div className="flex flex-wrap gap-4 mt-2 mb-4">
        {modes.map((mode) => {
          const isActive = state.heatingMode === mode.id && state.heatingOn;
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
            const isSelected = state.heatingSelectedZones.includes(zone);
            const isOn = state.heatingZoneStates[zone]?.on;
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
              {t('setTimerPrefix')}{state.heatingTimerDuration}{t('setTimerSuffix')}
            </span>
          </div>

          <div className="flex items-center space-x-4">
            {state.heatingTimerOn && (
              <button
                type="button"
                onClick={() => setIsTimerModalOpen(true)}
                className="text-[14px] font-semibold text-[#0A5BC4]"
              >
                {Math.floor(state.heatingTimerRemaining / 60).toString().padStart(2, '0')}:{(state.heatingTimerRemaining % 60).toString().padStart(2, '0')}
              </button>
            )}
            {/* Toggle Switch */}
            <button
              className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 ease-in-out border ${
                state.heatingTimerOn ? 'bg-[#0A5BC4] border-[#0A5BC4]' : 'bg-gray-100 border-gray-200'
              }`}
              onClick={() => {
                if (state.heatingTimerOn) {
                  // 关闭倒计时：只发命令，等响应驱动 UI
                  sendTimerCommand('heating', 0);
                } else if (state.heatingOn) {
                  setIsTimerModalOpen(true);
                }
              }}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full shadow-[0_1px_2px_rgba(0,0,0,0.1)] transform transition-transform duration-200 ease-in-out ${
                  state.heatingTimerOn ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      <TimerModal
        isOpen={isTimerModalOpen}
        onClose={() => setIsTimerModalOpen(false)}
        initialTime={state.heatingTimerDuration}
        onConfirm={handleTimerConfirm}
      />
    </div>
  );
}
