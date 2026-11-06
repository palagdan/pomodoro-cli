import { describe, expect, it } from 'vitest';
import { capitalize, formatTime, progressBar } from '../src/utils.js';
import { HOME } from './helpers/home.js';

describe('formatTime', () => {
  it('pads minutes and seconds', () => {
    expect(formatTime(0)).toBe('00:00');
    expect(formatTime(65)).toBe('01:05');
    expect(formatTime(25 * 60)).toBe('25:00');
  });
});

describe('progressBar', () => {
  it('fills proportionally to elapsed time', () => {
    expect(progressBar(100, 100, 10)).toBe('░'.repeat(10));
    expect(progressBar(50, 100, 10)).toBe('█'.repeat(5) + '░'.repeat(5));
    expect(progressBar(0, 100, 10)).toBe('█'.repeat(10));
  });

  it('clamps when time left exceeds the total (phase-transition render)', () => {
    expect(progressBar(300, 100, 10)).toBe('░'.repeat(10));
    expect(progressBar(-5, 100, 10)).toBe('█'.repeat(10));
  });
});

describe('capitalize', () => {
  it('uppercases the first letter only', () => {
    expect(capitalize('daniil')).toBe('Daniil');
    expect(capitalize('')).toBe('');
  });
});

describe('test harness', () => {
  it('runs with an isolated temporary HOME', () => {
    expect(HOME).toContain('pomodoro-test-');
  });
});
