import fs from 'fs';
import os from 'os';
import path from 'path';

/** The per-file temporary home set up in setup.ts. */
export const HOME = os.homedir();
export const CONFIG_DIR  = path.join(HOME, '.pomodoro-cli');
export const PLUGINS_DIR = path.join(CONFIG_DIR, 'plugins');

/** Empties ~/.pomodoro-cli — call in beforeEach for tests that write config. */
export function resetConfigDir(): void {
  fs.rmSync(CONFIG_DIR, { recursive: true, force: true });
}

export function writeConfigFile(relative: string, content: unknown): string {
  const file = path.join(CONFIG_DIR, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, typeof content === 'string' ? content : JSON.stringify(content));
  return file;
}

export function readConfigFile(relative: string): string {
  return fs.readFileSync(path.join(CONFIG_DIR, relative), 'utf8');
}

/** Writes a user plugin to ~/.pomodoro-cli/plugins/<file>. */
export function writeUserPlugin(file: string, source: string): string {
  fs.mkdirSync(PLUGINS_DIR, { recursive: true });
  const full = path.join(PLUGINS_DIR, file);
  fs.writeFileSync(full, source);
  return full;
}
