import React from 'react';
import { render } from 'ink-testing-library';
import { describe, expect, it, vi } from 'vitest';
import PluginConfig from '../../src/ui/screens/PluginConfig.js';
import type { PomodoroPlugin } from '../../src/types.js';

const tick = () => new Promise(r => setTimeout(r, 20));
const DOWN = '\x1b[B', RIGHT = '\x1b[C', LEFT = '\x1b[D';

const plugin: PomodoroPlugin = {
  name: 'demo',
  apiVersion: 1,
  config: [
    { key: 'name',   label: 'Name',    type: 'string' },
    { key: 'token',  label: 'Token',   type: 'secret', required: true },
    { key: 'volume', label: 'Volume',  type: 'number', default: 5, min: 0, max: 7, step: 2 },
    { key: 'loud',   label: 'Loud',    type: 'boolean', default: false },
    { key: 'mode',   label: 'Mode',    type: 'select', options: ['a', 'b', 'c'], default: 'a' },
  ],
};

function setup(values = {}) {
  const onSave = vi.fn(), onExit = vi.fn();
  const r = render(<PluginConfig plugin={plugin} values={values} onSave={onSave} onExit={onExit} />);
  const press = async (s: string) => { r.stdin.write(s); await tick(); };
  const down = async (n: number) => { for (let i = 0; i < n; i++) await press(DOWN); };
  return { ...r, onSave, onExit, press, down };
}

describe('PluginConfig', () => {
  it('refuses to save while a required secret is empty', async () => {
    const c = setup();
    await tick();
    await c.press('s');
    expect(c.lastFrame()).toContain('Required: Token');
    expect(c.onSave).not.toHaveBeenCalled();
    c.unmount();
  });

  it('masks a secret while typing and afterwards', async () => {
    const c = setup();
    await c.down(1);
    await c.press('\r');
    for (const ch of 'hunter2') await c.press(ch);
    expect(c.lastFrame()).not.toContain('hunter2');
    expect(c.lastFrame()).toContain('•••••••');
    await c.press('\r');
    expect(c.lastFrame()).not.toContain('hunter2');
    expect(c.lastFrame()).toContain('•••••••');
    c.unmount();
  });

  it('adjusts numbers with arrows and clamps to min/max', async () => {
    const c = setup();
    await c.down(2);
    expect(c.lastFrame()).toContain('5');
    await c.press(RIGHT);
    expect(c.lastFrame()).toMatch(/◀ 7 ▶/);
    await c.press(RIGHT);
    expect(c.lastFrame()).toMatch(/◀ 7 ▶/);
    for (let i = 0; i < 5; i++) await c.press(LEFT);
    expect(c.lastFrame()).toMatch(/◀ 0 ▶/);
    c.unmount();
  });

  it('cycles a select and wraps in both directions', async () => {
    const c = setup();
    await c.down(4);
    expect(c.lastFrame()).toMatch(/◀ a ▶/);
    await c.press(RIGHT); await c.press(RIGHT);
    expect(c.lastFrame()).toMatch(/◀ c ▶/);
    await c.press(RIGHT);
    expect(c.lastFrame()).toMatch(/◀ a ▶/);
    await c.press(LEFT);
    expect(c.lastFrame()).toMatch(/◀ c ▶/);
    c.unmount();
  });

  it('toggles a boolean with space', async () => {
    const c = setup();
    await c.down(3);
    expect(c.lastFrame()).toContain('[ ]');
    await c.press(' ');
    expect(c.lastFrame()).toContain('[x]');
    await c.press(' ');
    expect(c.lastFrame()).toContain('[ ]');
    c.unmount();
  });

  it('saves the full typed config', async () => {
    const c = setup();
    await c.press('\r');
    for (const ch of 'Bob') await c.press(ch);
    await c.press('\r');
    await c.down(1);
    await c.press('\r');
    for (const ch of 'sekret') await c.press(ch);
    await c.press('\r');
    await c.down(1);
    await c.press(RIGHT);
    await c.down(1);
    await c.press(' ');
    await c.down(1);
    await c.press(RIGHT);
    await c.press('s');
    expect(c.onSave).toHaveBeenCalledTimes(1);
    expect(c.onSave).toHaveBeenCalledWith({ name: 'Bob', token: 'sekret', volume: 7, loud: true, mode: 'b' });
    c.unmount();
  });

  it('q calls onExit without saving', async () => {
    const c = setup();
    await c.press('q');
    expect(c.onExit).toHaveBeenCalledTimes(1);
    expect(c.onSave).not.toHaveBeenCalled();
    c.unmount();
  });
});
