import React from 'react';
import { act } from 'react';
import { render } from 'ink-testing-library';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildDurations, useTimer, type Timer, type TimerCallbacks } from '../src/ui/hooks/useTimer.js';
import type { PhaseName, Settings } from '../src/types.js';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const SETTINGS: Settings = { workMin: 1, shortBreakMin: 1, longBreakMin: 1, longBreakEvery: 2 };
// Distinct lengths make it obvious when a phase shows another phase's time
const DISTINCT: Settings = { workMin: 25, shortBreakMin: 5, longBreakMin: 15, longBreakEvery: 2 };

function setup(initial: Settings = SETTINGS) {
  const cb = {
    onPhaseChange: vi.fn(), onTimerStart: vi.fn(), onPause: vi.fn(), onResume: vi.fn(),
    onReset: vi.fn(), onPhaseEnd: vi.fn(), onPhaseSkip: vi.fn(),
  } satisfies Required<TimerCallbacks>;
  const seen: { phase: PhaseName; timeLeft: number }[] = [];
  let current!: Timer;
  let settings = initial;

  function Harness({ s }: { s: Settings }) {
    const t = useTimer(s, cb);
    current = t;
    seen.push({ phase: t.phase, timeLeft: t.timeLeft });
    return null;
  }

  const r = render(<Harness s={settings} />);
  return {
    cb, seen, r,
    get t() { return current; },
    act: async (fn: () => void) => { await act(async () => { fn(); }); },
    tick: async (ms: number) => { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); },
    setSettings: async (s: Settings) => { settings = s; await act(async () => { r.rerender(<Harness s={settings} />); }); },
  };
}

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

