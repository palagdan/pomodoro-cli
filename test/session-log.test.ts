import fs from 'fs';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import plugin from '../src/plugins/session-log.js';
import { resolveConfig } from '../src/plugins.js';
import { DEFAULT_SETTINGS } from '../src/constants.js';
import type { CommandLine, PhaseName } from '../src/types.js';
import { CONFIG_DIR, HOME, resetConfigDir } from './helpers/home.js';

const DEFAULT_FILE = path.join(CONFIG_DIR, 'history.jsonl');

function phaseCtx(
  phase: PhaseName,
  extra: { sessions?: number; durationSeconds?: number; elapsedSeconds?: number } = {},
  overrides: Record<string, unknown> = {},
) {
  return {
    settings: DEFAULT_SETTINGS,
    config: resolveConfig(plugin.config, overrides),
    phase,
    sessions: extra.sessions ?? 1,
    durationSeconds: extra.durationSeconds ?? 1500,
    elapsedSeconds: extra.elapsedSeconds ?? 1500,
  };
}

function cmdCtx(overrides: Record<string, unknown> = {}) {
  return { settings: DEFAULT_SETTINGS, config: resolveConfig(plugin.config, overrides) };
}

async function run(name: 'history' | 'stats', overrides: Record<string, unknown> = {}): Promise<CommandLine[]> {
  const cmd = plugin.commands!.find(c => c.name === name)!;
  return cmd.run(cmdCtx(overrides));
}

const texts = (lines: CommandLine[]) => lines.map(l => (typeof l === 'string' ? l : l.text));
const obj = (l: CommandLine) => (typeof l === 'string' ? { text: l } : l);

/** Local-time date relative to the pinned "now" (Fri 6 Nov 2026, 15:00). */
function at(daysAgo: number, hour = 10, minute = 0): string {
  return new Date(2026, 10, 6 - daysAgo, hour, minute).toISOString();
}

interface Rec { at: string; phase?: string; outcome?: string; focusedSeconds?: number; durationSeconds?: number; sessions?: number }

function writeRecords(records: Rec[], file = DEFAULT_FILE): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const lines = records.map(r => JSON.stringify({
    phase: 'work', outcome: 'completed', focusedSeconds: 1500, durationSeconds: 1500, sessions: 1, ...r,
  }));
  fs.writeFileSync(file, lines.join('\n') + '\n');
}

function readLog(file = DEFAULT_FILE): any[] {
  return fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
}

