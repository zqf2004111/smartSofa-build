import React, { useState } from 'react';
import { useDevice } from '../context';
import { PostureTab } from './HomeTabs/PostureTab';
import { MassageTab } from './HomeTabs/MassageTab';
import { HeatingTab } from './HomeTabs/HeatingTab';
import { VentilationTab } from './HomeTabs/VentilationTab';
import { ChevronLeft, ChevronRight, LineChart, Thermometer, Wind, Activity, PawPrint, MousePointerClick, Hand } from 'lucide-react';
import { useTranslation } from '../i18n';
import massageSofaImg from '../assets/massage-sofa.png';
import waveSuspendImg from '../assets/suspend-icon/Wave.png';
import catwalkSuspendImg from '../assets/suspend-icon/catwalk.png';
import butterflySuspendImg from '../assets/suspend-icon/butterfly.png';
import acupressureSuspendImg from '../assets/suspend-icon/acupressure.png';
import patSuspendImg from '../assets/suspend-icon/pat.png';
import gentleSofaImg from '../assets/gentle-sofa.png';
import rapidSofaImg from '../assets/rapid-sofa.png';
import gentleVentilationSofaImg from '../assets/ventilation-icon/gentle-sofa.png';
import rapidVentilationSofaImg from '../assets/ventilation-icon/rapid-sofa.png';
import reclinerImg from '../assets/recliner.png';

// Custom Waves icon to match the squiggly lines for massage
const WavesIcon = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
    <path d="M2 17c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
    <path d="M2 7c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
  </svg>
);

