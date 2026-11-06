import {
  loadPlugins, loadEnabledSet, saveEnabledPlugins,
  loadPluginConfig, savePluginConfig, resolveConfig, missingRequired,
} from './plugins.js';
import type {
  CommandLine, ConfigValues, HookName, HookPayload, PluginCommand, PluginContext, PomodoroPlugin, Settings,
} from './types.js';

export interface PluginEntry {
  plugin: PomodoroPlugin;
  builtin: boolean;
  enabled: boolean;
  /** Saved values merged over field defaults. */
  config: ConfigValues;
  /** Labels of required config fields that are still empty. */
  missing: string[];
  /** Enabled and fully configured — only active plugins receive hooks. */
  active: boolean;
}

export interface RegisteredCommand {
  /** Without the leading slash. */
  name: string;
  description: string;
  pluginName: string;
}

const EXIT_TIMEOUT_MS    = 3000;
const COMMAND_TIMEOUT_MS = 10_000;

/** Slash commands the app itself owns — plugins can't take these names. */
export const RESERVED_COMMANDS = ['start', 'settings', 'plugins', 'exit'];

function isValidCommand(c: unknown): c is PluginCommand {
  if (c === null || typeof c !== 'object') return false;
  const cmd = c as Record<string, unknown>;
  return typeof cmd.name === 'string' && /^[a-z0-9-]+$/.test(cmd.name)
    && typeof cmd.description === 'string'
    && typeof cmd.run === 'function';
}

/**
 * Owns plugin state and lifecycle outside React, so hooks can be emitted from anywhere
 * and onExit can run after the UI has unmounted.
 */
export class PluginHost {
  private entries: PluginEntry[] = [];
  private listeners = new Set<() => void>();

  constructor(private settings: Settings) {}

  async load(): Promise<void> {
    const loaded = await loadPlugins();
    const enabled = loadEnabledSet(loaded.map(l => l.plugin.name));
    this.entries = loaded.map(({ plugin, builtin }) =>
      this.buildEntry(plugin, builtin, enabled.has(plugin.name), loadPluginConfig(plugin.name)));
    this.reportCommandProblems();
    this.notify();
    for (const entry of this.entries) {
      if (entry.active) this.call(entry, 'onInit', {});
    }
  }

  // ── React integration (useSyncExternalStore) ──────────────────────────────

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  getSnapshot = (): readonly PluginEntry[] => this.entries;

  // ── Commands ──────────────────────────────────────────────────────────────

  /** Commands of active plugins; on a name clash the first plugin wins. */
  commands(entries: readonly PluginEntry[] = this.entries): RegisteredCommand[] {
    const taken = new Set(RESERVED_COMMANDS);
    const result: RegisteredCommand[] = [];
    for (const entry of entries) {
      if (!entry.active) continue;
      for (const cmd of entry.plugin.commands ?? []) {
        if (!isValidCommand(cmd) || taken.has(cmd.name)) continue;
        taken.add(cmd.name);
        result.push({ name: cmd.name, description: cmd.description, pluginName: entry.plugin.name });
      }
    }
    return result;
  }

