import fs from 'fs';
import path from 'path';
import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../src/constants.js';
import { loadSettings, saveSettings } from '../src/storage.js';
import { CONFIG_DIR, readConfigFile, resetConfigDir, writeConfigFile } from './helpers/home.js';

beforeEach(resetConfigDir);

describe('loadSettings', () => {
  it('returns defaults when there is no file', () => {
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('returns defaults for invalid JSON', () => {
    writeConfigFile('settings.json', '{not json');
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('returns defaults when the file holds a non-object', () => {
    writeConfigFile('settings.json', 'null');
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('merges a partial file with defaults', () => {
    writeConfigFile('settings.json', { workMin: 50 });
    expect(loadSettings()).toEqual({ ...DEFAULT_SETTINGS, workMin: 50 });
  });

  it('does not mutate DEFAULT_SETTINGS', () => {
    writeConfigFile('settings.json', { workMin: 50 });
    loadSettings();
    expect(DEFAULT_SETTINGS.workMin).toBe(25);
  });

  it.each([
    ['non-integer', 2.5],
    ['zero', 0],
    ['negative', -5],
    ['string', '30'],
    ['null', null],
    ['boolean', true],
  ])('drops an invalid value per key (%s)', (_label, bad) => {
    writeConfigFile('settings.json', { workMin: bad, shortBreakMin: 7 });
    expect(loadSettings()).toEqual({ ...DEFAULT_SETTINGS, shortBreakMin: 7 });
  });
});

describe('saveSettings', () => {
  it('round-trips through loadSettings', () => {
    const settings = { workMin: 40, shortBreakMin: 10, longBreakMin: 20, longBreakEvery: 3 };
    saveSettings(settings);
    expect(loadSettings()).toEqual(settings);
  });

  it('creates the config directory', () => {
    expect(fs.existsSync(CONFIG_DIR)).toBe(false);
    saveSettings(DEFAULT_SETTINGS);
    expect(fs.statSync(CONFIG_DIR).isDirectory()).toBe(true);
    expect(fs.existsSync(path.join(CONFIG_DIR, 'settings.json'))).toBe(true);
  });

  it('writes JSON', () => {
    saveSettings(DEFAULT_SETTINGS);
    expect(JSON.parse(readConfigFile('settings.json'))).toEqual(DEFAULT_SETTINGS);
  });
});
