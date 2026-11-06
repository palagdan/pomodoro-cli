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

export interface PluginConfigField {
  key: string;
  label: string;
  type: 'string' | 'number' | 'boolean';
  required?: boolean;
  default?: string | number | boolean;
  hint?: string;
  min?: number;
  max?: number;
  step?: number;
}

export interface PomodoroPlugin {
  name: string;
  description?: string;
  builtin?: true;
  config?: PluginConfigField[];
  configure?: (values: Record<string, unknown>) => void;
  onInit?: (settings: Settings) => void | Promise<void>;
  onPhaseStart?: (phase: PhaseName, settings: Settings) => void | Promise<void>;
  onPhaseEnd?: (phase: PhaseName, sessions: number, settings: Settings) => void | Promise<void>;
  onPhaseSkip?: (phase: PhaseName) => void | Promise<void>;
  onSettingsChange?: (settings: Settings) => void | Promise<void>;
}

export type Screen = 'menu' | 'timer' | 'settings' | 'plugins' | 'pluginConfig';