export function HomeView({ onBackToDevices }: { onBackToDevices?: () => void }) {
  const { state, language, sendMotorCommand } = useDevice();
  const t = useTranslation(language);
  const [activeTab, setActiveTab] = useState('posture');

  const tabs = [
    { id: 'posture', label: t('position'), Icon: LineChart },
    { id: 'massage', label: t('massage'), Icon: WavesIcon },
    { id: 'heating', label: t('heating'), Icon: Thermometer },
    { id: 'ventilation', label: t('ventilation'), Icon: Wind },
  ];

  const getMassageSuspendIconSrc = () => {
    if (!state.massageOn) return massageSofaImg;
    switch (state.massageMode) {
      case 'wave': return waveSuspendImg;
      case 'catwalk': return catwalkSuspendImg;
      case 'butterfly': return butterflySuspendImg;
      case 'acupressure': return acupressureSuspendImg;
      case 'pat': return patSuspendImg;
      default: return waveSuspendImg;
    }
  };
  const massageSuspendIconSrc = getMassageSuspendIconSrc();

  const getHeatingSuspendIconSrc = () => {
    switch (state.heatingMode) {
      case 'gentle': return gentleSofaImg;
      case 'rapid': return rapidSofaImg;
      default: return gentleSofaImg;
    }
  };
  const heatingSuspendIconSrc = getHeatingSuspendIconSrc();

  const getVentilationSuspendIconSrc = () => {
    switch (state.ventilationMode) {
      case 'gentle': return gentleVentilationSofaImg;
      case 'rapid': return rapidVentilationSofaImg;
      default: return gentleVentilationSofaImg;
    }
  };
  const ventilationSuspendIconSrc = getVentilationSuspendIconSrc();

  return (
    <div className="flex flex-col h-full bg-gray-50 pt-2 relative">
      
      {/* Title */}
      <div className="px-5 pb-4 flex items-center relative">
        <button onClick={onBackToDevices} className="absolute left-4 p-1">
          <ChevronLeft className="w-5 h-5 text-black" strokeWidth={2.5} />
        </button>
        <h1 className="flex-1 text-center text-lg font-medium text-gray-900 tracking-tight">Smart Recliner Pro</h1>
      </div>

      {/* Sofa Graphic */}
      <div className="w-full relative px-5 mb-6 mt-2 h-56 flex items-center justify-center">
        {/* Recliner Image Area */}
        <div className="relative w-full max-w-[280px] mx-auto h-[220px] flex justify-center items-center">
          <img src={reclinerImg} alt="Recliner Chair" className="w-[85%] h-full object-contain mix-blend-multiply opacity-90 ml-[3%]" onError={(e) => {
            // Fallback SVG if image not uploaded yet
            (e.target as HTMLImageElement).style.display = 'none';
            const fallback = document.getElementById('sofa-fallback-svg');
            if (fallback) fallback.style.display = 'block';
          }} />
          
          <svg id="sofa-fallback-svg" width="200" height="200" viewBox="0 0 24 24" fill="none" stroke="#222" strokeWidth="0.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-80 absolute" style={{ display: 'none' }}>
            <path d="M4 11V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v6" />
            <rect width="20" height="6" x="2" y="11" rx="2" />
            <path d="M4 17v2" />
            <path d="M20 17v2" />
          </svg>
          
          {/* Faux control circles typical of the recliner interface */}
          {activeTab === 'posture' && (
            <>
              {/* Top Left (Headrest Down) */}
              <button 
                onPointerDown={() => sendMotorCommand('head', 'down')}
                onPointerUp={() => sendMotorCommand('head', 'stop')}
                onPointerLeave={() => sendMotorCommand('head', 'stop')}
                className="absolute top-[8%] left-[26%] w-[28px] h-[28px] bg-white border border-[#0A5BC4] rounded-full flex items-center justify-center shadow-sm text-black active:scale-95 active:bg-gray-100 transition-all select-none"
              >
                <ChevronLeft size={16} strokeWidth={2.5} />
              </button>
              {/* Center Left (Seat Down) */}
              <button 
                onPointerDown={() => sendMotorCommand('seat', 'down')}
                onPointerUp={() => sendMotorCommand('seat', 'stop')}
                onPointerLeave={() => sendMotorCommand('seat', 'stop')}
                className="absolute top-[38%] left-[2%] w-[28px] h-[28px] bg-white border border-[#0A5BC4] rounded-full flex items-center justify-center shadow-sm text-black active:scale-95 active:bg-gray-100 transition-all select-none"
              >
                <ChevronLeft size={16} strokeWidth={2.5} />
              </button>
              {/* Top Right (Headrest Up) */}
              <button 
                onPointerDown={() => sendMotorCommand('head', 'up')}
                onPointerUp={() => sendMotorCommand('head', 'stop')}
                onPointerLeave={() => sendMotorCommand('head', 'stop')}
                className="absolute top-[28%] right-[4%] w-[28px] h-[28px] bg-[#EEF5FD] border border-[#0A5BC4] rounded-full flex items-center justify-center shadow-sm text-[#0A5BC4] active:scale-95 active:bg-blue-100 transition-all select-none"
              >
                 <ChevronRight size={16} strokeWidth={2.5} />
              </button>
              {/* Bottom Right (Seat Up) */}
              <button 
                onPointerDown={() => sendMotorCommand('seat', 'up')}
                onPointerUp={() => sendMotorCommand('seat', 'stop')}
                onPointerLeave={() => sendMotorCommand('seat', 'stop')}
                className="absolute bottom-[20%] right-[25%] w-[28px] h-[28px] bg-white border border-[#0A5BC4] rounded-full flex items-center justify-center shadow-sm text-black active:scale-95 active:bg-gray-100 transition-all select-none"
              >
                 <ChevronRight size={16} strokeWidth={2.5} />
              </button>
            </>
          )}

          {activeTab === 'massage' && (
            <div className="absolute top-[calc(21%+10px)] left-[calc(51%+20px)] -ml-[16px] w-[32px] h-[32px] flex items-center justify-center">
               <img src={massageSuspendIconSrc} alt="Massage Mode" className="w-[40px] h-[40px] object-contain drop-shadow-sm pointer-events-none mix-blend-multiply" />
            </div>
          )}

          {activeTab === 'heating' && (
            <div className="absolute top-[calc(21%+10px)] left-[calc(51%+20px)] -ml-[16px] w-[32px] h-[32px] flex items-center justify-center">
               <img src={heatingSuspendIconSrc} alt="Heating Mode" className="w-[40px] h-[40px] object-contain drop-shadow-sm pointer-events-none mix-blend-multiply" />
            </div>
          )}

          {activeTab === 'ventilation' && (
            <div className="absolute top-[calc(21%+10px)] left-[calc(51%+20px)] -ml-[16px] w-[32px] h-[32px] flex items-center justify-center">
               <img src={ventilationSuspendIconSrc} alt="Ventilation Mode" className="w-[40px] h-[40px] object-contain drop-shadow-sm pointer-events-none mix-blend-multiply" />
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
      <div className="flex-1 bg-white rounded-t-[32px] pt-8 px-5 pb-8 shadow-[0_-4px_20px_rgba(0,0,0,0.02)] min-h-[400px]">
        {activeTab === 'posture' && <PostureTab />}
        {activeTab === 'massage' && <MassageTab />}
        {activeTab === 'heating' && <HeatingTab />}
        {activeTab === 'ventilation' && <VentilationTab />}
      </div>
    </div>
  );
}
