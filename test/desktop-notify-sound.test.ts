import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('child_process', () => ({ execFile: vi.fn() }));

import { execFile } from 'child_process';
import sound from '../src/plugins/sound.js';
import desktopNotify from '../src/plugins/desktop-notify.js';
import { resolveConfig } from '../src/plugins.js';
import { DEFAULT_SETTINGS } from '../src/constants.js';
import type { PhaseName } from '../src/types.js';

const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform')!;
function setPlatform(value: string) {
  Object.defineProperty(process, 'platform', { value, configurable: true });
}

function ctx(plugin: object, phase: PhaseName, sessions = 1, overrides: Record<string, unknown> = {}) {
  return {
    settings: DEFAULT_SETTINGS,
    config: resolveConfig((plugin as { config?: readonly any[] }).config, overrides),
    phase,
    sessions,
    durationSeconds: 1500,
    elapsedSeconds: 1500,
  };
}

beforeEach(() => {
  vi.mocked(execFile).mockClear();
});

afterEach(() => {
  Object.defineProperty(process, 'platform', originalPlatform);
});

describe('sound plugin', () => {
  it('plays the configured sound for the new phase on darwin', () => {
    setPlatform('darwin');
    sound.onPhaseChange!(ctx(sound, 'shortBreak', 1, { shortBreakSound: 'Ping' }));
    expect(execFile).toHaveBeenCalledTimes(1);
    expect(vi.mocked(execFile).mock.calls[0].slice(0, 2)).toEqual([
      'afplay', ['/System/Library/Sounds/Ping.aiff'],
    ]);
  });

  it('uses the per-phase defaults', () => {
    setPlatform('darwin');
    for (const [phase, name] of [['work', 'Glass'], ['shortBreak', 'Blow'], ['longBreak', 'Purr']] as const) {
      vi.mocked(execFile).mockClear();
      sound.onPhaseChange!(ctx(sound, phase));
      expect(vi.mocked(execFile).mock.calls[0][1]).toEqual([`/System/Library/Sounds/${name}.aiff`]);
    }
  });

  it.each(['linux', 'win32'])('does nothing on %s', platform => {
    setPlatform(platform);
    sound.onPhaseChange!(ctx(sound, 'work'));
    expect(execFile).not.toHaveBeenCalled();
  });
});

describe('desktop-notify plugin', () => {
  it('sends an osascript notification on darwin with args as an array', () => {
    setPlatform('darwin');
    desktopNotify.onPhaseEnd!(ctx(desktopNotify, 'work', 3));
    const [cmd, args] = vi.mocked(execFile).mock.calls[0] as unknown as [string, string[]];
    expect(cmd).toBe('osascript');
    expect(Array.isArray(args)).toBe(true);
    expect(args[0]).toBe('-e');
    expect(args[1]).toBe(
      'display notification "Time for a break. (3 sessions done)" with title "Focus session complete!"',
    );
  });

  it('uses the singular for one session', () => {
    setPlatform('darwin');
    desktopNotify.onPhaseEnd!(ctx(desktopNotify, 'work', 1));
    const args = vi.mocked(execFile).mock.calls[0][1] as string[];
    expect(args[1]).toContain('(1 session done)');
    expect(args[1]).not.toContain('sessions');
  });

  it('sends notify-send with title and body on linux', () => {
    setPlatform('linux');
    desktopNotify.onPhaseEnd!(ctx(desktopNotify, 'work', 2));
    expect(vi.mocked(execFile).mock.calls[0].slice(0, 2)).toEqual([
      'notify-send', ['Focus session complete!', 'Time for a break. (2 sessions done)'],
    ]);
  });

  it('has no session count for break messages', () => {
    setPlatform('linux');
    desktopNotify.onPhaseEnd!(ctx(desktopNotify, 'shortBreak', 4));
    desktopNotify.onPhaseEnd!(ctx(desktopNotify, 'longBreak', 4));
    const calls = vi.mocked(execFile).mock.calls.map(c => c[1]);
    expect(calls).toEqual([
      ['Short break over!', 'Time to focus.'],
      ['Long break over!', 'Ready to focus?'],
    ]);
  });

  it('does nothing on other platforms', () => {
    setPlatform('win32');
    desktopNotify.onPhaseEnd!(ctx(desktopNotify, 'work', 1));
    expect(execFile).not.toHaveBeenCalled();
  });
});
