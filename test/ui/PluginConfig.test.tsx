import React from 'react';
import { render } from 'ink-testing-library';
import { describe, expect, it, vi } from 'vitest';
import PluginConfig from '../../src/ui/screens/PluginConfig.js';
import type { PomodoroPlugin } from '../../src/types.js';
import { tick } from '../helpers/ui.js';

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
  // Let effects (input handlers) re-subscribe after the previous render before sending the next key
  const press = async (s: string) => { await tick(); r.stdin.write(s); await tick(); };
  const see = (m: string | RegExp) => vi.waitFor(() => {
    if (typeof m === 'string') expect(r.lastFrame()).toContain(m);
    else expect(r.lastFrame()).toMatch(m);
  });
  // Moves the cursor down one field at a time, waiting for the highlight to land on each
  let row = 0;
  const down = async (n: number) => {
    for (let i = 0; i < n; i++) {
      await press(DOWN);
      row++;
      await see(`▶ ${plugin.config![row]!.label}`);
    }
  };
  // Types text into the active edit field, waiting for each character to render
  const type = async (text: string, mask = false) => {
    let typed = '';
    for (const ch of text) {
      typed += ch;
      await press(ch);
      await see(mask ? '•'.repeat(typed.length) : typed);
    }
  };
  return { ...r, onSave, onExit, press, down, see, type };
}

describe('PluginConfig', () => {
  it('refuses to save while a required secret is empty', async () => {
    const c = setup();
    await tick();
    await c.press('s');
    await c.see('Required: Token');
    expect(c.onSave).not.toHaveBeenCalled();
    c.unmount();
  });

  it('masks a secret while typing and afterwards', async () => {
    const c = setup();
    await c.down(1);
    await c.press('\r');
    await c.see('❯');
    await c.type('hunter2', true);
    expect(c.lastFrame()).not.toContain('hunter2');
    await c.press('\r');
    // The edit prompt disappears once the field is committed
    await vi.waitFor(() => expect(c.lastFrame()).not.toContain('❯'));
    expect(c.lastFrame()).not.toContain('hunter2');
    expect(c.lastFrame()).toContain('•••••••');
    c.unmount();
  });

  it('adjusts numbers with arrows and clamps to min/max', async () => {
    const c = setup();
    await c.down(2);
    await c.see(/◀ 5 ▶/);
    await c.press(RIGHT);
    await c.see(/◀ 7 ▶/);
    // Clamped at max: the value can't change, so give the UI a chance to (wrongly) move
    await c.press(RIGHT);
    await tick();
    await c.see(/◀ 7 ▶/);
    for (const v of [5, 3, 1, 0]) {
      await c.press(LEFT);
      await c.see(new RegExp(`◀ ${v} ▶`));
    }
    await c.press(LEFT);
    await tick();
    await c.see(/◀ 0 ▶/);
    c.unmount();
  });

  it('cycles a select and wraps in both directions', async () => {
    const c = setup();
    await c.down(4);
    await c.see(/◀ a ▶/);
    await c.press(RIGHT);
    await c.see(/◀ b ▶/);
    await c.press(RIGHT);
    await c.see(/◀ c ▶/);
    await c.press(RIGHT);
    await c.see(/◀ a ▶/);
    await c.press(LEFT);
    await c.see(/◀ c ▶/);
    c.unmount();
  });

  it('toggles a boolean with space', async () => {
    const c = setup();
    await c.down(3);
    await c.see('[ ]');
    await c.press(' ');
    await c.see('[x]');
    await c.press(' ');
    await c.see('[ ]');
    c.unmount();
  });

  it('saves the full typed config', async () => {
    const c = setup();
    await c.press('\r');
    await c.see('❯');
    await c.type('Bob');
    await c.press('\r');
    await vi.waitFor(() => expect(c.lastFrame()).not.toContain('❯'));
    await c.down(1);
    await c.press('\r');
    await c.see('❯');
    await c.type('sekret', true);
    await c.press('\r');
    await vi.waitFor(() => expect(c.lastFrame()).not.toContain('❯'));
    await c.down(1);
    await c.press(RIGHT);
    await c.see(/◀ 7 ▶/);
    await c.down(1);
    await c.press(' ');
    await c.see('[x]');
    await c.down(1);
    await c.press(RIGHT);
    await c.see(/◀ b ▶/);
    await c.press('s');
    await vi.waitFor(() => expect(c.onSave).toHaveBeenCalledTimes(1));
    expect(c.onSave).toHaveBeenCalledWith({ name: 'Bob', token: 'sekret', volume: 7, loud: true, mode: 'b' });
    c.unmount();
  });

  it('q calls onExit without saving', async () => {
    const c = setup();
    await c.press('q');
    await vi.waitFor(() => expect(c.onExit).toHaveBeenCalledTimes(1));
    await tick(); await tick();
    expect(c.onExit).toHaveBeenCalledTimes(1);
    expect(c.onSave).not.toHaveBeenCalled();
    c.unmount();
  });
});
