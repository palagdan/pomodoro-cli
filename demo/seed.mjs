// Seeds a throwaway home dir with plugin settings and a week of fake history for the demo GIF.
// Usage: node demo/seed.mjs <home-dir>
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const home = process.argv[2];
if (!home) {
  console.error('usage: node demo/seed.mjs <home-dir>');
  process.exit(1);
}

const dir = join(home, '.pomodoro-cli');
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true });
// No real notifications or sounds while recording.
writeFileSync(join(dir, 'plugins-disabled.json'), JSON.stringify(['desktop-notify', 'sound']));

const MIN = 60_000;
const focusCounts = [4, 3, 5, 2, 6, 4, 3]; // oldest day -> today
const skipOnDay = new Set([1, 4]); // days (index) that get one skipped focus session
const records = [];
const now = Date.now();

focusCounts.forEach((count, i) => {
  const daysAgo = focusCounts.length - 1 - i;
  const day = new Date(now);
  day.setDate(day.getDate() - daysAgo);
  day.setHours(9, 30, 0, 0);
  let t = day.getTime();
  const todayCount = daysAgo === 0 ? 2 : count;
  for (let s = 1; s <= todayCount; s++) {
    const skipped = skipOnDay.has(i) && s === 2;
    const focused = skipped ? 11 * MIN : 25 * MIN;
    t += focused;
    if (t > now - 5 * MIN) break; // never log the future
    records.push({ at: new Date(t).toISOString(), phase: 'work', outcome: skipped ? 'skipped' : 'completed',
      focusedSeconds: focused / 1000, durationSeconds: 25 * 60, sessions: s });
    const long = s % 4 === 0;
    const breakMin = long ? 15 : 5;
    t += breakMin * MIN;
    if (t > now - 5 * MIN) break;
    records.push({ at: new Date(t).toISOString(), phase: long ? 'longBreak' : 'shortBreak', outcome: 'completed',
      focusedSeconds: breakMin * 60, durationSeconds: breakMin * 60, sessions: s });
  }
});

writeFileSync(join(dir, 'history.jsonl'), records.map(r => JSON.stringify(r)).join('\n') + '\n');
console.log(`Seeded ${records.length} records in ${dir}`);
