import { useState, useEffect, useCallback } from 'react';
import { LONG_BREAK_INTERVAL } from '../constants.js';
import type { PhaseName, Settings } from '../types.js';

function buildDurations(settings: Settings): Record<PhaseName, number> {
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

export function useTimer(settings: Settings): TimerState & TimerActions {
  const durations = buildDurations(settings);
  const interval = settings.longBreakEvery;

  const [phase, setPhase] = useState<PhaseName>('work');
  const [timeLeft, setTimeLeft] = useState(durations.work);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0);

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

  // Countdown tick
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setTimeLeft((t: number) => {
        if (t <= 1) {
          clearInterval(id);
          advancePhase(sessions, phase);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running, phase, sessions, advancePhase]);

  return {
    phase,
    timeLeft,
    running,
    sessions,
    toggleRunning: () => setRunning(r => !r),
    resetPhase:    () => { setTimeLeft(durations[phase]); setRunning(false); },
    skipPhase:     () => advancePhase(sessions, phase),
    jumpTo:        (p: PhaseName) => setPhase(p),
  };
}
