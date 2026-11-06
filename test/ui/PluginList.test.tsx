import React from 'react';
import { render } from 'ink-testing-library';
import { describe, expect, it, vi } from 'vitest';
import PluginList from '../../src/ui/screens/PluginList.js';
import type { PluginEntry } from '../../src/pluginHost.js';

const tick = () => new Promise(r => setTimeout(r, 20));
const DOWN = '\x1b[B';

function entry(name: string, o: Partial<PluginEntry> = {}, withConfig = false): PluginEntry {
  return {
    plugin: {
      name, apiVersion: 1, description: `${name} description`,
      ...(withConfig ? { config: [{ key: 'k', label: 'K', type: 'string' as const }] } : {}),
    },
    builtin: false, enabled: true, config: {}, missing: [], active: true,
    ...o,
  };
}

const entries: PluginEntry[] = [
  entry('alpha', { builtin: true }),
  entry('beta', { enabled: false, active: false }, true),
  entry('gamma', { missing: ['Token'], active: false }, true),
];

function setup(props: { initialName?: string; entries?: PluginEntry[] } = {}) {
  const onToggle = vi.fn(), onConfigure = vi.fn(), onExit = vi.fn();
  const r = render(<PluginList entries={props.entries ?? entries} onToggle={onToggle} onConfigure={onConfigure} onExit={onExit} initialName={props.initialName} />);
  const press = async (s: string) => { r.stdin.write(s); await tick(); };
  return { ...r, onToggle, onConfigure, onExit, press };
}

describe('PluginList', () => {
  it('shows status for each plugin and the built-in tag', async () => {
    const p = setup();
    await tick();
    const lines = p.lastFrame()!.split('\n');
    const row = (n: string) => lines.find(l => l.includes(n.padEnd(16)))!;
    expect(row('alpha')).toContain('active');
    expect(row('alpha')).toContain('built-in');
    expect(row('beta')).toContain('disabled');
    expect(row('beta')).not.toContain('built-in');
    expect(row('gamma')).toContain('needs setup');
    expect(p.lastFrame()).toContain('gamma description');
    p.unmount();
  });

  it('space toggles the entry under the cursor', async () => {
    const p = setup();
    await p.press(' ');
    expect(p.onToggle).toHaveBeenLastCalledWith(entries[0]);
    await p.press(DOWN);
    await p.press(' ');
    expect(p.onToggle).toHaveBeenLastCalledWith(entries[1]);
    expect(p.onToggle).toHaveBeenCalledTimes(2);
    p.unmount();
  });

  it('Enter configures only plugins that have config', async () => {
    const p = setup();
    await p.press('\r');
    expect(p.onConfigure).not.toHaveBeenCalled();
    await p.press(DOWN);
    await p.press('\r');
    expect(p.onConfigure).toHaveBeenCalledTimes(1);
    expect(p.onConfigure).toHaveBeenCalledWith(entries[1]);
    p.unmount();
  });

  it('initialName puts the cursor on that plugin', async () => {
    const p = setup({ initialName: 'gamma' });
    await tick();
    expect(p.lastFrame()).toMatch(/▶ \S+ gamma/);
    await p.press(' ');
    expect(p.onToggle).toHaveBeenCalledWith(entries[2]);
    p.unmount();
  });

  it('an unknown initialName falls back to the first plugin', async () => {
    const p = setup({ initialName: 'nope' });
    await p.press(' ');
    expect(p.onToggle).toHaveBeenCalledWith(entries[0]);
    p.unmount();
  });

  it('q calls onExit; empty list shows a hint', async () => {
    const p = setup({ entries: [] });
    expect(p.lastFrame()).toContain('No plugins loaded');
    await p.press('q');
    expect(p.onExit).toHaveBeenCalledTimes(1);
    p.unmount();
  });
});
