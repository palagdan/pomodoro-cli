import type { Phase, PhaseName, Settings } from './types.js';
import {version} from '../package.json';

export const PHASES: Record<PhaseName, Phase> = {
    work: { label: 'Focus', duration: 25 * 60, color: 'red' },
    shortBreak: { label: 'Short Break', duration: 5 * 60, color: 'green' },
    longBreak: { label: 'Long Break', duration: 15 * 60, color: 'blue' },
};

export const VERSION = version;

export const DEFAULT_SETTINGS: Settings = {
    workMin: 25,
    shortBreakMin: 5,
    longBreakMin: 15,
    longBreakEvery: 4,
};
