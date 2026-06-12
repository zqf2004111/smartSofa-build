import React, { useState } from 'react';
import { useDevice } from '../context';
import { PostureTab } from './HomeTabs/PostureTab';
import { MassageTab } from './HomeTabs/MassageTab';
import { HeatingTab } from './HomeTabs/HeatingTab';
import { VentilationTab } from './HomeTabs/VentilationTab';
import { ChevronLeft, ChevronRight, LineChart, Thermometer, Wind, Activity, PawPrint, MousePointerClick, Hand } from 'lucide-react';
import { useTranslation } from '../i18n';
import type { MotorType } from '../types';
import { getMassageSystem, getMassageModes, getMassageModeDef } from '../massageConfig';

const TOTAL_SEAT_FRAMES = 17;
const TOTAL_HEAD_FRAMES = 12;

const SofaAnimation = ({
  motorPositions,
  activeMotorAnim,
}: {
  motorPositions: Partial<Record<MotorType, number>>;
  activeMotorAnim: MotorType | null;
}) => {
  const motorType = activeMotorAnim ?? 'seat';
  const pct = motorPositions[motorType] ?? 0;

  let frameSrc: string;
  if (motorType === 'head') {
    const frameIndex = Math.min(TOTAL_HEAD_FRAMES - 1, Math.max(0, Math.round((pct / 100) * (TOTAL_HEAD_FRAMES - 1))));
    frameSrc = `/head-frames/1-${frameIndex + 1}.svg`;
  } else {
    const frameIndex = Math.min(TOTAL_SEAT_FRAMES - 1, Math.max(0, Math.round((pct / 100) * (TOTAL_SEAT_FRAMES - 1))));
    frameSrc = `/sofa-frames/${frameIndex + 1}.svg`;
  }

  return (
    <div className="relative z-0 w-full max-w-[268px]" style={{ aspectRatio: '268/230' }}>
      <img src={frameSrc} alt="Sofa" className="absolute inset-0 w-full h-full object-contain opacity-90 pointer-events-none select-none" />
    </div>
  );
};

// Custom Waves icon to match the squiggly lines for massage
const WavesIcon = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
    <path d="M2 17c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
    <path d="M2 7c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
  </svg>
);

