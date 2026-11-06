import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath, pathToFileURL } from 'url';
import { PLUGIN_API_VERSION } from './plugin-api.js';
import type { ConfigValue, ConfigValues, PluginConfigField, PomodoroPlugin } from './types.js';

const CONFIG_DIR    = path.join(os.homedir(), '.pomodoro-cli');
export const PLUGINS_DIR = path.join(CONFIG_DIR, 'plugins');
const ENABLED_FILE  = path.join(CONFIG_DIR, 'plugins-enabled.json'); // legacy
const DISABLED_FILE = path.join(CONFIG_DIR, 'plugins-disabled.json');

// Resolve the repo-bundled plugins/ directory relative to this source file
const BUILTIN_PLUGINS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'plugins');

// .ts is only present when running from source via tsx; .d.ts files from the build are not plugins
const BUILTIN_PATTERN = /^(?!.*\.d\.ts$).*\.(ts|js|mjs)$/;
const USER_PATTERN    = /\.(js|mjs)$/;

export interface LoadedPlugin {
  plugin: PomodoroPlugin;
  builtin: boolean;
}

function fail(file: string, reason: string): null {
  console.error(`[pomodoro-cli] Plugin "${file}" ${reason} — skipping.`);
  return null;
}

async function importPlugin(filePath: string): Promise<PomodoroPlugin | null> {
  const file = path.basename(filePath);
  try {
    const mod = await import(pathToFileURL(filePath).href) as { default?: unknown };
    const exported = mod.default;

    let plugin: PomodoroPlugin;
    if (typeof exported === 'function') {
      plugin = new (exported as new () => PomodoroPlugin)();
    } else if (exported !== null && typeof exported === 'object') {
      plugin = exported as PomodoroPlugin;
    } else {
      return fail(file, 'must have a default export (class or object)');
    }

    if (typeof plugin.name !== 'string') return fail(file, 'must have a string "name" property');
    if (!/^[A-Za-z0-9._-]+$/.test(plugin.name) || plugin.name.includes('..')) {
      return fail(file, `has an invalid name "${plugin.name}"`);
    }
    if (plugin.apiVersion === undefined) {
      return fail(file, `has no "apiVersion" (this version of pomodoro-cli expects apiVersion: ${PLUGIN_API_VERSION})`);
    }
    if (plugin.apiVersion !== PLUGIN_API_VERSION) {
      return fail(file, `targets plugin API v${String(plugin.apiVersion)}, but this version of pomodoro-cli supports v${PLUGIN_API_VERSION}`);
    }
    if (plugin.config !== undefined && !Array.isArray(plugin.config)) {
      return fail(file, 'has a "config" property that is not an array');
    }
    return plugin;
  } catch (err) {
    console.error(`[pomodoro-cli] Failed to load plugin "${file}": ${err}`);
    return null;
  }
}

async function loadFromDir(dir: string, pattern: RegExp): Promise<PomodoroPlugin[]> {
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter(f => pattern.test(f)).sort();
  const results: PomodoroPlugin[] = [];
  for (const file of files) {
    const plugin = await importPlugin(path.join(dir, file));
    if (plugin) results.push(plugin);
  }
  return results;
}

export async function loadPlugins(): Promise<LoadedPlugin[]> {
  // Load built-ins first, then user plugins — user plugins with the same name override built-ins
  const builtins    = await loadFromDir(BUILTIN_PLUGINS_DIR, BUILTIN_PATTERN);
  const userPlugins = await loadFromDir(PLUGINS_DIR, USER_PATTERN);

  const map = new Map<string, LoadedPlugin>(builtins.map(p => [p.name, { plugin: p, builtin: true }]));
  for (const p of userPlugins) map.set(p.name, { plugin: p, builtin: false });

  return [...map.values()];
}

// ── Enabled state ───────────────────────────────────────────────────────────

export function loadEnabledSet(names: string[]): Set<string> {
  try {
    const disabled = new Set(JSON.parse(fs.readFileSync(DISABLED_FILE, 'utf8')) as string[]);
    return new Set(names.filter(n => !disabled.has(n)));
  } catch {
    // fall through to legacy handling
  }
  try {
    // Legacy: plugins-enabled.json listed enabled plugins; anything not in it is disabled
    const legacy = new Set(JSON.parse(fs.readFileSync(ENABLED_FILE, 'utf8')) as string[]);
    return new Set(names.filter(n => legacy.has(n)));
  } catch {
    // No files — all discovered plugins are enabled by default
    return new Set(names);
  }
}

export function saveEnabledPlugins(enabled: Set<string>, names: string[]): void {
  try {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
    const disabled = names.filter(n => !enabled.has(n));
    fs.writeFileSync(DISABLED_FILE, JSON.stringify(disabled, null, 2), 'utf8');
  } catch {
    // Silently ignore write failures (permissions, read-only fs, etc.)
  }
}

// ── Config ──────────────────────────────────────────────────────────────────

function fallbackValue(field: PluginConfigField): ConfigValue {
  switch (field.type) {
    case 'number':  return field.default ?? field.min ?? 0;
    case 'boolean': return field.default ?? false;
    case 'select':  return field.default ?? field.options[0] ?? '';
    case 'secret':  return '';
    case 'string':  return field.default ?? '';
  }
}

function isValidValue(field: PluginConfigField, value: unknown): value is ConfigValue {
  switch (field.type) {
    case 'number':  return typeof value === 'number' && Number.isFinite(value);
    case 'boolean': return typeof value === 'boolean';
    case 'select':  return typeof value === 'string' && field.options.includes(value);
    case 'secret':
    case 'string':  return typeof value === 'string';
  }
}

/** Saved values merged over field defaults; unknown keys and wrongly typed values are dropped. */
export function resolveConfig(fields: readonly PluginConfigField[] = [], saved: Record<string, unknown> = {}): ConfigValues {
  const config: ConfigValues = {};
  for (const field of fields) {
    const value = saved[field.key];
    config[field.key] = isValidValue(field, value) ? value : fallbackValue(field);
  }
  return config;
}

/** Labels of required fields that have no usable value. */
export function missingRequired(fields: readonly PluginConfigField[] = [], config: ConfigValues): string[] {
  return fields
    .filter(f => f.required)
    .filter(f => {
      const v = config[f.key];
      if (f.type === 'string' || f.type === 'secret') return typeof v !== 'string' || v.trim() === '';
      return !isValidValue(f, v);
    })
    .map(f => f.label);
}

export function loadPluginConfig(name: string): Record<string, unknown> {
  try {
    return JSON.parse(fs.readFileSync(path.join(PLUGINS_DIR, `${name}.json`), 'utf8')) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function savePluginConfig(name: string, values: ConfigValues): void {
  const file = path.join(PLUGINS_DIR, `${name}.json`);
  try {
    fs.mkdirSync(PLUGINS_DIR, { recursive: true });
    // Owner-only: config may contain secrets such as API tokens
    fs.writeFileSync(file, JSON.stringify(values, null, 2), { encoding: 'utf8', mode: 0o600 });
    fs.chmodSync(file, 0o600);
  } catch {
    // Silently ignore write failures
  }
}