beforeEach(() => {
  resetConfigDir();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 6, 15, 0));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('recording', () => {
  it('appends a completed focus session as one JSON line', async () => {
    await plugin.onPhaseEnd!(phaseCtx('work', { sessions: 3, durationSeconds: 1500, elapsedSeconds: 1500 }));
    const raw = fs.readFileSync(DEFAULT_FILE, 'utf8');
    expect(raw.endsWith('\n')).toBe(true);
    expect(raw.trim().split('\n')).toHaveLength(1);
    expect(JSON.parse(raw)).toEqual({
      at: new Date(2026, 10, 6, 15, 0).toISOString(),
      phase: 'work',
      outcome: 'completed',
      focusedSeconds: 1500,
      durationSeconds: 1500,
      sessions: 3,
    });
  });

  it('appends rather than overwrites', async () => {
    await plugin.onPhaseEnd!(phaseCtx('work', { sessions: 1 }));
    await plugin.onPhaseEnd!(phaseCtx('work', { sessions: 2 }));
    expect(readLog().map(r => r.sessions)).toEqual([1, 2]);
  });

  it('does not record a skip before the phase ever ran', async () => {
    await plugin.onPhaseSkip!(phaseCtx('work', { elapsedSeconds: 0 }));
    expect(fs.existsSync(DEFAULT_FILE)).toBe(false);
  });

  it('records a skip with elapsed time as skipped', async () => {
    await plugin.onPhaseSkip!(phaseCtx('work', { elapsedSeconds: 420 }));
    expect(readLog()).toEqual([expect.objectContaining({
      phase: 'work', outcome: 'skipped', focusedSeconds: 420, durationSeconds: 1500,
    })]);
  });

  it('ignores breaks by default', async () => {
    await plugin.onPhaseEnd!(phaseCtx('shortBreak'));
    await plugin.onPhaseEnd!(phaseCtx('longBreak'));
    await plugin.onPhaseSkip!(phaseCtx('shortBreak', { elapsedSeconds: 60 }));
    expect(fs.existsSync(DEFAULT_FILE)).toBe(false);
  });

  it('records breaks when logBreaks is on', async () => {
    const cfg = { logBreaks: true };
    await plugin.onPhaseEnd!(phaseCtx('shortBreak', { elapsedSeconds: 300, durationSeconds: 300 }, cfg));
    await plugin.onPhaseSkip!(phaseCtx('longBreak', { elapsedSeconds: 60, durationSeconds: 900 }, cfg));
    expect(readLog().map(r => [r.phase, r.outcome])).toEqual([
      ['shortBreak', 'completed'],
      ['longBreak', 'skipped'],
    ]);
  });

  it('expands a leading ~\\ (Windows style) under the home folder', async () => {
    await plugin.onPhaseEnd!(phaseCtx('work', {}, { file: '~\\win-history.jsonl' }));
    const file = path.join(HOME, 'win-history.jsonl');
    expect(readLog(file)).toHaveLength(1);
    fs.rmSync(file);
  });

  it('expands a leading ~ in a custom file and creates missing folders', async () => {
    const cfg = { file: '~/nested/deeper/log.jsonl' };
    await plugin.onPhaseEnd!(phaseCtx('work', {}, cfg));
    const file = path.join(HOME, 'nested', 'deeper', 'log.jsonl');
    expect(readLog(file)).toHaveLength(1);
    fs.rmSync(path.join(HOME, 'nested'), { recursive: true, force: true });
  });

  it('rejects with a short message when the target cannot be written', async () => {
    const blocker = path.join(HOME, 'blocker');
    fs.writeFileSync(blocker, 'x');
    const file = path.join(blocker, 'history.jsonl');
    const promise = Promise.resolve(plugin.onPhaseEnd!(phaseCtx('work', {}, { file })));
    await expect(promise).rejects.toThrow(/^Could not write /);
    await expect(promise).rejects.toThrow(file);
    fs.rmSync(blocker);
  });
});

describe('reading', () => {
  it('ignores malformed, blank and wrongly shaped lines', async () => {
    const good = JSON.stringify({
      at: at(0, 9), phase: 'work', outcome: 'completed', focusedSeconds: 1500, durationSeconds: 1500, sessions: 1,
    });
    const lines = [
      'not json {',
      '',
      '   ',
      good,
      JSON.stringify({ at: at(0, 9) }),
      JSON.stringify({ at: 'garbage', phase: 'work', outcome: 'completed', focusedSeconds: 1, durationSeconds: 1, sessions: 1 }),
      JSON.stringify({ at: at(0, 9), phase: 'nap', outcome: 'completed', focusedSeconds: 1, durationSeconds: 1, sessions: 1 }),
      JSON.stringify({ at: at(0, 9), phase: 'work', outcome: 'done', focusedSeconds: 1, durationSeconds: 1, sessions: 1 }),
      JSON.stringify({ at: at(0, 9), phase: 'work', outcome: 'completed', focusedSeconds: '5', durationSeconds: 1, sessions: 1 }),
      'null',
      '42',
      '[]',
    ];
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
    fs.writeFileSync(DEFAULT_FILE, lines.join('\n') + '\n');

    const out = texts(await run('history'));
    expect(out.filter(l => /completed$/.test(l))).toHaveLength(1);
    expect(out.at(-1)).toBe('Today: 1 completed focus session · 25 min focused');
  });

  it('shows a friendly message when the file is missing', async () => {
    for (const name of ['history', 'stats'] as const) {
      const lines = await run(name);
      expect(lines).toHaveLength(1);
      expect(texts(lines)[0]).toMatch(/^No sessions yet/);
    }
  });

  it('shows the friendly message when the file has no valid records', async () => {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
    fs.writeFileSync(DEFAULT_FILE, 'junk\n\n');
    expect(texts(await run('history'))[0]).toMatch(/^No sessions yet/);
    expect(texts(await run('stats'))[0]).toMatch(/^No sessions yet/);
  });

  it('reads from a custom file', async () => {
    const file = path.join(HOME, 'custom-history.jsonl');
    writeRecords([{ at: at(0, 9) }], file);
    const out = texts(await run('history', { file }));
    expect(out).toContain('Today');
    fs.rmSync(file);
  });
});

