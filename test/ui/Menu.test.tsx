import React from 'react';
import { render } from 'ink-testing-library';
import { describe, expect, it, vi } from 'vitest';
import Menu from '../../src/ui/screens/Menu.js';
import { DEFAULT_SETTINGS } from '../../src/constants.js';
import { tick } from '../helpers/ui.js';


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
  // Let effects (input handlers) re-subscribe after the previous render before sending the next key
  const press = async (s: string) => { await tick(); r.stdin.write(s); await tick(); };
  const frame = () => r.lastFrame() ?? '';
  const see = (text: string) => vi.waitFor(() => expect(frame()).toContain(text));
  return { ...r, props, press, see };
}

describe('Menu', () => {
  it('shows no palette until "/" is typed, then lists commands in order', async () => {
    const m = setup();
    await tick();
    expect(m.lastFrame()).not.toContain('tab complete');
    await m.press('/');
    await m.see('tab complete');
    await vi.waitFor(() => {
      const f = m.lastFrame()!;
      // Descriptions are unique to the palette (the dashboard also lists some /names)
      const order = ['Start the Pomodoro timer', 'Configure timer durations', 'Manage plugins', 'Show history', 'Show stats', 'Exit the app'].map(c => f.indexOf(c));
      expect(order.every(i => i >= 0)).toBe(true);
      expect([...order].sort((a, b) => a - b)).toEqual(order);
    });
    m.unmount();
  });

  it('filters by prefix', async () => {
    const m = setup();
    await m.press('/');
    await m.see('tab complete');
    await m.press('s');
    // The unfiltered palette listed these, so their absence proves the new frame rendered
    await vi.waitFor(() => {
      const f = m.lastFrame()!;
      expect(f).toContain('Start the Pomodoro timer');
      expect(f).toContain('Configure timer durations');
      expect(f).toContain('Show stats');
      expect(f).not.toContain('Manage plugins');
      expect(f).not.toContain('Exit the app');
    });
    await m.press('t');
    await vi.waitFor(() => {
      expect(m.lastFrame()).toContain('Start the Pomodoro timer');
      expect(m.lastFrame()).not.toContain('Configure timer durations');
    });
    m.unmount();
  });

  it('shows a message when nothing matches', async () => {
    const m = setup();
    await m.press('/');
    await m.see('tab complete');
    await m.press('z');
    await m.see('No matching commands');
    m.unmount();
  });

  it('Enter runs the first match exactly once', async () => {
    const m = setup();
    await m.press('/');
    await m.see('tab complete');
    await m.press('\r');
    await vi.waitFor(() => expect(m.props.onStart).toHaveBeenCalledTimes(1));
    await tick(); await tick();
    expect(m.props.onStart).toHaveBeenCalledTimes(1);
    m.unmount();
  });

  it('arrows move the highlight and Enter runs that command exactly once', async () => {
    const m = setup();
    await m.press('/');
    await m.see('tab complete');
    await m.press('\x1b[B');
    await m.see('▶ /settings');
    await m.press('\r');
    await vi.waitFor(() => expect(m.props.onSettings).toHaveBeenCalledTimes(1));
    await tick(); await tick();
    expect(m.props.onSettings).toHaveBeenCalledTimes(1);
    expect(m.props.onStart).not.toHaveBeenCalled();

    await m.press('\x1b[B');
    await m.see('▶ /plugins');
    await m.press('\x1b[A');
    await m.see('▶ /settings');
    await m.press('\r');
    await vi.waitFor(() => expect(m.props.onSettings).toHaveBeenCalledTimes(2));
    await tick(); await tick();
    expect(m.props.onSettings).toHaveBeenCalledTimes(2);
    m.unmount();
  });

  it('Tab completes the highlighted command', async () => {
    const m = setup();
    await m.press('/');
    await m.see('tab complete');
    await m.press('\x1b[B');
    await m.see('▶ /settings');
    await m.press('\x1b[B');
    await m.see('▶ /plugins');
    await m.press('\t');
    await m.see('❯ /plugins');
    await m.press('\r');
    await vi.waitFor(() => expect(m.props.onPlugins).toHaveBeenCalledTimes(1));
    await tick(); await tick();
    expect(m.props.onPlugins).toHaveBeenCalledTimes(1);
    m.unmount();
  });

  it('Tab on a typed prefix completes to the full name', async () => {
    const m = setup();
    await m.press('/');
    await m.see('tab complete');
    await m.press('h');
    await m.see('❯ /h');
    await m.press('\t');
    await m.see('❯ /history');
    await m.press('\r');
    await vi.waitFor(() => expect(m.props.onPluginCommand).toHaveBeenCalledWith('history'));
    m.unmount();
  });

  it('plugin commands call onPluginCommand with the bare name', async () => {
    const m = setup();
    await m.press('/');
    await m.see('tab complete');
    let typed = '/';
    for (const ch of 'stats') {
      typed += ch;
      await m.press(ch);
      await m.see(`❯ ${typed}`);
    }
    await m.press('\r');
    await vi.waitFor(() => expect(m.props.onPluginCommand).toHaveBeenCalledWith('stats'));
    await tick(); await tick();
    expect(m.props.onPluginCommand).toHaveBeenCalledTimes(1);
    m.unmount();
  });
});
