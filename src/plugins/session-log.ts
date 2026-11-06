import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { definePlugin } from '../plugin-api.js';
import type { CommandLine, ConfigValues, PhaseContext, PhaseName } from '../plugin-api.js';

type Outcome = 'completed' | 'skipped';

interface SessionRecord {
  at: string;
  phase: PhaseName;
  outcome: Outcome;
  focusedSeconds: number;
  durationSeconds: number;
  sessions: number;
}

const PHASE_LABEL: Record<PhaseName, string> = {
  work: 'Focus',
  shortBreak: 'Short break',
  longBreak: 'Long break',
};

const EMPTY_MESSAGE: CommandLine =
  { text: 'No sessions yet. They appear here after your first finished focus session.', dim: true };

const BAR_WIDTH = 30;
const STATS_DAYS = 7;
const HISTORY_LIMIT = 20;

// ── File access ─────────────────────────────────────────────────────────────

function resolveFile(config: ConfigValues): string {
  const file = String(config.file || '~/.pomodoro-cli/history.jsonl');
  if (file === '~') return os.homedir();
  if (file.startsWith('~/')) return path.join(os.homedir(), file.slice(2));
  return file;
}

async function append(config: ConfigValues, record: SessionRecord): Promise<void> {
  const file = resolveFile(config);
  try {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.appendFile(file, JSON.stringify(record) + '\n');
  } catch (err) {
    throw new Error(`Could not write ${file}: ${(err as Error).message}`);
  }
}

function isRecord(value: any): value is SessionRecord {
  return !!value
    && typeof value.at === 'string' && !Number.isNaN(Date.parse(value.at))
    && value.phase in PHASE_LABEL
    && (value.outcome === 'completed' || value.outcome === 'skipped')
    && Number.isFinite(value.focusedSeconds)
    && Number.isFinite(value.durationSeconds)
    && Number.isFinite(value.sessions);
}

/** One JSON object per line; blank, malformed and unknown-shape lines are ignored. */
function parseRecords(text: string): SessionRecord[] {
  const records: SessionRecord[] = [];
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    try {
      const value = JSON.parse(line);
      if (isRecord(value)) records.push(value);
    } catch {
      // malformed line: skip
    }
  }
  return records;
}

async function readRecords(config: ConfigValues): Promise<SessionRecord[]> {
  const file = resolveFile(config);
  try {
    return parseRecords(await fs.readFile(file, 'utf8'));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw new Error(`Could not read ${file}: ${(err as Error).message}`);
  }
}

async function log(ctx: PhaseContext, outcome: Outcome): Promise<void> {
  if (ctx.phase !== 'work' && !ctx.config.logBreaks) return;
  await append(ctx.config, {
    at: new Date().toISOString(),
    phase: ctx.phase,
    outcome,
    focusedSeconds: ctx.elapsedSeconds,
    durationSeconds: ctx.durationSeconds,
    sessions: ctx.sessions,
  });
}

// ── Formatting helpers ──────────────────────────────────────────────────────

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Local calendar day, e.g. "2025-11-03". */
function dayKey(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

const weekday = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'short' });
const clock = (d: Date) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

function dayHeader(date: Date, today: Date): string {
  const key = dayKey(date);
  if (key === dayKey(today)) return 'Today';
  if (key === dayKey(addDays(today, -1))) return 'Yesterday';
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  return `${weekday(date)} ${date.getDate()} ${month}`;
}

/** Minutes for a row: "25m", or "<1m" for anything shorter than a minute. */
function formatMinutes(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  return seconds < 60 || minutes < 1 ? '<1m' : `${minutes}m`;
}

/** Long durations: "6h 15m", "45m". */
function formatTotal(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

// ── Commands ────────────────────────────────────────────────────────────────

function renderHistory(records: SessionRecord[], today: Date): CommandLine[] {
  if (records.length === 0) return [EMPTY_MESSAGE];

  const recent = records
    .map(r => ({ r, date: new Date(r.at) }))
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, HISTORY_LIMIT);

  const lines: CommandLine[] = [];
  let currentDay = '';
  for (const { r, date } of recent) {
    const key = dayKey(date);
    if (key !== currentDay) {
      if (currentDay) lines.push('');
      lines.push({ text: dayHeader(date, today), bold: true });
      currentDay = key;
    }
    const text = `  ${clock(date)}  ${PHASE_LABEL[r.phase].padEnd(12)}${formatMinutes(r.focusedSeconds).padStart(4)}  ${r.outcome}`;
    lines.push({
      text,
      color: r.phase === 'work' ? 'red' : 'green',
      dim: r.outcome === 'skipped',
    });
  }

  const todayKey = dayKey(today);
  const todays = records.filter(r => r.phase === 'work' && dayKey(new Date(r.at)) === todayKey);
  const seconds = todays.reduce((sum, r) => sum + r.focusedSeconds, 0);
  const completedToday = todays.filter(r => r.outcome === 'completed').length;
  lines.push('');
  lines.push({
    text: `Today: ${plural(completedToday, 'completed focus session')} · ${Math.round(seconds / 60)} min focused`,
    dim: true,
  });
  return lines;
}

