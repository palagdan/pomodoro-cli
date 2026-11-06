import { useState, useEffect, useCallback, useRef } from 'react';
import type { PhaseInfo, PhaseName, Settings } from '../../types.js';

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
  onPhaseChange?: (info: PhaseInfo) => void;
  onTimerStart?:  (info: PhaseInfo) => void;
  onPause?:       (info: PhaseInfo) => void;
  onResume?:      (info: PhaseInfo) => void;
  onReset?:       (info: PhaseInfo) => void;
  onPhaseEnd?:    (info: PhaseInfo) => void;
  onPhaseSkip?:   (info: PhaseInfo) => void;
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

  // Latest durations, so memoised callbacks never see stale values
  const durationsRef = useRef(durations);
  durationsRef.current = durations;

  // Snapshot of the timer for plugin events
  const info = (p: PhaseName, s: number, left: number): PhaseInfo => ({
    phase: p,
    sessions: s,
    durationSeconds: durationsRef.current[p],
    elapsedSeconds: Math.max(0, durationsRef.current[p] - left),
  });

  // Change phase and reset its time in the same render (setState calls are batched)
  const goTo = useCallback((p: PhaseName) => {
    setPhase(p);
    setTimeLeft(durationsRef.current[p]);
    setRunning(false);
  }, []);

  const advancePhase = useCallback((currentSessions: number, fromPhase: PhaseName) => {
    if (fromPhase === 'work') {
      const next = currentSessions + 1;
      setSessions(next);
      goTo(next % interval === 0 ? 'longBreak' : 'shortBreak');
    } else {
      goTo('work');
    }
  }, [interval, goTo]);

  // Whether the countdown has run at all in the current phase (start vs resume)
  const startedInPhase = useRef(false);

  // Reset timer when durations change
  useEffect(() => {
    setTimeLeft(durations[phase]);
    setRunning(false);
    startedInPhase.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.workMin, settings.shortBreakMin, settings.longBreakMin]);

  // Fire onPhaseChange on phase transitions (not for the initial phase)
  const isFirstPhaseRender = useRef(true);
  useEffect(() => {
    startedInPhase.current = false;
    if (isFirstPhaseRender.current) { isFirstPhaseRender.current = false; return; }
    callbacksRef.current?.onPhaseChange?.(info(phase, sessions, durationsRef.current[phase]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    callbacksRef.current?.onPhaseEnd?.(info(phase, phase === 'work' ? sessions + 1 : sessions, 0));
    advancePhase(sessions, phase);
  }, [running, timeLeft, phase, sessions, advancePhase]);

  return {
    phase,
    timeLeft,
    running,
    sessions,
    toggleRunning: () => {
      const cb = callbacksRef.current;
      if (running) {
        cb?.onPause?.(info(phase, sessions, timeLeft));
      } else if (startedInPhase.current) {
        cb?.onResume?.(info(phase, sessions, timeLeft));
      } else {
        startedInPhase.current = true;
        cb?.onTimerStart?.(info(phase, sessions, timeLeft));
      }
      setRunning(r => !r);
    },
    resetPhase: () => {
      callbacksRef.current?.onReset?.(info(phase, sessions, timeLeft));
      setTimeLeft(durations[phase]);
      setRunning(false);
      startedInPhase.current = false;
    },
    skipPhase: () => {
      callbacksRef.current?.onPhaseSkip?.(info(phase, phase === 'work' ? sessions + 1 : sessions, timeLeft));
      advancePhase(sessions, phase);
    },
    jumpTo:        (p: PhaseName) => { if (p !== phase) goTo(p); },
  };
}
