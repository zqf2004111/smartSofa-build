/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { DeviceProvider, useDevice } from './context';
import { pushDebug } from './debug/debugLog';
import { BottomNav } from './components/BottomNav';
import { HomeView } from './views/Home';
import { MediaView } from './views/Media';
import { YouView } from './views/You';
import { AddDeviceModal } from './components/AddDeviceModal';
import { DeviceSwitchModal } from './components/DeviceSwitchModal';
import { DeviceSelectionView } from './views/DeviceSelection';
import { ConnectionBanner } from './components/ConnectionBanner';

function AppContent() {
  try { pushDebug('VOL', 'AppContent enter'); } catch {}
  const [currentScreen, setCurrentScreen] = useState<'main' | 'devices'>('devices');
  const [currentTab, setCurrentTab] = useState('home');
  const [isAddDeviceModalOpen, setIsAddDeviceModalOpen] = useState(false);
  const [isManaging, setIsManaging] = useState(false);
  const [isDeviceSwitchModalOpen, setIsDeviceSwitchModalOpen] = useState(false);
  const [currentDeviceId, setCurrentDeviceId] = useState<string | null>(null);
  const { savedDevices, pairTarget, clearPairTarget } = useDevice();
  try { pushDebug('VOL', 'AppContent after useDevice'); } catch {}

  // NFC App Link auto-pair: open AddDeviceModal whenever pairTarget is set
  useEffect(() => {
    if (pairTarget) {
      setIsAddDeviceModalOpen(true);
    }
  }, [pairTarget]);

  const currentDevice = savedDevices.find(d => d.id === currentDeviceId) || savedDevices[0];
  const deviceName = currentDevice?.name || 'Recliner Plus';

  return (
    <>
      {currentScreen === 'devices' ? (
        <div className="w-full max-w-md mx-auto h-[100dvh] bg-gray-50 flex flex-col relative shadow-xl overflow-hidden">
          <ConnectionBanner />
          <DeviceSelectionView 
            onSelectDevice={() => setCurrentScreen('main')} 
            onAddDevice={() => setIsAddDeviceModalOpen(true)}
            isManaging={isManaging}
            onManagingChange={setIsManaging}
          />
          <AddDeviceModal 
            isOpen={isAddDeviceModalOpen} 
            onClose={() => { setIsAddDeviceModalOpen(false); clearPairTarget(); }}
            onDeviceAdded={() => setIsManaging(false)}
            autoPairName={pairTarget}
          />
        </div>
      ) : (
        <div className="w-full max-w-md mx-auto h-[100dvh] bg-gray-50 flex flex-col relative shadow-xl overflow-hidden">
        
        <ConnectionBanner />
        {/* Top Header */}
        <div className={`px-5 pt-8 pb-4 bg-white flex-shrink-0 z-40 flex items-center justify-between ${currentTab === 'media' ? '' : 'border-b border-gray-100/50 shadow-[0_4px_12px_rgba(0,0,0,0.02)]'}`}>
          <div 
            className="flex items-center space-x-1 cursor-pointer"
            onClick={() => setIsDeviceSwitchModalOpen(true)}
          >
            <span className="text-base font-medium text-gray-900">{deviceName}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-900">
              <path d="m6 9 6 6 6-6"/>
            </svg>
          </div>
          <button 
            className="flex items-center justify-center hover:opacity-70 transition-opacity" 
            aria-label="Add device"
            onClick={() => setIsAddDeviceModalOpen(true)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 5V19M5 12H19" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto scroll-smooth">
          {currentTab === 'home' && <HomeView onBackToDevices={() => setCurrentScreen('devices')} selectedDeviceName={deviceName} />}
          {currentTab === 'media' && <MediaView />}
          {currentTab === 'you' && <YouView />}
        </main>

        <BottomNav currentTab={currentTab} onTabChange={setCurrentTab} />

        <AddDeviceModal 
          isOpen={isAddDeviceModalOpen} 
          onClose={() => { setIsAddDeviceModalOpen(false); clearPairTarget(); }}
          onDeviceAdded={() => setIsManaging(false)}
          autoPairName={pairTarget}
        />
        <DeviceSwitchModal
          isOpen={isDeviceSwitchModalOpen}
          onClose={() => setIsDeviceSwitchModalOpen(false)}
          onSelectDevice={(id) => { setCurrentDeviceId(id); setIsDeviceSwitchModalOpen(false); }}
        />
      </div>
      )}
    </>
  );
}

export default function App() {
  return (
    <DeviceProvider>
      <AppContent />
    </DeviceProvider>
  );
}
