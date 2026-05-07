import { useState, useEffect, useCallback } from 'react';
import { PHASES, LONG_BREAK_INTERVAL } from '../constants.js';
import type { PhaseName } from '../types.js';

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

export function useTimer(): TimerState & TimerActions {
  const [phase, setPhase] = useState<PhaseName>('work');
  const [timeLeft, setTimeLeft] = useState(PHASES.work.duration);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0);

  const advancePhase = useCallback((currentSessions: number, fromPhase: PhaseName) => {
    if (fromPhase === 'work') {
      const next = currentSessions + 1;
      setSessions(next);
      setPhase(next % LONG_BREAK_INTERVAL === 0 ? 'longBreak' : 'shortBreak');
    } else {
      setPhase('work');
    }
  }, []);

  // Reset timer when phase changes
  useEffect(() => {
    setTimeLeft(PHASES[phase].duration);
    setRunning(false);
  }, [phase]);

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
    resetPhase:    () => { setTimeLeft(PHASES[phase].duration); setRunning(false); },
    skipPhase:     () => advancePhase(sessions, phase),
    jumpTo:        (p: PhaseName) => setPhase(p),
  };
}