export function HomeView({ onBackToDevices, selectedDevice, selectedDeviceName }: { onBackToDevices?: () => void; selectedDevice?: { name: string; model: string }; selectedDeviceName?: string }) {
  const { state, deviceConfig, language, sendMotorCommand, simulateMotorPosition, updateState, sendMassageCommand, sendHeatingCommand, sendVentilationCommand } = useDevice();
  const t = useTranslation(language);
  const [activeTab, setActiveTab] = useState('posture');

  const tabs = [
    { id: 'posture', label: t('position'), Icon: LineChart },
    { id: 'massage', label: t('massage'), Icon: WavesIcon },
    { id: 'heating', label: t('heating'), Icon: Thermometer },
    { id: 'ventilation', label: t('ventilation'), Icon: Wind },
  ];



  const massageSystem = getMassageSystem(deviceConfig);
  const massageModes = getMassageModes(massageSystem);
  const currentMassageMode = getMassageModeDef(massageSystem, state.massageMode);
  const massageSuspendIconSrc = currentMassageMode?.suspendIcon ?? '/massage-off.svg';

  // Hide on-sofa motor arrows when the device config says the motor is not present.
  // If we have no config yet, default to showing the controls so the UI doesn't break.
  const hasHeadMotor = !deviceConfig || deviceConfig.motors.some((m) => m.type === 'head');
  const hasSeatMotor = !deviceConfig || deviceConfig.motors.some((m) => m.type === 'seat');

  const getHeatingSuspendIconSrc = () => {
    switch (state.heatingMode) {
      case 'gentle': return '/gentle-sofa.png';
      case 'rapid': return '/rapid-sofa.png';
      default: return '/gentle-sofa.png';
    }
  };
  const heatingSuspendIconSrc = getHeatingSuspendIconSrc();

  const getVentilationSuspendIconSrc = () => {
    switch (state.ventilationMode) {
      case 'gentle': return '/ventilation-icon/gentle.svg';
      case 'rapid': return '/ventilation-icon/rapid.svg';
      default: return '/ventilation-icon/gentle.svg';
    }
  };
  const ventilationSuspendIconSrc = getVentilationSuspendIconSrc();

  return (
    <div className="flex flex-col min-h-full bg-gray-50 pt-2 pb-24 relative">
      
      {/* Title */}
      <div className="px-5 pb-4 flex items-center relative">
        <button onClick={onBackToDevices} className="absolute left-4 p-1">
          <ChevronLeft className="w-5 h-5 text-black" strokeWidth={2.5} />
        </button>
        <h1 className="flex-1 text-center text-lg font-medium text-gray-900 tracking-tight">{selectedDevice?.name || selectedDeviceName || 'Smart Recliner Pro'}</h1>
      </div>

      {/* Sofa Graphic */}
      <div className="w-full relative px-5 mb-6 mt-2 h-56 flex items-center justify-center">
        {/* Recliner Graphic Area */}
        <div className="relative w-full max-w-[280px] mx-auto h-[220px] flex justify-center items-center">
          {activeTab === 'posture' ? (
            <SofaAnimation motorPositions={state.motorPositions} activeMotorAnim={state.activeMotorAnim} />
          ) : (
            <img src="/sofa.svg" alt="Sofa" className="h-[200px] w-auto object-contain opacity-90" />
          )}
          
          {/* Faux control circles typical of the recliner interface */}
          {activeTab === 'posture' && (
            <div className="absolute inset-0 z-10 pointer-events-none">
              {hasHeadMotor && (
                <>
                  {/* Top Left (Headrest) */}
                  <div
                    className="absolute top-[8%] left-[26%] w-[28px] h-[28px] cursor-pointer active:scale-95 transition-transform select-none pointer-events-auto"
                    onPointerDown={() => sendMotorCommand('head', 'up')}
                    onPointerUp={() => sendMotorCommand('head', 'stop')}
                    onPointerLeave={() => sendMotorCommand('head', 'stop')}
                    onContextMenu={(e) => e.preventDefault()}
                  >
                    <img src="/headrest-up.svg" alt="Headrest Up" className="w-[28px] h-[28px] object-contain" />
                  </div>
                  {/* Top Right (Backrest) */}
                  <div
                    className="absolute top-[28%] right-[4%] w-[28px] h-[28px] cursor-pointer active:scale-95 transition-transform select-none pointer-events-auto"
                    onPointerDown={() => sendMotorCommand('head', 'down')}
                    onPointerUp={() => sendMotorCommand('head', 'stop')}
                    onPointerLeave={() => sendMotorCommand('head', 'stop')}
                    onContextMenu={(e) => e.preventDefault()}
                  >
                    <img src="/headrest-down.svg" alt="Headrest Down" className="w-[28px] h-[28px] object-contain" />
                  </div>
                </>
              )}
              {hasSeatMotor && (
                <>
                  {/* Center Left (Seat) */}
                  <div
                    className="absolute top-[38%] left-[2%] w-[28px] h-[28px] cursor-pointer active:scale-95 transition-transform select-none pointer-events-auto"
                    onPointerDown={() => sendMotorCommand('seat', 'up')}
                    onPointerUp={() => sendMotorCommand('seat', 'stop')}
                    onPointerLeave={() => sendMotorCommand('seat', 'stop')}
                    onContextMenu={(e) => e.preventDefault()}
                  >
                    <img src="/seat-up.svg" alt="Seat Up" className="w-[28px] h-[28px] object-contain" />
                  </div>
                  {/* Bottom Right (Legrest) */}
                  <div
                    className="absolute bottom-[20%] right-[25%] w-[28px] h-[28px] cursor-pointer active:scale-95 transition-transform select-none pointer-events-auto"
                    onPointerDown={() => sendMotorCommand('seat', 'down')}
                    onPointerUp={() => sendMotorCommand('seat', 'stop')}
                    onPointerLeave={() => sendMotorCommand('seat', 'stop')}
                    onContextMenu={(e) => e.preventDefault()}
                  >
                    <img src="/seat-down.svg" alt="Seat Down" className="w-[28px] h-[28px] object-contain" />
                  </div>
                </>
              )}
            </div>
          )}



          {activeTab === 'massage' && state.massageMode !== '' && massageModes.length > 0 && (
            <div 
              className="absolute top-[calc(21%+10px)] left-[calc(51%+20px)] -ml-[16px] w-[32px] h-[32px] flex items-center justify-center cursor-pointer"
              onClick={() => {
                const idx = massageModes.findIndex((m) => m.id === state.massageMode);
                const next = massageModes[(idx + 1) % massageModes.length];
                updateState({ massageMode: next.id });
                sendMassageCommand(next.id, state.massageIntensity);
              }}
            >
               <img src={massageSuspendIconSrc} alt="Massage Mode" className="w-[40px] h-[40px] object-contain drop-shadow-sm mix-blend-multiply" />
            </div>
          )}

          {activeTab === 'heating' && state.heatingOn && (
            <div 
              className="absolute top-[calc(21%+10px)] left-[calc(51%+20px)] -ml-[16px] w-[32px] h-[32px] flex items-center justify-center cursor-pointer"
              onClick={() => {
                const modes = ['gentle', 'rapid'];
                const idx = modes.indexOf(state.heatingMode);
                const next = modes[(idx + 1) % modes.length];
                updateState({ heatingMode: next });
                sendHeatingCommand(next, true);
              }}
            >
               <img src={heatingSuspendIconSrc} alt="Heating Mode" className="w-[40px] h-[40px] object-contain drop-shadow-sm mix-blend-multiply" />
            </div>
          )}

          {activeTab === 'ventilation' && state.ventilationOn && (
            <div 
              className="absolute top-[calc(21%+10px)] left-[calc(51%+20px)] -ml-[16px] w-[32px] h-[32px] flex items-center justify-center cursor-pointer"
              onClick={() => {
                const modes = ['gentle', 'rapid'];
                const idx = modes.indexOf(state.ventilationMode);
                const next = modes[(idx + 1) % modes.length];
                updateState({ ventilationMode: next });
                sendVentilationCommand(next, true);
              }}
            >
               <img src={ventilationSuspendIconSrc} alt="Ventilation Mode" className="w-[40px] h-[40px] object-contain drop-shadow-sm mix-blend-multiply" />
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="px-5 grid grid-cols-4 gap-3 mb-6 relative z-10">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center py-4 rounded-2xl transition-all ${
                isActive
                  ? 'bg-[#0A5BC4] text-white shadow-md'
                  : 'bg-white text-gray-500 hover:bg-gray-100'
              }`}
            >
              <tab.Icon size={24} className={`mb-2 ${isActive ? 'text-white' : 'text-gray-500'}`} />
              <span className={`text-[10px] font-medium tracking-wide ${isActive ? 'text-white' : 'text-gray-400'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main White Content Area */}
      <div className="flex-auto bg-white rounded-t-[32px] pt-8 px-5 pb-8 shadow-[0_-4px_20px_rgba(0,0,0,0.02)] min-h-[400px] overflow-y-auto">
        {activeTab === 'posture' && <PostureTab />}
        {activeTab === 'massage' && <MassageTab />}
        {activeTab === 'heating' && <HeatingTab />}
        {activeTab === 'ventilation' && <VentilationTab />}
      </div>
    </div>
  );
}
