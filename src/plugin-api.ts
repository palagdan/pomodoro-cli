// Public entry point for plugin authors: `import { definePlugin } from '<package>/plugin'`.
export type {
  PomodoroPlugin,
  PluginHooks,
  PluginContext,
  PhaseContext,
  PhaseInfo,
  PluginCommand,
  CommandLine,
  PluginConfigField,
  ConfigValue,
  ConfigValues,
  PhaseName,
  Settings,
} from './types.js';

import type { PomodoroPlugin } from './types.js';

export const PLUGIN_API_VERSION = 1;

/** Identity helper that gives editors full type information for a plugin definition. */
export function definePlugin<T extends PomodoroPlugin>(plugin: T): T {
  return plugin;
}
