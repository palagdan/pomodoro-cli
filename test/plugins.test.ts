import fs from 'fs';
import path from 'path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  loadEnabledSet,
  loadPluginConfig,
  loadPlugins,
  missingRequired,
  resolveConfig,
  saveEnabledPlugins,
  savePluginConfig,
} from '../src/plugins.js';
import type { PluginConfigField } from '../src/types.js';
import { PLUGINS_DIR, readConfigFile, resetConfigDir, writeConfigFile, writeUserPlugin } from './helpers/home.js';

beforeEach(resetConfigDir);

describe('resolveConfig', () => {
  it('returns {} when there are no fields', () => {
    expect(resolveConfig()).toEqual({});
    expect(resolveConfig([], { a: 1 })).toEqual({});
  });

  it('applies defaults per field type', () => {
    const fields: PluginConfigField[] = [
      { key: 's', label: 'S', type: 'string', default: 'hi' },
      { key: 's2', label: 'S2', type: 'string' },
      { key: 'sec', label: 'Sec', type: 'secret' },
      { key: 'n', label: 'N', type: 'number', default: 7 },
      { key: 'nmin', label: 'N', type: 'number', min: 3 },
      { key: 'n0', label: 'N', type: 'number' },
      { key: 'b', label: 'B', type: 'boolean', default: true },
      { key: 'b2', label: 'B', type: 'boolean' },
      { key: 'sel', label: 'Sel', type: 'select', options: ['a', 'b'] },
      { key: 'sel2', label: 'Sel', type: 'select', options: ['a', 'b'], default: 'b' },
    ];
    expect(resolveConfig(fields)).toEqual({
      s: 'hi', s2: '', sec: '', n: 7, nmin: 3, n0: 0, b: true, b2: false, sel: 'a', sel2: 'b',
    });
  });

  it('lets saved values override defaults', () => {
    const fields: PluginConfigField[] = [
      { key: 's', label: 'S', type: 'string', default: 'hi' },
      { key: 'n', label: 'N', type: 'number', default: 7 },
      { key: 'b', label: 'B', type: 'boolean', default: true },
      { key: 'sel', label: 'Sel', type: 'select', options: ['a', 'b'] },
      { key: 'sec', label: 'Sec', type: 'secret' },
    ];
    expect(resolveConfig(fields, { s: 'x', n: 0, b: false, sel: 'b', sec: 'tok' }))
      .toEqual({ s: 'x', n: 0, b: false, sel: 'b', sec: 'tok' });
  });

  it('falls back for wrongly typed values and select values outside options', () => {
    const fields: PluginConfigField[] = [
      { key: 's', label: 'S', type: 'string', default: 'hi' },
      { key: 'n', label: 'N', type: 'number', default: 7 },
      { key: 'nan', label: 'N', type: 'number', default: 8 },
      { key: 'b', label: 'B', type: 'boolean', default: true },
      { key: 'sel', label: 'Sel', type: 'select', options: ['a', 'b'] },
      { key: 'sec', label: 'Sec', type: 'secret' },
    ];
    expect(resolveConfig(fields, { s: 5, n: '9', nan: Infinity, b: 'no', sel: 'c', sec: 1 }))
      .toEqual({ s: 'hi', n: 7, nan: 8, b: true, sel: 'a', sec: '' });
  });

  it('drops unknown keys', () => {
    const fields: PluginConfigField[] = [{ key: 'a', label: 'A', type: 'string' }];
    expect(resolveConfig(fields, { a: 'x', extra: 'y' })).toEqual({ a: 'x' });
  });
});

describe('missingRequired', () => {
  it('reports empty or whitespace string and secret fields by label', () => {
    const fields: PluginConfigField[] = [
      { key: 'a', label: 'Name', type: 'string', required: true },
      { key: 'b', label: 'Token', type: 'secret', required: true },
      { key: 'c', label: 'Ok', type: 'string', required: true },
    ];
    expect(missingRequired(fields, { a: '', b: '   ', c: 'v' })).toEqual(['Name', 'Token']);
  });

  it('reports non-finite numbers and invalid selects', () => {
    const fields: PluginConfigField[] = [
      { key: 'n', label: 'Num', type: 'number', required: true },
      { key: 'n2', label: 'Num2', type: 'number', required: true },
      { key: 's', label: 'Sel', type: 'select', options: ['a'], required: true },
      { key: 's2', label: 'Sel2', type: 'select', options: ['a'], required: true },
    ];
    expect(missingRequired(fields, { n: NaN, n2: 0, s: 'zzz', s2: 'a' })).toEqual(['Num', 'Sel']);
  });

  it('ignores non-required fields and handles no fields', () => {
    const fields: PluginConfigField[] = [{ key: 'a', label: 'A', type: 'string' }];
    expect(missingRequired(fields, { a: '' })).toEqual([]);
    expect(missingRequired(undefined, {})).toEqual([]);
  });
});