describe('/history', () => {
  it('lists newest first with day headers', async () => {
    writeRecords([
      { at: at(2, 9) },
      { at: at(0, 9) },
      { at: at(1, 14) },
      { at: at(0, 13) },
    ]);
    const out = texts(await run('history'));
    const headers = out.filter(l => l && !l.startsWith(' ') && !l.startsWith('Today:'));
    expect(headers).toEqual(['Today', 'Yesterday', 'Wed 4 Nov']);
    const rows = out.filter(l => l.startsWith('  '));
    expect(rows.map(l => l.trim().slice(0, 5))).toEqual(['13:00', '09:00', '14:00', '09:00']);
  });

  it('formats a row with time, label, minutes and outcome', async () => {
    writeRecords([{ at: at(0, 9, 5), focusedSeconds: 1500 }]);
    const out = texts(await run('history'));
    expect(out).toContain('  09:05  Focus        25m  completed');
  });

  it('shows <1m for sessions shorter than a minute', async () => {
    writeRecords([{ at: at(0, 9), outcome: 'skipped', focusedSeconds: 30 }]);
    const out = texts(await run('history'));
    expect(out.some(l => l.includes('<1m') && l.includes('skipped'))).toBe(true);
  });

  it('shows at most 20 rows', async () => {
    writeRecords(Array.from({ length: 30 }, (_, i) => ({ at: at(0, 8, i) })));
    const rows = texts(await run('history')).filter(l => l.startsWith('  '));
    expect(rows).toHaveLength(20);
    // newest first: the oldest 10 are dropped
    expect(rows[0].trim().startsWith('08:29')).toBe(true);
    expect(rows[19].trim().startsWith('08:10')).toBe(true);
  });

  it('dims skipped rows and colours work red and breaks green', async () => {
    writeRecords([
      { at: at(0, 9), outcome: 'completed' },
      { at: at(0, 10), outcome: 'skipped', focusedSeconds: 600 },
      { at: at(0, 11), phase: 'shortBreak', outcome: 'completed', focusedSeconds: 300 },
      { at: at(0, 12), phase: 'longBreak', outcome: 'skipped', focusedSeconds: 100 },
    ]);
    const lines = (await run('history')).map(obj);
    const row = (time: string) => lines.find(l => l.text.startsWith(`  ${time}`))!;

    expect(row('09:00')).toMatchObject({ color: 'red' });
    expect(row('09:00').dim).toBeFalsy();
    expect(row('10:00')).toMatchObject({ color: 'red', dim: true });
    expect(row('11:00')).toMatchObject({ color: 'green' });
    expect(row('11:00').dim).toBeFalsy();
    expect(row('12:00')).toMatchObject({ color: 'green', dim: true });
    expect(row('12:00').text).toContain('Long break');
  });

  it('footer counts completed sessions but sums minutes of all focus records today', async () => {
    writeRecords([
      { at: at(0, 9), outcome: 'completed', focusedSeconds: 1500 },
      { at: at(0, 10), outcome: 'skipped', focusedSeconds: 600 },
      { at: at(0, 11), phase: 'shortBreak', focusedSeconds: 300 }, // break: ignored
      { at: at(1, 9), focusedSeconds: 1500 },                       // yesterday: ignored
    ]);
    const out = texts(await run('history'));
    expect(out.at(-1)).toBe('Today: 1 completed focus session · 35 min focused');
  });

  it('pluralises the footer correctly', async () => {
    writeRecords([{ at: at(0, 9) }, { at: at(0, 10) }]);
    expect(texts(await run('history')).at(-1)).toBe('Today: 2 completed focus sessions · 50 min focused');

    writeRecords([{ at: at(1, 9) }]);
    expect(texts(await run('history')).at(-1)).toBe('Today: 0 completed focus sessions · 0 min focused');
  });
});