describe('useTimer', () => {
  it('starts in work, full time, stopped, 0 sessions', () => {
    const h = setup();
    expect(h.t).toMatchObject({ phase: 'work', timeLeft: 60, running: false, sessions: 0 });
    expect(buildDurations(SETTINGS)).toEqual({ work: 60, shortBreak: 60, longBreak: 60 });
    expect(h.cb.onPhaseChange).not.toHaveBeenCalled();
    h.r.unmount();
  });

  it('toggle fires onTimerStart once, then onPause, then onResume', async () => {
    const h = setup();
    await h.act(() => h.t.toggleRunning());
    expect(h.t.running).toBe(true);
    expect(h.cb.onTimerStart).toHaveBeenCalledTimes(1);
    expect(h.cb.onTimerStart).toHaveBeenCalledWith({ phase: 'work', sessions: 0, durationSeconds: 60, elapsedSeconds: 0 });

    await h.tick(5000);
    await h.act(() => h.t.toggleRunning());
    expect(h.t.running).toBe(false);
    expect(h.cb.onPause).toHaveBeenCalledTimes(1);
    expect(h.cb.onPause.mock.calls[0]![0]).toMatchObject({ phase: 'work', elapsedSeconds: 5 });

    await h.act(() => h.t.toggleRunning());
    expect(h.cb.onResume).toHaveBeenCalledTimes(1);
    expect(h.cb.onTimerStart).toHaveBeenCalledTimes(1);
    h.r.unmount();
  });

  it('counts down while running and not while paused', async () => {
    const h = setup();
    await h.tick(3000);
    expect(h.t.timeLeft).toBe(60);
    await h.act(() => h.t.toggleRunning());
    await h.tick(3000);
    expect(h.t.timeLeft).toBe(57);
    await h.act(() => h.t.toggleRunning());
    await h.tick(3000);
    expect(h.t.timeLeft).toBe(57);
    h.r.unmount();
  });

  it('reaching 0 ends the phase and moves to a stopped short break', async () => {
    const h = setup();
    await h.act(() => h.t.toggleRunning());
    await h.tick(60_000);
    expect(h.cb.onPhaseEnd).toHaveBeenCalledTimes(1);
    expect(h.cb.onPhaseEnd).toHaveBeenCalledWith({ phase: 'work', sessions: 1, durationSeconds: 60, elapsedSeconds: 60 });
    expect(h.cb.onPhaseChange).toHaveBeenCalledTimes(1);
    expect(h.cb.onPhaseChange.mock.calls[0]![0]).toMatchObject({ phase: 'shortBreak', sessions: 1, elapsedSeconds: 0 });
    expect(h.t).toMatchObject({ phase: 'shortBreak', timeLeft: 60, running: false, sessions: 1 });
    h.r.unmount();
  });

  it('uses a long break after longBreakEvery work sessions and returns to work after a break', async () => {
    const h = setup();
    const runPhase = async () => { await h.act(() => h.t.toggleRunning()); await h.tick(60_000); };
    await runPhase();                       // work 1
    expect(h.t.phase).toBe('shortBreak');
    await runPhase();                       // break
    expect(h.t.phase).toBe('work');
    expect(h.cb.onPhaseEnd).toHaveBeenLastCalledWith(expect.objectContaining({ phase: 'shortBreak', sessions: 1 }));
    await runPhase();                       // work 2
    expect(h.t).toMatchObject({ phase: 'longBreak', sessions: 2, timeLeft: 60, running: false });
    h.r.unmount();
  });

  it('skipPhase on work reports the time actually run, counts the session and changes phase', async () => {
    const h = setup();
    await h.act(() => h.t.toggleRunning());
    await h.tick(10_000);
    await h.act(() => h.t.skipPhase());
    expect(h.cb.onPhaseSkip).toHaveBeenCalledTimes(1);
    expect(h.cb.onPhaseSkip).toHaveBeenCalledWith({ phase: 'work', sessions: 1, durationSeconds: 60, elapsedSeconds: 10 });
    expect(h.cb.onPhaseChange).toHaveBeenCalledTimes(1);
    expect(h.t).toMatchObject({ phase: 'shortBreak', timeLeft: 60, running: false, sessions: 1 });
    h.r.unmount();
  });

  it('skipPhase on a break does not add a session', async () => {
    const h = setup();
    await h.act(() => h.t.skipPhase());
    await h.act(() => h.t.skipPhase());
    expect(h.cb.onPhaseSkip).toHaveBeenLastCalledWith(expect.objectContaining({ phase: 'shortBreak', sessions: 1 }));
    expect(h.t).toMatchObject({ phase: 'work', sessions: 1 });
    h.r.unmount();
  });

  it('resetPhase fires onReset with elapsed time, restores time and stops', async () => {
    const h = setup();
    await h.act(() => h.t.toggleRunning());
    await h.tick(7000);
    await h.act(() => h.t.resetPhase());
    expect(h.cb.onReset).toHaveBeenCalledTimes(1);
    expect(h.cb.onReset).toHaveBeenCalledWith({ phase: 'work', sessions: 0, durationSeconds: 60, elapsedSeconds: 7 });
    expect(h.t).toMatchObject({ phase: 'work', timeLeft: 60, running: false });
    // starting again is a fresh start, not a resume
    await h.act(() => h.t.toggleRunning());
    expect(h.cb.onTimerStart).toHaveBeenCalledTimes(2);
    expect(h.cb.onResume).not.toHaveBeenCalled();
    h.r.unmount();
  });

  it('jumpTo another phase changes phase and time in the same render', async () => {
    const h = setup(DISTINCT);
    await h.act(() => h.t.toggleRunning());
    await h.tick(3000);
    await h.act(() => h.t.jumpTo('longBreak'));
    expect(h.t).toMatchObject({ phase: 'longBreak', timeLeft: 15 * 60, running: false });
    expect(h.cb.onPhaseChange).toHaveBeenCalledTimes(1);
    expect(h.cb.onPhaseChange.mock.calls[0]![0]).toMatchObject({ phase: 'longBreak', durationSeconds: 900, elapsedSeconds: 0 });

    const d = buildDurations(DISTINCT);
    // No intermediate frame may pair a phase with another phase's time (the work countdown 1500..1497 is fine for work)
    for (const s of h.seen) {
      if (s.phase === 'longBreak') expect(s.timeLeft).toBe(d.longBreak);
      if (s.phase === 'shortBreak') expect(s.timeLeft).toBe(d.shortBreak);
      if (s.phase === 'work') expect(s.timeLeft).toBeLessThanOrEqual(d.work);
      if (s.phase === 'work') expect(s.timeLeft).toBeGreaterThan(d.longBreak);
    }
    h.r.unmount();
  });

  it('every frame during a natural phase transition is consistent', async () => {
    const h = setup(DISTINCT);
    await h.act(() => h.t.toggleRunning());
    await h.tick(25 * 60_000);
    const d = buildDurations(DISTINCT);
    expect(h.t).toMatchObject({ phase: 'shortBreak', timeLeft: d.shortBreak });
    for (const s of h.seen) {
      if (s.phase === 'shortBreak') expect(s.timeLeft).toBe(d.shortBreak);
    }
    h.r.unmount();
  });

  it('jumpTo the current phase is a no-op', async () => {
    const h = setup();
    await h.act(() => h.t.toggleRunning());
    await h.tick(4000);
    await h.act(() => h.t.jumpTo('work'));
    expect(h.t).toMatchObject({ phase: 'work', timeLeft: 56, running: true });
    expect(h.cb.onPhaseChange).not.toHaveBeenCalled();
    h.r.unmount();
  });

  it('changing durations resets the current phase time and stops the timer', async () => {
    const h = setup();
    await h.act(() => h.t.toggleRunning());
    await h.tick(4000);
    await h.setSettings({ ...SETTINGS, workMin: 2 });
    expect(h.t).toMatchObject({ phase: 'work', timeLeft: 120, running: false });
    h.r.unmount();
  });
});
