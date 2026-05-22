import React, { createContext, useContext, useState, ReactNode } from 'react';
import { SofaState } from './types';

interface DeviceContextType {
  state: SofaState;
  language: 'en' | 'zh' | 'es';
  setLanguage: (lang: 'en' | 'zh' | 'es') => void;
  updateState: (updates: Partial<SofaState>) => void;
  sendMotorCommand: (type: string, direction: 'up' | 'down' | 'stop') => void;
  sendPositionCommand: (position: 'home' | 'tv' | 'zg' | 'memory') => void;
}

const initialState: SofaState = {
  massageMode: 'wave',
  massageIntensity: 1,
  massageTimer: 5,
  massageOn: false,
  timerOn: false,
  timerDuration: 5,
  timerRemaining: 0,

  heatingLevel: 1,
  heatingTimer: 5,
  heatingOn: false,
  heatingMode: 'gentle',

  ventilationLevel: 1,
  ventilationTimer: 5,
  ventilationOn: false,
  ventilationMode: 'gentle',

  isPlaying: false,
  vibroState: 0,
  vibroOn: false,
  volume: 50,
  treble: 50,
  bass: 50,
  audioProfile: 'general',

  lightColor: '#0066CC',
  lightMode: 'steady',
  lightOn: false,
};

const DeviceContext = createContext<DeviceContextType | undefined>(undefined);

export function DeviceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SofaState>(initialState);
  const [language, setLanguage] = useState<'en' | 'zh' | 'es'>('en');

  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (state.timerOn && state.timerRemaining > 0) {
      interval = setInterval(() => {
        setState((prev) => {
          if (prev.timerRemaining <= 1) {
            return { ...prev, timerRemaining: 0, timerOn: false };
          }
          return { ...prev, timerRemaining: prev.timerRemaining - 1 };
        });
      }, 1000);
    } else if (state.timerOn && state.timerRemaining <= 0) {
       setState((prev) => ({ ...prev, timerOn: false }));
    }
    return () => clearInterval(interval);
  }, [state.timerOn, state.timerRemaining]);

  const updateState = (updates: Partial<SofaState>) => {
    setState((prev) => ({ ...prev, ...updates }));
    // In real app, dispatch bluetooth commands here based on changes
  };

  const sendMotorCommand = (type: string, direction: 'up' | 'down' | 'stop') => {
    console.log(`Motor Command: ${type} -> ${direction}`);
    // Simulate API call
  };

  const sendPositionCommand = (position: 'home' | 'tv' | 'zg' | 'memory') => {
    console.log(`Position Command: ${position}`);
    // Simulate API call
  };

  return (
    <DeviceContext.Provider value={{ state, language, setLanguage, updateState, sendMotorCommand, sendPositionCommand }}>
      {children}
    </DeviceContext.Provider>
  );
}

export function useDevice() {
  const context = useContext(DeviceContext);
  if (context === undefined) {
    throw new Error('useDevice must be used within a DeviceProvider');
  }
  return context;
}
