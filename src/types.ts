export interface Device {
  id: string;
  name: string;
  model: string;
  connected: boolean;
}

export type MotorType = 'seat' | 'head' | 'lumbar' | 'foot' | 'back';

export interface MotorState {
  type: MotorType;
  position: number; // For UI display purposes if needed, though they say standard motors don't have feedback
}

export interface SofaState {
  // Massage (b group: wave, catwalk, butterfly, acupressure, pat)
  massageMode: string; 
  massageIntensity: number; 
  massageTimer: number; 
  massageOn: boolean;
  timerOn: boolean;
  timerDuration: number;
  timerRemaining: number;

  // Heating
  heatingLevel: number; 
  heatingTimer: number;
  heatingOn: boolean;
  heatingMode: string; // gentle (gentle), rapid (rapid)

  // Ventilation
  ventilationLevel: number; 
  ventilationTimer: number;
  ventilationOn: boolean;
  ventilationMode: string;

  // Audio & Vibro
  isPlaying: boolean;
  vibroState: number; // 0, 1, 2, 3
  vibroOn: boolean;
  volume: number;
  treble: number;
  bass: number;
  audioProfile: string;

  // Light
  lightColor: string; 
  lightMode: string; 
  lightOn: boolean;
}