describe('/stats', () => {
  it('shows 7 rows from oldest to today with weekday labels', async () => {
    writeRecords([{ at: at(0, 9) }]);
    const rows = texts(await run('stats')).slice(0, 7);
    expect(rows.map(l => l.trim().slice(0, 6))).toEqual([
      'Sat 31', 'Sun 01', 'Mon 02', 'Tue 03', 'Wed 04', 'Thu 05', 'Fri 06',
    ]);
  });

  it('scales the busiest day to a 30-char bar and leaves zero days empty', async () => {
    writeRecords([
      { at: at(0, 9), focusedSeconds: 3000 },
      { at: at(1, 9), focusedSeconds: 1500 },
    ]);
    const rows = texts(await run('stats')).slice(0, 7);
    const bar = (s: string) => (s.match(/█/g) ?? []).length;
    expect(bar(rows[6])).toBe(30);
    expect(bar(rows[5])).toBe(15);
    for (const i of [0, 1, 2, 3, 4]) {
      expect(bar(rows[i])).toBe(0);
      expect(rows[i].trim().endsWith('0m')).toBe(true);
    }
    expect(rows[6].trim().endsWith('50m')).toBe(true);
  });

  it('counts only focus records', async () => {
    writeRecords([
      { at: at(0, 9), focusedSeconds: 1500 },
      { at: at(0, 10), phase: 'shortBreak', focusedSeconds: 3000 },
    ]);
    const out = texts(await run('stats'));
    expect(out).toContain('Total focus: 25m in the last 7 days');
    expect(out).toContain('Sessions: 1 completed, 0 skipped');
  });

  it('shows the empty message when only breaks were logged', async () => {
    writeRecords([{ at: at(0, 9), phase: 'shortBreak' }]);
    expect(texts(await run('stats'))[0]).toMatch(/^No sessions yet/);
  });

  it('reports totals, daily average and completed vs skipped', async () => {
    writeRecords([
      { at: at(0, 9), focusedSeconds: 1500 },
      { at: at(0, 10), focusedSeconds: 1500 },
      { at: at(2, 9), outcome: 'skipped', focusedSeconds: 600 },
      { at: at(3, 9), focusedSeconds: 1500 },
      { at: at(20, 9), focusedSeconds: 6000 }, // outside the window
    ]);
    const out = texts(await run('stats'));
    // 25+25+10+25 = 85 min
    expect(out).toContain('Total focus: 1h 25m in the last 7 days');
    expect(out).toContain('Daily average: 12m');
    expect(out).toContain('Sessions: 3 completed, 1 skipped');
  });

  describe('streak', () => {
    const streak = async () => texts(await run('stats')).find(l => l.startsWith('Streak:'));

    it('counts consecutive days ending today', async () => {
      writeRecords([{ at: at(0) }, { at: at(1) }, { at: at(2) }]);
      expect(await streak()).toBe('Streak: 3 days');
    });

    it('ends yesterday when today has no completed focus yet', async () => {
      writeRecords([{ at: at(1) }, { at: at(2) }]);
      expect(await streak()).toBe('Streak: 2 days');
    });

    it('does not count a skipped-only today as continuing, but does not break yesterday either', async () => {
      writeRecords([{ at: at(0), outcome: 'skipped', focusedSeconds: 300 }, { at: at(1) }]);
      expect(await streak()).toBe('Streak: 1 day');
    });

    it('resets on a gap', async () => {
      writeRecords([{ at: at(0) }, { at: at(1) }, { at: at(3) }, { at: at(4) }]);
      expect(await streak()).toBe('Streak: 2 days');
    });

    it('is 0 when the last completed session was before yesterday', async () => {
      writeRecords([{ at: at(2) }, { at: at(3) }]);
      expect(await streak()).toBe('Streak: 0 days');
    });

    it('can extend beyond the 7-day window', async () => {
      writeRecords(Array.from({ length: 9 }, (_, i) => ({ at: at(i) })));
      expect(await streak()).toBe('Streak: 9 days');
    });
  });
});