function renderStats(records: SessionRecord[], today: Date): CommandLine[] {
  const work = records.filter(r => r.phase === 'work');
  if (work.length === 0) return [EMPTY_MESSAGE];

  const secondsByDay = new Map<string, number>();
  const completedByDay = new Map<string, number>();
  for (const r of work) {
    const key = dayKey(new Date(r.at));
    secondsByDay.set(key, (secondsByDay.get(key) ?? 0) + r.focusedSeconds);
    if (r.outcome === 'completed') completedByDay.set(key, (completedByDay.get(key) ?? 0) + 1);
  }

  const days = Array.from({ length: STATS_DAYS }, (_, i) => addDays(today, i - (STATS_DAYS - 1)));
  const daySeconds = days.map(d => secondsByDay.get(dayKey(d)) ?? 0);
  const maxSeconds = Math.max(...daySeconds);

  const lines: CommandLine[] = [];
  days.forEach((d, i) => {
    const bar = maxSeconds > 0 && daySeconds[i] > 0
      ? '█'.repeat(Math.max(1, Math.round((daySeconds[i] / maxSeconds) * BAR_WIDTH)))
      : '';
    const minutes = String(Math.round(daySeconds[i] / 60)) + 'm';
    // Pad the plain-text prefix so minutes line up; colour is applied per line.
    lines.push({ text: `  ${weekday(d)} ${pad2(d.getDate())}  ${bar.padEnd(BAR_WIDTH)}  ${minutes.padStart(5)}`, color: 'red' });
  });

  const inWindow = new Set(days.map(dayKey));
  const windowWork = work.filter(r => inWindow.has(dayKey(new Date(r.at))));
  const totalMinutes = Math.round(daySeconds.reduce((a, b) => a + b, 0) / 60);
  const completed = windowWork.filter(r => r.outcome === 'completed').length;
  const skipped = windowWork.length - completed;

  // Streak: consecutive days with a completed session, ending today (or yesterday if today has none yet).
  let cursor = completedByDay.has(dayKey(today)) ? today : addDays(today, -1);
  let streak = 0;
  while (completedByDay.has(dayKey(cursor))) {
    streak++;
    cursor = addDays(cursor, -1);
  }

  lines.push('');
  lines.push(`Total focus: ${formatTotal(totalMinutes)} in the last ${STATS_DAYS} days`);
  lines.push(`Daily average: ${formatTotal(Math.round(totalMinutes / STATS_DAYS))}`);
  lines.push(`Sessions: ${completed} completed, ${skipped} skipped`);
  lines.push(`Streak: ${plural(streak, 'day')}`);
  return lines;
}

export default definePlugin({
  name: 'session-log',
  apiVersion: 1,
  description: 'Record finished sessions and show /history and /stats',

  config: [
    {
      key: 'file', label: 'History file', type: 'string',
      default: '~/.pomodoro-cli/history.jsonl',
      hint: 'JSON Lines file; ~ is your home folder',
    },
    { key: 'logBreaks', label: 'Log breaks too', type: 'boolean', default: false },
  ],

  onPhaseEnd(ctx) {
    return log(ctx, 'completed');
  },

  onPhaseSkip(ctx) {
    // A phase skipped before it ever ran isn't a session.
    if (ctx.elapsedSeconds <= 0) return;
    return log(ctx, 'skipped');
  },

  commands: [
    {
      name: 'history',
      description: 'Recent sessions',
      async run({ config }) {
        return renderHistory(await readRecords(config), new Date());
      },
    },
    {
      name: 'stats',
      description: 'Focus stats for the last 7 days',
      async run({ config }) {
        return renderStats(await readRecords(config), new Date());
      },
    },
  ],
});
