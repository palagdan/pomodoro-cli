import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll } from 'vitest';

// Runs before each test file's imports, so modules that resolve ~/.pomodoro-cli
// at load time (storage.ts, plugins.ts) see the temporary home.
const home = fs.mkdtempSync(path.join(os.tmpdir(), 'pomodoro-test-'));
process.env.HOME = home;
process.env.USERPROFILE = home;

afterAll(() => {
  fs.rmSync(home, { recursive: true, force: true });
});
