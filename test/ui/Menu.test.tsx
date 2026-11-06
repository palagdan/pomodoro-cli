import React from 'react';
import { render } from 'ink-testing-library';
import { describe, expect, it, vi } from 'vitest';
import Menu from '../../src/ui/screens/Menu.js';
import { DEFAULT_SETTINGS } from '../../src/constants.js';

const tick = () => new Promise(r => setTimeout(r, 20));

function setup() {
  const props = {
    settings: DEFAULT_SETTINGS,
    onStart: vi.fn(), onSettings: vi.fn(), onPlugins: vi.fn(), onPluginCommand: vi.fn(),
    pluginCommands: [
      { name: 'history', description: 'Show history' },
      { name: 'stats', description: 'Show stats' },
    ],
  };
  const r = render(<Menu {...props} />);
  const press = async (s: string) => { r.stdin.write(s); await tick(); };
  return { ...r, props, press };
}

describe('Menu', () => {
  it('shows no palette until "/" is typed, then lists commands in order', async () => {
    const m = setup();
    await tick();
    expect(m.lastFrame()).not.toContain('tab complete');
    await m.press('/');
    const f = m.lastFrame()!;
    // Descriptions are unique to the palette (the dashboard also lists some /names)
    const order = ['Start the Pomodoro timer', 'Configure timer durations', 'Manage plugins', 'Show history', 'Show stats', 'Exit the app'].map(c => f.indexOf(c));
    expect(order.every(i => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    m.unmount();
  });

  it('filters by prefix', async () => {
    const m = setup();
    await m.press('/');
    await m.press('s');
    const f = m.lastFrame()!;
    expect(f).toContain('Start the Pomodoro timer');
    expect(f).toContain('Configure timer durations');
    expect(f).toContain('Show stats');
    expect(f).not.toContain('Manage plugins');
    expect(f).not.toContain('Exit the app');
    await m.press('t');
    expect(m.lastFrame()).not.toContain('Configure timer durations');
    m.unmount();
  });

  it('shows a message when nothing matches', async () => {
    const m = setup();
    await m.press('/');
    await m.press('z');
    expect(m.lastFrame()).toContain('No matching commands');
    m.unmount();
  });

  it('Enter runs the first match exactly once', async () => {
    const m = setup();
    await m.press('/');
    await m.press('\r');
    expect(m.props.onStart).toHaveBeenCalledTimes(1);
    m.unmount();
  });

  it('arrows move the highlight and Enter runs that command exactly once', async () => {
    const m = setup();
    await m.press('/');
    await m.press('\x1b[B');
    await m.press('\r');
    expect(m.props.onSettings).toHaveBeenCalledTimes(1);
    expect(m.props.onStart).not.toHaveBeenCalled();

    await m.press('\x1b[B');
    await m.press('\x1b[A');
    await m.press('\r');
    expect(m.props.onSettings).toHaveBeenCalledTimes(2);
    m.unmount();
  });

  it('Tab completes the highlighted command', async () => {
    const m = setup();
    await m.press('/');
    await m.press('\x1b[B');
    await m.press('\x1b[B');
    await m.press('\t');
    expect(m.lastFrame()).toContain('/plugins');
    await m.press('\r');
    expect(m.props.onPlugins).toHaveBeenCalledTimes(1);
    m.unmount();
  });

  it('Tab on a typed prefix completes to the full name', async () => {
    const m = setup();
    await m.press('/');
    await m.press('h');
    await m.press('\t');
    await m.press('\r');
    expect(m.props.onPluginCommand).toHaveBeenCalledWith('history');
    m.unmount();
  });

  it('plugin commands call onPluginCommand with the bare name', async () => {
    const m = setup();
    await m.press('/');
    await m.press('s');
    await m.press('t');
    await m.press('a');
    await m.press('t');
    await m.press('s');
    await m.press('\r');
    expect(m.props.onPluginCommand).toHaveBeenCalledTimes(1);
    expect(m.props.onPluginCommand).toHaveBeenCalledWith('stats');
    m.unmount();
  });
});
