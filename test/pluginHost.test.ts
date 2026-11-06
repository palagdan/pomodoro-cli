import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PluginHost, RESERVED_COMMANDS } from '../src/pluginHost.js';
import type { PluginEntry } from '../src/pluginHost.js';
import type { Settings } from '../src/types.js';
import { readConfigFile, resetConfigDir, writeConfigFile, writeUserPlugin } from './helpers/home.js';

interface Call {
  plugin: string;
  hook: string;
  ctx: Record<string, unknown>;
  self: boolean;
}

const settings: Settings = { workMin: 25, shortBreakMin: 5, longBreakMin: 15, longBreakEvery: 4 };
const newSettings: Settings = { workMin: 50, shortBreakMin: 10, longBreakMin: 20, longBreakEvery: 2 };

const HOOKS = [
  'onInit', 'onExit', 'onConfigChange', 'onSettingsChange', 'onPhaseChange',
  'onTimerStart', 'onPause', 'onResume', 'onReset', 'onPhaseEnd', 'onPhaseSkip',
];

const TOKEN_CONFIG = `[
  { key: 'token', label: 'Token', type: 'string', required: true },
  { key: 'mode', label: 'Mode', type: 'select', options: ['a', 'b'], default: 'a' },
]`;

let counter = 0;
const g = globalThis as unknown as { __calls: Call[] };

/** Unique plugin name per test — Node caches ESM by URL, so file names must never repeat. */
function uniqueName(prefix = 'spy'): string {
  counter += 1;
  return `${prefix}-${counter}`;
}

/**
 * Writes a user plugin that records every hook into globalThis.__calls.
 * `props` is extra source for the plugin object literal; it comes after the
 * recording hooks, so it can override them.
 */
function spyPlugin(name: string, props = '', file = `${name}.mjs`): string {
  const hooks = HOOKS.map(h => `${h}(ctx) { record('${h}', ctx, this === plugin); },`).join('\n  ');
  writeUserPlugin(file, `
const record = (hook, ctx, self) => (globalThis.__calls ??= []).push({ plugin: ${JSON.stringify(name)}, hook, ctx, self });
const plugin = {
  name: ${JSON.stringify(name)},
  apiVersion: 1,
  ${hooks}
  ${props}
};
export default plugin;
`);
  return name;
}

function calls(plugin?: string, hook?: string): Call[] {
  return g.__calls.filter(c => (!plugin || c.plugin === plugin) && (!hook || c.hook === hook));
}

function entry(host: PluginHost, name: string): PluginEntry {
  const found = host.getSnapshot().find(e => e.plugin.name === name);
  if (!found) throw new Error(`plugin ${name} not loaded`);
  return found;
}

async function loadHost(): Promise<PluginHost> {
  const host = new PluginHost(settings);
  await host.load();
  return host;
}

beforeEach(() => {
  resetConfigDir();
  g.__calls = [];
  writeConfigFile('plugins-disabled.json', ['sound', 'desktop-notify', 'session-log']);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
});

