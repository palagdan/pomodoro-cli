import fs from 'fs';
import path from 'path';
import os from 'os';
import type { Settings } from './types.js';

const CONFIG_DIR  = path.join(os.homedir(), '.pomodoro-cli');
const CONFIG_FILE = path.join(CONFIG_DIR, 'settings.json');

const DEFAULTS: Settings = {
  workMin:        25,
  shortBreakMin:  5,
  longBreakMin:   15,
  longBreakEvery: 4,
};

export function loadSettings(): Settings {
  try {
    const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Partial<Settings>;
    // Merge with defaults so missing keys are always filled
    return { ...DEFAULTS, ...parsed };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(settings: Settings): void {
  try {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(settings, null, 2), 'utf8');
  } catch {
    // Silently ignore write failures (read-only fs, permissions, etc.)
  }
}
