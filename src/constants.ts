import type { Phase, PhaseName } from './types.js';

export const PHASES: Record<PhaseName, Phase> = {
  work:       { label: 'Focus',       duration: 25 * 60, color: 'red'   },
  shortBreak: { label: 'Short Break', duration:  5 * 60, color: 'green' },
  longBreak:  { label: 'Long Break',  duration: 15 * 60, color: 'blue'  },
};

export const LONG_BREAK_INTERVAL = 4;

export const VERSION = '1.0.0';
