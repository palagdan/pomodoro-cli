import fs from 'fs';
import path from 'path';
import os from 'os';
import type { Settings } from './types.js';
import { DEFAULT_SETTINGS } from './constants.js';

const CONFIG_DIR  = path.join(os.homedir(), '.pomodoro-cli');
const CONFIG_FILE = path.join(CONFIG_DIR, 'settings.json');

export function loadSettings(): Settings {
  try {
    const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    // Merge with defaults so missing or invalid keys are always filled
    const settings = { ...DEFAULT_SETTINGS };
    for (const key of Object.keys(settings) as (keyof Settings)[]) {
      const v = parsed[key];
      if (typeof v === 'number' && Number.isInteger(v) && v > 0) settings[key] = v;
    }
    return settings;
  } catch {
    return { ...DEFAULT_SETTINGS };
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
