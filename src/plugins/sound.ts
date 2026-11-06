import { execFile } from 'child_process';
import { definePlugin } from '../plugin-api.js';

const SOUNDS = [
  'Basso', 'Blow', 'Bottle', 'Frog', 'Funk', 'Glass', 'Hero',
  'Morse', 'Ping', 'Pop', 'Purr', 'Sosumi', 'Submarine', 'Tink',
] as const;

const SOUND_KEY = {
  work: 'workSound',
  shortBreak: 'shortBreakSound',
  longBreak: 'longBreakSound',
} as const;

export default definePlugin({
  name: 'sound',
  apiVersion: 1,
  description: 'Play a system sound when the phase changes (macOS)',

  config: [
    { key: 'workSound',       label: 'Work phase sound',  type: 'select', options: SOUNDS, default: 'Glass' },
    { key: 'shortBreakSound', label: 'Short break sound', type: 'select', options: SOUNDS, default: 'Blow' },
    { key: 'longBreakSound',  label: 'Long break sound',  type: 'select', options: SOUNDS, default: 'Purr' },
  ],

  onPhaseChange({ phase, config }) {
    if (process.platform !== 'darwin') return;
    const sound = config[SOUND_KEY[phase]];
    if (typeof sound !== 'string') return;
    execFile('afplay', [`/System/Library/Sounds/${sound}.aiff`], () => {});
  },
});
