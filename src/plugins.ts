import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import type { PomodoroPlugin } from './types.js';

const CONFIG_DIR   = path.join(os.homedir(), '.pomodoro-cli');
const PLUGINS_DIR  = path.join(CONFIG_DIR, 'plugins');
const ENABLED_FILE = path.join(CONFIG_DIR, 'plugins-enabled.json');

// Resolve the repo-bundled plugins/ directory relative to this source file
const BUILTIN_PLUGINS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'plugins');

async function importPlugin(filePath: string, builtin: boolean): Promise<PomodoroPlugin | null> {
  try {
    const mod = await import(filePath) as { default?: unknown };
    const exported = mod.default;

    let plugin: PomodoroPlugin;
    if (typeof exported === 'function') {
      // Class export — instantiate it
      plugin = new (exported as new () => PomodoroPlugin)();
    } else if (exported !== null && typeof exported === 'object') {
      // Pre-instantiated object export
      plugin = exported as PomodoroPlugin;
    } else {
      process.stderr.write(`[pomodoro-cli] Plugin "${path.basename(filePath)}" must have a default export (class or object) — skipping.\n`);
      return null;
    }

    if (typeof plugin.name !== 'string') {
      process.stderr.write(`[pomodoro-cli] Plugin "${path.basename(filePath)}" must have a string "name" property — skipping.\n`);
      return null;
    }

    if (builtin) Object.assign(plugin, { builtin: true });
    return plugin;
  } catch (err) {
    process.stderr.write(`[pomodoro-cli] Failed to load plugin "${path.basename(filePath)}": ${err}\n`);
    return null;
  }
}

async function loadFromDir(dir: string, pattern: RegExp, builtin: boolean): Promise<PomodoroPlugin[]> {
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter(f => pattern.test(f));
  const results: PomodoroPlugin[] = [];
  for (const file of files) {
    const plugin = await importPlugin(path.join(dir, file), builtin);
    if (plugin) results.push(plugin);
  }
  return results;
}

export async function loadPlugins(): Promise<PomodoroPlugin[]> {
  // Load built-ins first, then user plugins — user plugins with the same name override built-ins
  const builtins  = await loadFromDir(BUILTIN_PLUGINS_DIR, /\.(ts|js|mjs)$/, true);
  const userPlugins = await loadFromDir(PLUGINS_DIR,         /\.(js|mjs)$/,    false);

  const map = new Map<string, PomodoroPlugin>(builtins.map(p => [p.name, p]));
  for (const p of userPlugins) map.set(p.name, p); // user overrides built-in by name

  return [...map.values()];
}

export function loadEnabledSet(plugins: PomodoroPlugin[]): Set<string> {
  try {
    const raw = fs.readFileSync(ENABLED_FILE, 'utf8');
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    // No file yet — all discovered plugins are enabled by default
    return new Set(plugins.map(p => p.name));
  }
}

export function saveEnabledPlugins(enabled: Set<string>): void {
  try {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
    fs.writeFileSync(ENABLED_FILE, JSON.stringify([...enabled], null, 2), 'utf8');
  } catch {
    // Silently ignore write failures (permissions, read-only fs, etc.)
  }
}

export function loadPluginConfig(name: string): Record<string, unknown> {
  const configPath = path.join(PLUGINS_DIR, `${name}.json`);
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf8')) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function savePluginConfig(name: string, values: Record<string, unknown>): void {
  try {
    fs.mkdirSync(PLUGINS_DIR, { recursive: true });
    fs.writeFileSync(
      path.join(PLUGINS_DIR, `${name}.json`),
      JSON.stringify(values, null, 2),
      'utf8',
    );
  } catch {
    // Silently ignore write failures
  }
}
