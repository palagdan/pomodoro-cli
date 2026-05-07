export type PhaseName = 'work' | 'shortBreak' | 'longBreak';

export interface Phase {
  label: string;
  duration: number;
  color: string;
}

export interface Settings {
  workMin: number;
  shortBreakMin: number;
  longBreakMin: number;
  longBreakEvery: number;
}

export interface Command {
  name: string;
  description: string;
  action: () => void;
}
