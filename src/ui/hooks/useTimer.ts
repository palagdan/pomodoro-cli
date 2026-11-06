import { useState, useEffect, useCallback, useRef } from 'react';
import type { PhaseName, Settings } from '../../types.js';

export function buildDurations(settings: Settings): Record<PhaseName, number> {
  return {
    work:       settings.workMin       * 60,
    shortBreak: settings.shortBreakMin * 60,
    longBreak:  settings.longBreakMin  * 60,
  };
}

export interface TimerState {
  phase: PhaseName;
  timeLeft: number;
  running: boolean;
  sessions: number;
}

export interface TimerActions {
  toggleRunning: () => void;
  resetPhase: () => void;
  skipPhase: () => void;
  jumpTo: (phase: PhaseName) => void;
}

export interface TimerCallbacks {
  onPhaseStart?: (phase: PhaseName) => void;
  onPhaseEnd?: (phase: PhaseName, sessions: number) => void;
  onPhaseSkip?: (phase: PhaseName) => void;
}

export type Timer = TimerState & TimerActions;

export function useTimer(settings: Settings, callbacks?: TimerCallbacks): Timer {
  const durations = buildDurations(settings);
  const interval = settings.longBreakEvery;

  const [phase, setPhase] = useState<PhaseName>('work');
  const [timeLeft, setTimeLeft] = useState(durations.work);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0);

  // Keep callbacks in a ref so interval closures always call the latest version
  const callbacksRef = useRef(callbacks);
  useEffect(() => { callbacksRef.current = callbacks; }, [callbacks]);

  const advancePhase = useCallback((currentSessions: number, fromPhase: PhaseName) => {
    if (fromPhase === 'work') {
      const next = currentSessions + 1;
      setSessions(next);
      setPhase(next % interval === 0 ? 'longBreak' : 'shortBreak');
    } else {
      setPhase('work');
    }
  }, [interval]);

  // Reset timer when phase or settings change
  useEffect(() => {
    setTimeLeft(durations[phase]);
    setRunning(false);
  }, [phase, settings.workMin, settings.shortBreakMin, settings.longBreakMin]);

  // Fire onPhaseStart on phase transitions. The initial phase has no transition,
  // so its onPhaseStart is deferred until the timer is first started.
  const initialStartPending = useRef(true);
  const isFirstPhaseRender = useRef(true);
  useEffect(() => {
    if (isFirstPhaseRender.current) { isFirstPhaseRender.current = false; return; }
    initialStartPending.current = false;
    callbacksRef.current?.onPhaseStart?.(phase);
  }, [phase]);

  // Countdown tick — the updater stays pure; phase completion is handled below
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setTimeLeft(t => Math.max(0, t - 1)), 1000);
    return () => clearInterval(id);
  }, [running]);

  // Phase completion
  useEffect(() => {
    if (!running || timeLeft > 0) return;
    setRunning(false);
    callbacksRef.current?.onPhaseEnd?.(phase, sessions);
    advancePhase(sessions, phase);
  }, [running, timeLeft, phase, sessions, advancePhase]);

  return {
    phase,
    timeLeft,
    running,
    sessions,
    toggleRunning: () => {
      if (!running && initialStartPending.current) {
        initialStartPending.current = false;
        callbacksRef.current?.onPhaseStart?.(phase);
      }
      setRunning(r => !r);
    },
    resetPhase:    () => { setTimeLeft(durations[phase]); setRunning(false); },
    skipPhase:     () => { callbacksRef.current?.onPhaseSkip?.(phase); advancePhase(sessions, phase); },
    jumpTo:        (p: PhaseName) => setPhase(p),
  };
}
