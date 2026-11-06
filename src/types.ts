export type PhaseName = 'work' | 'shortBreak' | 'longBreak';

export interface Phase {
  label: string;
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

// ── Plugin API (v1) ─────────────────────────────────────────────────────────

type Awaitable = void | Promise<void>;

interface BaseConfigField {
  key: string;
  label: string;
  hint?: string;
  required?: boolean;
}

export type PluginConfigField =
  | BaseConfigField & { type: 'string';  default?: string }
  | BaseConfigField & { type: 'secret' }  // masked in the UI, stored with owner-only file permissions
  | BaseConfigField & { type: 'number';  default?: number; min?: number; max?: number; step?: number }
  | BaseConfigField & { type: 'boolean'; default?: boolean }
  | BaseConfigField & { type: 'select';  options: readonly string[]; default?: string };

export type ConfigValue  = string | number | boolean;
export type ConfigValues = Record<string, ConfigValue>;

/** Passed to every hook. `config` already has field defaults applied. */
export interface PluginContext {
  settings: Settings;
  config: ConfigValues;
}

/** Passed to timer hooks. `sessions` is the number of completed focus sessions after the event. */
export interface PhaseContext extends PluginContext {
  phase: PhaseName;
  sessions: number;
}

export interface PluginHooks {
  /** Plugin became active: app start, enabled in /plugins, or required config filled in. */
  onInit?(ctx: PluginContext): Awaitable;
  /** Plugin became inactive: app exit or disabled in /plugins. Clean up here. */
  onExit?(ctx: PluginContext): Awaitable;
  onConfigChange?(ctx: PluginContext): Awaitable;
  onSettingsChange?(ctx: PluginContext): Awaitable;

  /** The current phase switched (timer is paused at the start of the new phase). */
  onPhaseChange?(ctx: PhaseContext): Awaitable;
  /** The countdown of a phase started for the first time. */
  onTimerStart?(ctx: PhaseContext): Awaitable;
  onPause?(ctx: PhaseContext): Awaitable;
  onResume?(ctx: PhaseContext): Awaitable;
  onReset?(ctx: PhaseContext): Awaitable;
  /** A phase ran down to 0. */
  onPhaseEnd?(ctx: PhaseContext): Awaitable;
  /** The user skipped the phase. */
  onPhaseSkip?(ctx: PhaseContext): Awaitable;
}

export type HookName = keyof PluginHooks;

/** What the app supplies when emitting a hook — the host adds `settings` and `config`. */
export type HookPayload<K extends HookName> =
  Omit<Parameters<NonNullable<PluginHooks[K]>>[0], keyof PluginContext>;

export interface PomodoroPlugin extends PluginHooks {
  name: string;
  /** Plugin API version the plugin was written for. */
  apiVersion: 1;
  description?: string;
  config?: readonly PluginConfigField[];
}

export type Screen = 'menu' | 'timer' | 'settings' | 'plugins' | 'pluginConfig';