  /** Runs a plugin command; failures and timeouts come back as an error line. */
  async runCommand(name: string): Promise<CommandLine[]> {
    const registered = this.commands().find(c => c.name === name);
    const entry = this.entries.find(e => e.plugin.name === registered?.pluginName);
    const cmd = entry?.plugin.commands?.find(c => c.name === name);
    if (!entry || !cmd) return [{ text: `Unknown command /${name}`, color: 'red' }];

    let timer: NodeJS.Timeout | undefined;
    try {
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`timed out after ${COMMAND_TIMEOUT_MS / 1000}s`)), COMMAND_TIMEOUT_MS);
      });
      const lines = await Promise.race([
        Promise.resolve(cmd.run.call(cmd, { settings: this.settings, config: entry.config })),
        timeout,
      ]);
      return Array.isArray(lines) ? lines : [{ text: `/${name} returned no lines`, color: 'red' }];
    } catch (err) {
      return [{ text: `/${name} failed: ${err instanceof Error ? err.message : String(err)}`, color: 'red' }];
    } finally {
      clearTimeout(timer);
    }
  }

  // ── Events ────────────────────────────────────────────────────────────────

  emit<K extends HookName>(event: K, payload: HookPayload<K>): void {
    for (const entry of this.entries) {
      if (entry.active) this.call(entry, event, payload);
    }
  }

  updateSettings(settings: Settings): void {
    this.settings = settings;
    this.emit('onSettingsChange', {});
  }

  setEnabled(name: string, enabled: boolean): void {
    this.update(name, entry => this.buildEntry(entry.plugin, entry.builtin, enabled, entry.config));
    saveEnabledPlugins(
      new Set(this.entries.filter(e => e.enabled).map(e => e.plugin.name)),
      this.entries.map(e => e.plugin.name),
    );
  }

  saveConfig(name: string, values: Record<string, unknown>): void {
    this.update(name, entry => {
      const next = this.buildEntry(entry.plugin, entry.builtin, entry.enabled, values);
      savePluginConfig(name, next.config);
      return next;
    }, true);
  }

  /** Calls onExit on every active plugin and waits for them, up to a timeout. */
  async exit(): Promise<void> {
    const pending = this.entries.filter(e => e.active).map(e => this.call(e, 'onExit', {}));
    await Promise.race([
      Promise.allSettled(pending),
      new Promise(resolve => setTimeout(resolve, EXIT_TIMEOUT_MS).unref()),
    ]);
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  private buildEntry(plugin: PomodoroPlugin, builtin: boolean, enabled: boolean, saved: Record<string, unknown>): PluginEntry {
    const config  = resolveConfig(plugin.config, saved);
    const missing = missingRequired(plugin.config, config);
    return { plugin, builtin, enabled, config, missing, active: enabled && missing.length === 0 };
  }

  /** Replaces an entry and fires the lifecycle hooks implied by the change. */
  private update(name: string, change: (entry: PluginEntry) => PluginEntry, configChanged = false): void {
    const index = this.entries.findIndex(e => e.plugin.name === name);
    const prev  = this.entries[index];
    if (!prev) return;
    const next = change(prev);
    this.entries = this.entries.map((e, i) => (i === index ? next : e));
    this.notify();

    if (!prev.active && next.active)      this.call(next, 'onInit', {});
    else if (prev.active && !next.active) this.call(prev, 'onExit', {});
    else if (next.active && configChanged) this.call(next, 'onConfigChange', {});
  }

  private call<K extends HookName>(entry: PluginEntry, event: K, payload: HookPayload<K>): Promise<void> {
    const handler = entry.plugin[event] as ((ctx: PluginContext) => unknown) | undefined;
    if (typeof handler !== 'function') return Promise.resolve();
    const ctx = { ...payload, settings: this.settings, config: entry.config };
    const report = (err: unknown) => console.error(`[${entry.plugin.name}] ${event} error: ${err}`);
    try {
      return Promise.resolve(handler.call(entry.plugin, ctx)).then(() => undefined, report);
    } catch (err) {
      report(err);
      return Promise.resolve();
    }
  }

  private reportCommandProblems(): void {
    const taken = new Map(RESERVED_COMMANDS.map(n => [n, 'pomodoro-cli']));
    for (const { plugin } of this.entries) {
      for (const cmd of plugin.commands ?? []) {
        if (!isValidCommand(cmd)) {
          console.error(`[pomodoro-cli] Plugin "${plugin.name}" has an invalid command (needs a lowercase name, description and run()) — ignoring it.`);
        } else if (taken.has(cmd.name)) {
          console.error(`[pomodoro-cli] Plugin "${plugin.name}" command /${cmd.name} clashes with ${taken.get(cmd.name)} — ignoring it.`);
        } else {
          taken.set(cmd.name, `plugin "${plugin.name}"`);
        }
      }
    }
  }

  private notify(): void {
    for (const listener of this.listeners) listener();
  }
}
