import { execFile } from 'child_process';
import path from 'path';
import { definePlugin } from '../plugin-api.js';

const SOUNDS = [
  'Basso', 'Blow', 'Bottle', 'Frog', 'Funk', 'Glass', 'Hero',
  'Morse', 'Ping', 'Pop', 'Purr', 'Sosumi', 'Submarine', 'Tink',
] as const;

// Each macOS name maps to a WAV in %SystemRoot%\Media (Windows 10/11).
const WINDOWS_SOUNDS: Record<typeof SOUNDS[number], string> = {
  Basso: 'Windows Critical Stop',
  Blow: 'Windows Notify System Generic',
  Bottle: 'Windows Ding',
  Frog: 'Windows Exclamation',
  Funk: 'Windows Error',
  Glass: 'Windows Notify Calendar',
  Hero: 'tada',
  Morse: 'Windows Notify Messaging',
  Ping: 'ding',
  Pop: 'Windows Pop-up Blocked',
  Purr: 'Windows Notify Email',
  Sosumi: 'chord',
  Submarine: 'Windows Background',
  Tink: 'Windows Navigation Start',
};

const SOUND_KEY = {
  work: 'workSound',
  shortBreak: 'shortBreakSound',
  longBreak: 'longBreakSound',
} as const;

export default definePlugin({
  name: 'sound',
  apiVersion: 1,
  description: 'Play a system sound when the phase changes (macOS, Windows)',

  config: [
    { key: 'workSound',       label: 'Work phase sound',  type: 'select', options: SOUNDS, default: 'Glass' },
    { key: 'shortBreakSound', label: 'Short break sound', type: 'select', options: SOUNDS, default: 'Blow' },
    { key: 'longBreakSound',  label: 'Long break sound',  type: 'select', options: SOUNDS, default: 'Purr' },
  ],

  onPhaseChange({ phase, config }) {
    const sound = config[SOUND_KEY[phase]];
    if (typeof sound !== 'string') return;
    if (process.platform === 'darwin') {
      execFile('afplay', [`/System/Library/Sounds/${sound}.aiff`], () => {});
    } else if (process.platform === 'win32') {
      if (!Object.hasOwn(WINDOWS_SOUNDS, sound)) return;
      const name = WINDOWS_SOUNDS[sound as keyof typeof WINDOWS_SOUNDS];
      const file = path.win32.join(process.env.SystemRoot ?? 'C:\\Windows', 'Media', `${name}.wav`);
      execFile(
        'powershell.exe',
        ['-NoProfile', '-NonInteractive', '-Command', '(New-Object Media.SoundPlayer $env:POMODORO_SOUND).PlaySync()'],
        { windowsHide: true, env: { ...process.env, POMODORO_SOUND: file } },
        () => {},
      );
    }
  },
});