describe('loadPlugins', () => {
  const validObject = (name: string, extra = '') =>
    `export default { name: '${name}', apiVersion: 1, hooks: {} ${extra} };`;

  const run = async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    const loaded = await loadPlugins();
    return { loaded, errors };
  };
  const find = (loaded: Awaited<ReturnType<typeof loadPlugins>>, name: string) =>
    loaded.find(l => l.plugin.name === name);

  it('loads built-in plugins with builtin: true', async () => {
    const { loaded, errors } = await run();
    for (const name of ['sound', 'desktop-notify', 'session-log']) {
      expect(find(loaded, name)?.builtin, name).toBe(true);
    }
    expect(errors).not.toHaveBeenCalled();
  });

  it('returns user plugins in file-name order', async () => {
    writeUserPlugin('order-b.mjs', validObject('order-b'));
    writeUserPlugin('order-a.mjs', validObject('order-a'));
    const { loaded } = await run();
    const names = loaded.filter(l => !l.builtin).map(l => l.plugin.name);
    expect(names).toEqual(['order-a', 'order-b']);
  });

  it('loads a user plugin exported as an object', async () => {
    writeUserPlugin('obj.mjs', validObject('user-obj'));
    const { loaded } = await run();
    expect(find(loaded, 'user-obj')).toMatchObject({ builtin: false });
  });

  it('loads a user plugin exported as a class', async () => {
    writeUserPlugin('cls.js', `export default class { name = 'user-cls'; apiVersion = 1; }`);
    const { loaded } = await run();
    expect(find(loaded, 'user-cls')).toMatchObject({ builtin: false });
  });

  it('lets a user plugin replace a built-in of the same name', async () => {
    writeUserPlugin('sound.mjs', validObject('sound', ", description: 'mine'"));
    const { loaded } = await run();
    const matches = loaded.filter(l => l.plugin.name === 'sound');
    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({ builtin: false, plugin: { description: 'mine' } });
  });

  it.each([
    ['no default export', 'no-default.mjs', 'export const x = 1;', 'default export'],
    ['missing name', 'no-name.mjs', 'export default { apiVersion: 1 };', 'name'],
    ['invalid name', 'bad-name.mjs', `export default { name: '../x', apiVersion: 1 };`, 'invalid name'],
    ['missing apiVersion', 'no-api.mjs', `export default { name: 'no-api' };`, 'apiVersion'],
    ['wrong apiVersion', 'v2.mjs', `export default { name: 'v2', apiVersion: 2 };`, 'v2'],
    ['non-array config', 'cfg.mjs', `export default { name: 'cfg', apiVersion: 1, config: {} };`, 'config'],
  ])('skips a plugin with %s', async (_label, file, source, message) => {
    writeUserPlugin(file, source);
    const { loaded, errors } = await run();
    expect(errors).toHaveBeenCalledTimes(1);
    expect(String(errors.mock.calls[0]![0])).toContain(file);
    expect(String(errors.mock.calls[0]![0])).toContain(message);
    expect(loaded.every(l => l.builtin)).toBe(true);
  });

  it('skips a plugin that throws on import', async () => {
    writeUserPlugin('boom.mjs', `throw new Error('kaboom');`);
    const { loaded, errors } = await run();
    expect(errors).toHaveBeenCalledTimes(1);
    expect(String(errors.mock.calls[0]![0])).toContain('boom.mjs');
    expect(String(errors.mock.calls[0]![0])).toContain('kaboom');
    expect(loaded.every(l => l.builtin)).toBe(true);
  });

  it('ignores files that are not .js or .mjs', async () => {
    writeUserPlugin('notes.txt', 'hello');
    writeUserPlugin('plugin.ts', validObject('ts-plugin'));
    writeUserPlugin('data.json', '{}');
    const { loaded, errors } = await run();
    expect(errors).not.toHaveBeenCalled();
    expect(loaded.every(l => l.builtin)).toBe(true);
  });
});

describe('loadEnabledSet / saveEnabledPlugins', () => {
  const names = ['a', 'b', 'c'];

  it('enables everything by default', () => {
    expect(loadEnabledSet(names)).toEqual(new Set(names));
  });

  it('respects the disabled file', () => {
    writeConfigFile('plugins-disabled.json', ['b']);
    expect(loadEnabledSet(names)).toEqual(new Set(['a', 'c']));
  });

  it('respects the legacy enabled file when there is no disabled file', () => {
    writeConfigFile('plugins-enabled.json', ['a']);
    expect(loadEnabledSet(names)).toEqual(new Set(['a']));
  });

  it('prefers the disabled file over the legacy file', () => {
    writeConfigFile('plugins-enabled.json', ['a']);
    writeConfigFile('plugins-disabled.json', []);
    expect(loadEnabledSet(names)).toEqual(new Set(names));
  });

  it('saveEnabledPlugins writes the disabled names and round-trips', () => {
    saveEnabledPlugins(new Set(['a', 'c']), names);
    expect(JSON.parse(readConfigFile('plugins-disabled.json'))).toEqual(['b']);
    expect(loadEnabledSet(names)).toEqual(new Set(['a', 'c']));
  });
});

describe('loadPluginConfig / savePluginConfig', () => {
  it('returns {} when missing or invalid', () => {
    expect(loadPluginConfig('nope')).toEqual({});
    writeConfigFile('plugins/bad.json', '{oops');
    expect(loadPluginConfig('bad')).toEqual({});
  });

  it('round-trips values', () => {
    const values = { token: 'secret', n: 3, on: true };
    savePluginConfig('demo', values);
    expect(loadPluginConfig('demo')).toEqual(values);
  });

  it.skipIf(process.platform === 'win32')('stores the file with owner-only permissions', () => {
    savePluginConfig('demo', { token: 'secret' });
    const file = path.join(PLUGINS_DIR, 'demo.json');
    expect(fs.statSync(file).mode & 0o777).toBe(0o600);
  });

  it.skipIf(process.platform === 'win32')('tightens permissions of an existing file', () => {
    const file = writeConfigFile('plugins/demo.json', '{}');
    fs.chmodSync(file, 0o644);
    savePluginConfig('demo', { token: 'secret' });
    expect(fs.statSync(file).mode & 0o777).toBe(0o600);
  });
});
