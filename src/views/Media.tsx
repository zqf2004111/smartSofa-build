import React, { useState, useRef, useEffect } from 'react';
import { useDevice } from '../context';
import { Bluetooth, Play, Pause, SkipBack, SkipForward, Repeat, RadioReceiver, Music, Wind, Power, Sun, RefreshCw } from 'lucide-react';
import { BluetoothModal } from '../components/BluetoothModal';
import { MarqueeText } from '../components/MarqueeText';
import { useTranslation } from '../i18n';

const SteadyIcon = ({ size, className, strokeWidth }: any) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 3 A 9 9 0 0 0 12 21 Z" fill="currentColor" stroke="none" />
  </svg>
);

const RhythmicIcon = ({ size, className, strokeWidth }: any) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" className={className}>
    <path d="M9 10v4" />
    <path d="M12 6v12" />
    <path d="M15 10v4" />
  </svg>
);


export function MediaView() {
  const [activeTab, setActiveTab] = useState<'audio'|'light'>('audio');
  const { state, updateState, language, sendVibroCommand, sendAudioCommand, sendLightCommand, mediaState, sendMediaCommand, openNotificationSettings } = useDevice();
  const t = useTranslation(language);
  const [angle, setAngle] = useState(210); // Matches initial blue color
  const wheelRef = useRef<HTMLDivElement>(null);
  const isDraggingColor = useRef(false);
  const [isBluetoothModalOpen, setIsBluetoothModalOpen] = useState(false);
  const totalSeconds = mediaState.duration > 0 ? mediaState.duration : 0;
  const progress = totalSeconds > 0 ? (mediaState.position / totalSeconds) * 100 : 0;

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Initialize angle from lightColor if possible, or just default to 45
  useEffect(() => {
    // Basic sync from state.lightColor to angle could be added here if needed,
    // but for simplicity we rely on local angle state directly controlling state.
  }, []);

  const handleVibroClick = () => {
    const next = state.vibroState === 3 ? 0 : state.vibroState + 1;
    updateState({ vibroState: next });
    sendVibroCommand(next > 0 ? 'music' : '', next);
  };

  const updateAngle = (clientX: number, clientY: number) => {
    if (!wheelRef.current) return;
    const rect = wheelRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const dx = clientX - centerX;
    const dy = clientY - centerY;
    
    let rad = Math.atan2(dy, dx);
    let deg = (rad * 180) / Math.PI;
    
    let cssAngle = deg + 90;
    if (cssAngle < 0) cssAngle += 360;
    if (cssAngle >= 360) cssAngle -= 360;
    
    setAngle(cssAngle);
    // HSL mapping: 0=Red, 120=Green, 240=Blue matching standard conic-gradient
    updateState({ lightColor: `hsl(${Math.round(cssAngle)}, 100%, 50%)` });
  };

  const onWheelPointerDown = (e: React.PointerEvent) => {
    isDraggingColor.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    updateAngle(e.clientX, e.clientY);
  };

  const onWheelPointerMove = (e: React.PointerEvent) => {
    if (!isDraggingColor.current) return;
    updateAngle(e.clientX, e.clientY);
  };

  const onWheelPointerUp = (e: React.PointerEvent) => {
    if (!isDraggingColor.current) return;
    isDraggingColor.current = false;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] animate-in fade-in duration-300 pb-24">
      
      {/* Top Tabs */}
      <div className="bg-white pb-4 pt-1 shadow-sm flex justify-center space-x-10 w-full mb-6 z-10 sticky top-0">
         <button onClick={() => setActiveTab('audio')} className={`py-1 px-8 rounded-full text-[15px] transition-all ${activeTab === 'audio' ? 'bg-[#0A5BC4] text-white font-medium' : 'text-gray-800 text-[16px] font-normal'}`}>{t('audio')}</button>
         <button onClick={() => setActiveTab('light')} className={`py-1 px-8 rounded-full text-[15px] transition-all ${activeTab === 'light' ? 'bg-[#0A5BC4] text-white font-medium' : 'text-gray-800 text-[16px] font-normal'}`}>{t('light')}</button>
      </div>

      {activeTab === 'audio' && (
        <div className="px-6 space-y-6 animate-in slide-in-from-right-4 duration-300">
          
          {/* Player Card */}
          <div className="bg-white rounded-[28px] p-6 shadow-sm border border-gray-100 flex flex-col relative h-[360px]">
             {/* Bluetooth */}
             <button 
               onClick={() => setIsBluetoothModalOpen(true)}
               className="absolute top-3 right-3 w-[33px] h-[33px] flex items-center justify-center"
             >
               <img src="/bluetooth-btn.svg" alt="Bluetooth" className="w-full h-full" />
             </button>
             
             {/* Track Info */}
             <div className="text-center mt-3 mb-8 px-2">
               {mediaState.a2dpConnected ? (
                 <>
                   <MarqueeText className="text-[20px] font-medium text-gray-900 tracking-tight" speed={50}>
                     {mediaState.title || mediaState.deviceName || t('unknownTitle')}
                   </MarqueeText>
                   <MarqueeText className="text-[13px] text-gray-500 mt-1" speed={35}>
                     {[
                       mediaState.artist,
                       mediaState.album,
                     ]
                       .filter(Boolean)
                       .join(' • ') || (mediaState.title ? '' : t('connectMusicBluetooth'))}
                   </MarqueeText>
                   {!mediaState.notificationEnabled && (
                     <button
                       onClick={openNotificationSettings}
                       className="mt-2 text-[12px] text-[#0A5BC4] underline"
                     >
                       Enable notification access to see song info
                     </button>
                   )}
                 </>
               ) : (
                 <>
                   <h2 className="text-[20px] font-medium text-gray-400 tracking-tight">{t('bluetoothNotConnected')}</h2>
                   <p className="text-[13px] text-gray-400 mt-1">{t('connectMusicBluetooth')}</p>
                 </>
               )}
             </div>

             {/* Progress */}
             <div className="mb-10 px-1">
                <div className="h-10 w-full flex items-center">
                   <div className="h-[5px] w-full bg-[#E5E7EB] rounded-full relative flex items-center">
                      <div className="h-full bg-[#0A5BC4] rounded-full" style={{ width: `${progress}%` }}></div>
                      <div className="w-5 h-5 bg-white border-2 border-[#0A5BC4] rounded-full absolute shadow-sm" style={{ left: `${progress}%`, transform: 'translateX(-50%)' }}></div>
                   </div>
                </div>
                <div className="flex justify-between mt-1 text-[11px] font-semibold text-[#6B7280]">
                  <span>{formatTime(mediaState.position)}</span>
                  <span>{formatTime(totalSeconds)}</span>
                </div>
             </div>

             {/* Controls */}
             <div className="flex justify-center items-center mb-10 w-full px-2 relative">
                <div className="flex items-center space-x-11">
                  <button 
                    onClick={() => { if (mediaState.a2dpConnected) sendMediaCommand('previous'); }}
                    className={`transition-opacity ${mediaState.a2dpConnected ? 'text-gray-900 hover:opacity-70' : 'text-gray-300 cursor-not-allowed'}`}
                  ><SkipBack size={24} fill="currentColor" /></button>
                  <button 
                    onClick={() => {
                      if (mediaState.a2dpConnected) {
                        sendMediaCommand('playPause');
                        updateState({ isPlaying: !state.isPlaying });
                      }
                    }}
                    className={`w-[60px] h-[60px] flex-shrink-0 rounded-full flex items-center justify-center shadow-[0_4px_12px_rgba(10,91,196,0.25)] hover:scale-105 transition-transform ${mediaState.a2dpConnected ? 'bg-[#0A5BC4] text-white' : 'bg-gray-300 text-white cursor-not-allowed'}`}
                  >
                    {mediaState.isPlaying ? <Pause size={28} fill="currentColor" className="fill-current" /> : <Play size={28} fill="currentColor" className="fill-current ml-1" />}
                  </button>
                  <button 
                    onClick={() => { if (mediaState.a2dpConnected) sendMediaCommand('next'); }}
                    className={`transition-opacity ${mediaState.a2dpConnected ? 'text-gray-900 hover:opacity-70' : 'text-gray-300 cursor-not-allowed'}`}
                  ><SkipForward size={24} fill="currentColor" /></button>
                </div>
                <button 
                  onClick={() => updateState({ loopMode: state.loopMode === 'all' ? 'single' : 'all' })}
                  className="absolute right-2 w-5 h-5 flex items-center justify-center"
                >
                  <img 
                    src={state.loopMode === 'all' ? '/loop-playback.svg' : '/single-repeat.svg'} 
                    alt="Loop" 
                    className="w-4 h-4 object-contain"
                  />
                </button>
             </div>

             {/* Sync Sensing */}
             <div className="flex items-center justify-between mt-auto">
               <button onClick={handleVibroClick} className="flex items-center space-x-3 text-left">
                  <img 
                    src={state.vibroState > 0 ? '/music-vibrate-active.svg' : '/music-vibrate-normal.svg'} 
                    alt="Sync" 
                    className="w-[38px] h-[38px] object-contain -mt-[8px]"
                  />
                  <span className={`text-[13px] font-medium transition-colors ${state.vibroState > 0 ? 'text-gray-900' : 'text-gray-500'}`}>{t('syncSensing')}</span>
               </button>
               <button 
                 onClick={handleVibroClick}
                 className="flex items-center space-x-2 p-2"
               >
                 {[1, 2, 3].map((dot) => (
                   <div 
                     key={dot} 
                     className={`w-5 h-1.5 rounded-full transition-colors ${state.vibroState >= dot ? 'bg-[#0A5BC4]' : 'bg-[#E5E7EB]'}`} 
                   />
                 ))}
               </button>
             </div>
          </div>

          {/* Audio Profile */}
          <div className="bg-white rounded-[28px] p-6 shadow-sm border border-gray-100">
            <div className="flex items-center space-x-2.5 mb-7">
              {/* Custom Audio Lines SVG */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0A5BC4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 10v4" /><path d="M6 6v12" /><path d="M10 3v18" /><path d="M14 8v8" /><path d="M18 5v14" /><path d="M22 10v4" />
              </svg>
              <h3 className="text-[16px] font-medium text-gray-900 tracking-tight">{t('audioProfile')}</h3>
            </div>
            
            <div className="space-y-7 mb-8">
              {[
                { id: 'volume', label: t('volume'), value: state.volume },
                { id: 'treble', label: t('treble'), value: state.treble },
                { id: 'bass', label: t('bass'), value: state.bass }
              ].map((slider) => (
                <div key={slider.id} className="relative">
                   <div className="flex justify-between mb-2.5">
                     <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">{slider.label}</span>
                     <span className="text-[12px] font-bold text-[#0A5BC4]">{slider.value}%</span>
                   </div>
                   {/* Custom Slider Track */}
                   <div className="h-[9px] w-full bg-[#E5E7EB] rounded-full overflow-hidden relative">
                     <div className="h-full bg-[#0A5BC4] rounded-full absolute left-0 top-0 transition-all duration-300" style={{ width: `${slider.value}%` }}></div>
                     <input 
                       type="range" 
                       min="0" max="100" 
                       value={slider.value}
                       onChange={(e) => {
                         const val = parseInt(e.target.value);
                         updateState({ [slider.id]: val });
                         sendAudioCommand(state.audioProfile, slider.id === 'volume' ? val : state.volume, slider.id === 'treble' ? val : state.treble, slider.id === 'bass' ? val : state.bass);
                       }}
                       className="absolute top-1/2 -translate-y-1/2 left-0 w-full h-5 accent-[#0A5BC4] cursor-pointer" 
                     />
                   </div>
                </div>
              ))}
            </div>

            {/* EQ Modes */}
            <div className="grid grid-cols-2 gap-3">
               {[
                 { id: 'general', key: 'general' }, 
                 { id: 'classic', key: 'classic' }, 
                 { id: 'pop', key: 'pop' }, 
                 { id: 'jazz', key: 'jazz' }, 
                 { id: 'rock', key: 'rock' }
               ].map((eq) => (
                 <button 
                   key={eq.id}
                   onClick={() => {
                     updateState({ audioProfile: eq.id });
                     sendAudioCommand(eq.id, state.volume, state.treble, state.bass);
                   }}
                   className={`w-full py-3.5 rounded-[12px] text-[14px] font-medium transition-colors ${
                     state.audioProfile === eq.id 
                       ? 'bg-[#0A5BC4] text-white shadow-md' 
                       : 'bg-[#F4F6F9] text-gray-600 hover:bg-gray-200'
                   }`}
                 >
                   {t(eq.key as any)}
                 </button>
               ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'light' && (
        <div className="px-5 space-y-6 animate-in slide-in-from-right-4 duration-300">
          <div className="bg-white rounded-[28px] shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-gray-100/80 w-full pb-8">
            
            {/* Color Wheel Area */}
            <div className="py-10 flex justify-center items-center">
              <div 
                ref={wheelRef}
                onPointerDown={onWheelPointerDown}
                onPointerMove={onWheelPointerMove}
                onPointerUp={onWheelPointerUp}
                onPointerCancel={onWheelPointerUp}
                className="w-56 h-56 rounded-full relative flex items-center justify-center shadow-sm cursor-pointer touch-none"
                style={{
                  background: 'conic-gradient(from 0deg at 50% 50%, hsl(0, 100%, 50%), hsl(60, 100%, 50%), hsl(120, 100%, 50%), hsl(180, 100%, 50%), hsl(240, 100%, 50%), hsl(300, 100%, 50%), hsl(360, 100%, 50%))'
                }}
              >
                {/* Inner White Circle to make it a ring */}
                <div className="w-[140px] h-[140px] bg-white rounded-full flex items-center justify-center shadow-[inset_0_2px_8px_rgba(0,0,0,0.03)] relative z-10 pointer-events-none">
                  <button 
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      const nextOn = !state.lightOn;
                      updateState({ lightOn: nextOn });
                      sendLightCommand(nextOn ? state.lightMode : 'off');
                    }}
                    className={`transition-colors pointer-events-auto ${state.lightOn ? 'text-[#0A5BC4]' : 'text-gray-300'}`}
                  >
                    <Power size={34} strokeWidth={3} />
                  </button>
                </div>

                {/* Color Indicator Handle */}
                <div 
                  className="absolute w-[26px] h-[26px] border-[3.5px] border-white rounded-full shadow-md z-20 pointer-events-none"
                  style={{
                    top: '50%',
                    left: '50%',
                    marginTop: '-13px',
                    marginLeft: '-13px',
                    transform: `rotate(${angle}deg) translateY(-91px)`,
                    backgroundColor: state.lightColor || `hsl(${angle}, 100%, 50%)`,
                  }}
                ></div>
              </div>
            </div>

            {/* Ambient Effects */}
            <div className={`transition-opacity duration-300 ${!state.lightOn ? 'opacity-50 pointer-events-none' : ''}`}>
              {/* Ambient Effects Header */}
              <div className="px-6 mb-6">
                <div className="flex items-center space-x-2 text-gray-900 mb-2.5">
                  <Sun size={20} className="text-[#088380]" strokeWidth={2} />
                  <h3 className="text-[17px] font-medium tracking-tight">{t('lightEffect')}</h3>
                </div>
                <p className="text-[14px] text-gray-500 leading-relaxed font-medium">
                  Synchronize your sofa's lighting with your mood or media playback.
                </p>
              </div>

              {/* Effects Grid */}
              <div className="px-6 grid grid-cols-2 gap-4">
                {[
                  { id: 'steady', label: t('steady'), icon: SteadyIcon },
                  { id: 'cycle', label: t('colorCycle'), icon: RefreshCw },
                  { id: 'rhythmic', label: t('rhythmic'), icon: RhythmicIcon },
                  { id: 'breath', label: t('breath'), icon: Wind },
                ].map((effect) => {
                  const isActive = state.lightMode === effect.id;
                  return (
                    <button
                      key={effect.id}
                      onClick={() => {
                        updateState({ lightMode: effect.id });
                        sendLightCommand(effect.id);
                      }}
                      className={`flex flex-col items-center justify-center py-6 rounded-[20px] transition-all ${
                        isActive 
                          ? 'bg-[#0A5BC4] text-white shadow-md' 
                          : 'bg-[#F4F6F9] text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <div className={`w-[46px] h-[46px] rounded-full flex items-center justify-center mb-3 ${
                        isActive ? 'bg-white/20 text-white' : 'bg-white text-[#0A5BC4] shadow-sm'
                      }`}>
                        <effect.icon size={22} className={isActive ? 'text-white' : 'text-[#0A5BC4]'} strokeWidth={2.5} />
                      </div>
                      <span className={`text-[13px] font-medium tracking-wide ${isActive ? 'text-white' : 'text-gray-800'}`}>{effect.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Bluetooth Modal */}
      <BluetoothModal 
        isOpen={isBluetoothModalOpen} 
        onClose={() => setIsBluetoothModalOpen(false)} 
      />
    </div>
  );
}