describe('load', () => {
  it('calls onInit once for each active plugin with settings and defaulted config', async () => {
    const a = spyPlugin(uniqueName(), `config: ${TOKEN_CONFIG}`);
    writeConfigFile(`plugins/${a}.json`, { token: 'abc' });
    const b = spyPlugin(uniqueName());
    await loadHost();

    for (const name of [a, b]) expect(calls(name, 'onInit')).toHaveLength(1);
    expect(calls(a, 'onInit')[0]!.ctx).toEqual({ settings, config: { token: 'abc', mode: 'a' } });
    expect(calls(b, 'onInit')[0]!.ctx).toEqual({ settings, config: {} });
    expect(calls(a, 'onInit')[0]!.self).toBe(true);
  });

  it('does not init disabled plugins or plugins missing required config', async () => {
    const disabled = spyPlugin(uniqueName());
    const missing = spyPlugin(uniqueName(), `config: ${TOKEN_CONFIG}`);
    writeConfigFile('plugins-disabled.json', ['sound', 'desktop-notify', 'session-log', disabled]);
    await loadHost();

    expect(calls(disabled)).toHaveLength(0);
    expect(calls(missing)).toHaveLength(0);
  });

  it('exposes builtin/enabled/config/missing/active in the snapshot', async () => {
    const ok = spyPlugin(uniqueName());
    const off = spyPlugin(uniqueName());
    const missing = spyPlugin(uniqueName(), `config: ${TOKEN_CONFIG}`);
    writeConfigFile('plugins-disabled.json', ['sound', 'desktop-notify', 'session-log', off]);
    const host = await loadHost();

    expect(entry(host, ok)).toMatchObject({ builtin: false, enabled: true, config: {}, missing: [], active: true });
    expect(entry(host, off)).toMatchObject({ builtin: false, enabled: false, active: false });
    expect(entry(host, missing)).toMatchObject({
      builtin: false, enabled: true, config: { token: '', mode: 'a' }, missing: ['Token'], active: false,
    });

    const builtins = host.getSnapshot().filter(e => e.builtin);
    expect(builtins.map(e => e.plugin.name).sort()).toEqual(['desktop-notify', 'session-log', 'sound']);
    expect(builtins.every(e => !e.enabled && !e.active)).toBe(true);
  });

  it('notifies subscribers, and stops after unsubscribe', async () => {
    spyPlugin(uniqueName());
    const host = new PluginHost(settings);
    const listener = vi.fn();
    const unsubscribe = host.subscribe(listener);
    await host.load();
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    await host.load();
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('emit', () => {
  it('delivers events only to active plugins', async () => {
    const active = spyPlugin(uniqueName());
    const off = spyPlugin(uniqueName());
    const missing = spyPlugin(uniqueName(), `config: ${TOKEN_CONFIG}`);
    writeConfigFile('plugins-disabled.json', ['sound', 'desktop-notify', 'session-log', off]);
    const host = await loadHost();

    host.emit('onPause', { phase: 'work', sessions: 0, durationSeconds: 1500, elapsedSeconds: 10 });

    expect(calls(active, 'onPause')).toHaveLength(1);
    expect(calls(off, 'onPause')).toHaveLength(0);
    expect(calls(missing, 'onPause')).toHaveLength(0);
  });

  it('merges payload, settings and config into ctx and binds this to the plugin', async () => {
    const name = spyPlugin(uniqueName(), `config: ${TOKEN_CONFIG}`);
    writeConfigFile(`plugins/${name}.json`, { token: 't', mode: 'b' });
    const host = await loadHost();
    const payload = { phase: 'work', sessions: 2, durationSeconds: 1500, elapsedSeconds: 30 } as const;

    host.emit('onPhaseEnd', payload);

    const [call] = calls(name, 'onPhaseEnd');
    expect(call!.ctx).toEqual({ ...payload, settings, config: { token: 't', mode: 'b' } });
    expect(call!.self).toBe(true);
  });

  it('reports a throwing hook and a rejecting async hook without stopping other plugins', async () => {
    const thrower = spyPlugin(uniqueName(), `onPause() { throw new Error('boom'); }`);
    const rejecter = spyPlugin(uniqueName(), `async onPause() { throw new Error('async boom'); }`);
    const good = spyPlugin(uniqueName());
    const host = await loadHost();

    host.emit('onPause', { phase: 'work', sessions: 0, durationSeconds: 1500, elapsedSeconds: 0 });

    expect(calls(good, 'onPause')).toHaveLength(1);
    await vi.waitFor(() => {
      const messages = vi.mocked(console.error).mock.calls.map(c => String(c[0]));
      expect(messages.some(m => m.includes(`[${thrower}] onPause error`) && m.includes('boom'))).toBe(true);
      expect(messages.some(m => m.includes(`[${rejecter}] onPause error`) && m.includes('async boom'))).toBe(true);
    });
  });
});

describe('setEnabled', () => {
  it('disabling an active plugin calls onExit and persists plugins-disabled.json', async () => {
    const name = spyPlugin(uniqueName());
    const host = await loadHost();

    host.setEnabled(name, false);

    expect(calls(name, 'onExit')).toHaveLength(1);
    expect(entry(host, name)).toMatchObject({ enabled: false, active: false });
    const disabled = JSON.parse(readConfigFile('plugins-disabled.json')) as string[];
    expect(disabled).toContain(name);
    expect(disabled).toEqual(expect.arrayContaining(['sound', 'desktop-notify', 'session-log']));
  });

  it('enabling calls onInit and removes the plugin from plugins-disabled.json', async () => {
    const name = spyPlugin(uniqueName());
    writeConfigFile('plugins-disabled.json', ['sound', 'desktop-notify', 'session-log', name]);
    const host = await loadHost();
    expect(calls(name)).toHaveLength(0);

    host.setEnabled(name, true);

    expect(calls(name, 'onInit')).toHaveLength(1);
    expect(entry(host, name).active).toBe(true);
    expect(JSON.parse(readConfigFile('plugins-disabled.json'))).not.toContain(name);
  });

  it('does not call hooks again when the state does not change', async () => {
    const name = spyPlugin(uniqueName());
    const off = spyPlugin(uniqueName());
    writeConfigFile('plugins-disabled.json', ['sound', 'desktop-notify', 'session-log', off]);
    const host = await loadHost();

    host.setEnabled(name, true);
    host.setEnabled(off, false);

    expect(calls(name)).toHaveLength(1); // the initial onInit only
    expect(calls(off)).toHaveLength(0);
  });

  it('does not call onExit when disabling a plugin that was inactive for missing config', async () => {
    const name = spyPlugin(uniqueName(), `config: ${TOKEN_CONFIG}`);
    const host = await loadHost();

    host.setEnabled(name, false);

    expect(calls(name)).toHaveLength(0);
  });

  it('ignores unknown plugin names', async () => {
    const host = await loadHost();
    const listener = vi.fn();
    host.subscribe(listener);

    host.setEnabled('does-not-exist', true);

    expect(listener).not.toHaveBeenCalled();
  });
});

describe('saveConfig', () => {
  it('activates a plugin once required config is complete and saves <name>.json', async () => {
    const name = spyPlugin(uniqueName(), `config: ${TOKEN_CONFIG}`);
    const host = await loadHost();
    expect(calls(name)).toHaveLength(0);

    host.saveConfig(name, { token: 'secret' });

    expect(calls(name, 'onInit')).toHaveLength(1);
    expect(calls(name, 'onInit')[0]!.ctx.config).toEqual({ token: 'secret', mode: 'a' });
    expect(entry(host, name)).toMatchObject({ active: true, missing: [] });
    expect(JSON.parse(readConfigFile(`plugins/${name}.json`))).toEqual({ token: 'secret', mode: 'a' });
  });

  it('calls onConfigChange with the new config when an active plugin changes config', async () => {
    const name = spyPlugin(uniqueName(), `config: ${TOKEN_CONFIG}`);
    writeConfigFile(`plugins/${name}.json`, { token: 'old' });
    const host = await loadHost();

    host.saveConfig(name, { token: 'new', mode: 'b' });

    const changes = calls(name, 'onConfigChange');
    expect(changes).toHaveLength(1);
    expect(changes[0]!.ctx.config).toEqual({ token: 'new', mode: 'b' });
    expect(calls(name, 'onInit')).toHaveLength(1);
    expect(calls(name, 'onExit')).toHaveLength(0);
  });

  it('deactivates a plugin (onExit) when a required field is cleared', async () => {
    const name = spyPlugin(uniqueName(), `config: ${TOKEN_CONFIG}`);
    writeConfigFile(`plugins/${name}.json`, { token: 'abc' });
    const host = await loadHost();

    host.saveConfig(name, { token: '' });

    expect(calls(name, 'onExit')).toHaveLength(1);
    expect(calls(name, 'onConfigChange')).toHaveLength(0);
    expect(entry(host, name)).toMatchObject({ active: false, missing: ['Token'] });
  });

  it('does not call onConfigChange for a disabled plugin', async () => {
    const name = spyPlugin(uniqueName(), `config: ${TOKEN_CONFIG}`);
    writeConfigFile(`plugins/${name}.json`, { token: 'abc' });
    writeConfigFile('plugins-disabled.json', ['sound', 'desktop-notify', 'session-log', name]);
    const host = await loadHost();

    host.saveConfig(name, { token: 'def' });

    expect(calls(name)).toHaveLength(0);
    expect(JSON.parse(readConfigFile(`plugins/${name}.json`)).token).toBe('def');
  });
});

describe('updateSettings', () => {
  it('emits onSettingsChange with the new settings, which later hooks also see', async () => {
    const name = spyPlugin(uniqueName());
    const host = await loadHost();

    host.updateSettings(newSettings);

    const changes = calls(name, 'onSettingsChange');
    expect(changes).toHaveLength(1);
    expect(changes[0]!.ctx.settings).toEqual(newSettings);

    host.emit('onResume', { phase: 'work', sessions: 0, durationSeconds: 3000, elapsedSeconds: 0 });
    expect(calls(name, 'onResume')[0]!.ctx.settings).toEqual(newSettings);
  });
});

describe('exit', () => {
  it('awaits async onExit hooks of active plugins only', async () => {
    const slow = spyPlugin(uniqueName(), `onExit(ctx) {
      return new Promise(resolve => setTimeout(() => { record('onExit', ctx, true); globalThis.__slowDone = true; resolve(); }, 50));
    }`);
    const off = spyPlugin(uniqueName());
    writeConfigFile('plugins-disabled.json', ['sound', 'desktop-notify', 'session-log', off]);
    const host = await loadHost();
    (globalThis as Record<string, unknown>).__slowDone = false;

    await host.exit();

    expect((globalThis as Record<string, unknown>).__slowDone).toBe(true);
    expect(calls(slow, 'onExit')).toHaveLength(1);
    expect(calls(off, 'onExit')).toHaveLength(0);
  });

  it('resolves after about 3s even if a hook never resolves', async () => {
    spyPlugin(uniqueName(), `onExit() { return new Promise(() => {}); }`);
    const host = await loadHost();
    vi.useFakeTimers();

    let done = false;
    const promise = host.exit().then(() => { done = true; });

    await vi.advanceTimersByTimeAsync(2900);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(200);
    await promise;
    expect(done).toBe(true);
  });
});

describe('commands', () => {
  const cmd = (name: string, result = `['${name}']`) =>
    `{ name: '${name}', description: 'does ${name}', run() { return ${result}; } }`;

  it('lists only commands of active plugins', async () => {
    const active = spyPlugin(uniqueName(), `commands: [${cmd('alpha')}]`);
    const off = spyPlugin(uniqueName(), `commands: [${cmd('beta')}]`);
    const missing = spyPlugin(uniqueName(), `config: ${TOKEN_CONFIG}, commands: [${cmd('gamma')}]`);
    writeConfigFile('plugins-disabled.json', ['sound', 'desktop-notify', 'session-log', off]);
    const host = await loadHost();

    expect(host.commands()).toEqual([{ name: 'alpha', description: 'does alpha', pluginName: active }]);
    expect(host.commands().some(c => c.pluginName === missing)).toBe(false);
  });

  it('excludes reserved names and invalid commands, reporting them at load', async () => {
    const name = spyPlugin(uniqueName(), `commands: [
      ${RESERVED_COMMANDS.map(r => cmd(r)).join(',\n')},
      ${cmd('Bad Name')},
      { name: 'norun', description: 'no run function' },
      ${cmd('fine')},
    ]`);
    const host = await loadHost();

    expect(RESERVED_COMMANDS).toEqual(['start', 'settings', 'plugins', 'exit']);
    expect(host.commands().map(c => c.name)).toEqual(['fine']);

    const messages = vi.mocked(console.error).mock.calls.map(c => String(c[0]));
    for (const r of RESERVED_COMMANDS) {
      expect(messages.some(m => m.includes(name) && m.includes(`/${r}`) && m.includes('clashes'))).toBe(true);
    }
    expect(messages.filter(m => m.includes(name) && m.includes('invalid command'))).toHaveLength(2);
  });

  it('lets the first plugin win a name clash and warns about the second', async () => {
    const first = spyPlugin(uniqueName('clash'), `commands: [${cmd('shared', `['from first']`)}]`);
    const second = spyPlugin(uniqueName('clash'), `commands: [${cmd('shared', `['from second']`)}]`);
    const [firstName, secondName] = [first, second].sort();
    const host = await loadHost();

    const shared = host.commands().filter(c => c.name === 'shared');
    expect(shared).toHaveLength(1);
    // plugins load in file-name order, so the alphabetically first name wins
    expect(shared[0]!.pluginName).toBe(firstName);
    expect(await host.runCommand('shared')).toEqual([firstName === first ? 'from first' : 'from second']);

    const messages = vi.mocked(console.error).mock.calls.map(c => String(c[0]));
    expect(messages.some(m => m.includes(secondName!) && m.includes('/shared') && m.includes('clashes'))).toBe(true);
  });
});

describe('runCommand', () => {
  it('returns the lines of the command', async () => {
    spyPlugin(uniqueName(), `commands: [{
      name: 'lines', description: 'd',
      async run(ctx) { return ['plain', { text: 'styled ' + ctx.settings.workMin, bold: true }]; },
    }]`);
    const host = await loadHost();

    expect(await host.runCommand('lines')).toEqual(['plain', { text: 'styled 25', bold: true }]);
  });

  it('returns a red error line for an unknown command', async () => {
    const host = await loadHost();

    expect(await host.runCommand('nope')).toEqual([{ text: 'Unknown command /nope', color: 'red' }]);
  });

  it('does not run commands of inactive plugins', async () => {
    const off = spyPlugin(uniqueName(), `commands: [{ name: 'hidden', description: 'd', run() { return ['x']; } }]`);
    writeConfigFile('plugins-disabled.json', ['sound', 'desktop-notify', 'session-log', off]);
    const host = await loadHost();

    expect(await host.runCommand('hidden')).toEqual([{ text: 'Unknown command /hidden', color: 'red' }]);
  });

  it('returns a red failure line when run throws or rejects', async () => {
    spyPlugin(uniqueName(), `commands: [
      { name: 'sync-fail', description: 'd', run() { throw new Error('kaput'); } },
      { name: 'async-fail', description: 'd', async run() { throw new Error('later'); } },
    ]`);
    const host = await loadHost();

    expect(await host.runCommand('sync-fail')).toEqual([{ text: '/sync-fail failed: kaput', color: 'red' }]);
    expect(await host.runCommand('async-fail')).toEqual([{ text: '/async-fail failed: later', color: 'red' }]);
  });

  it('returns an error line when run does not produce an array', async () => {
    spyPlugin(uniqueName(), `commands: [{ name: 'bad', description: 'd', run() { return 'not an array'; } }]`);
    const host = await loadHost();

    expect(await host.runCommand('bad')).toEqual([{ text: '/bad returned no lines', color: 'red' }]);
  });

  it('passes the active plugin config and settings to run', async () => {
    const name = spyPlugin(uniqueName(), `config: ${TOKEN_CONFIG}, commands: [{
      name: 'cfg', description: 'd', run(ctx) { return [JSON.stringify(ctx)]; },
    }]`);
    writeConfigFile(`plugins/${name}.json`, { token: 'zzz' });
    const host = await loadHost();

    expect(await host.runCommand('cfg')).toEqual([JSON.stringify({ settings, config: { token: 'zzz', mode: 'a' } })]);
  });

  it('returns a timeout line after 10s when run never resolves', async () => {
    spyPlugin(uniqueName(), `commands: [{ name: 'hang', description: 'd', run() { return new Promise(() => {}); } }]`);
    const host = await loadHost();
    vi.useFakeTimers();

    const promise = host.runCommand('hang');
    await vi.advanceTimersByTimeAsync(9900);
    let settled = false;
    void promise.then(() => { settled = true; });
    await vi.advanceTimersByTimeAsync(0);
    expect(settled).toBe(false);

    await vi.advanceTimersByTimeAsync(200);
    expect(await promise).toEqual([{ text: '/hang failed: timed out after 10s', color: 'red' }]);
  });
});
