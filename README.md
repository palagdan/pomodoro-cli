# pomodoro-cli

[![npm](https://img.shields.io/npm/v/@palagdan/pomodoro-cli)](https://www.npmjs.com/package/@palagdan/pomodoro-cli)

![pomodoro demo](docs/demo.gif)

A minimalist Pomodoro timer for people who live in the terminal.

The interface is inspired by AI coding harnesses such as Claude Code and OpenAI's Codex CLI: one prompt, slash commands with a filterable palette, and clean bordered panels. No mouse, no clutter, just focus. Built with [Ink](https://github.com/vadimdemedes/ink).

## Install

```bash
npm install -g @palagdan/pomodoro-cli
pomodoro
```

Requires Node.js 22.12+. Supported on macOS, Linux and Windows.

## Usage

The menu is driven by slash commands:

| Command     | Action                |
|-------------|-----------------------|
| `/start`    | Start the timer       |
| `/settings` | Edit timer durations  |
| `/plugins`  | Manage plugins        |
| `/history`  | Recent sessions grouped by day (from the built-in `session-log` plugin) |
| `/stats`    | Last 7 days: bar chart, total, daily average, completed vs skipped, streak (`session-log`) |
| `/exit`     | Quit                  |

Plugins can add their own commands; those of active plugins appear in the menu between `/plugins` and `/exit`.

Use `↑`/`↓` to move through the list, `Tab` to complete, `Enter` to run.

Timer keys:

| Key     | Action                                  |
|---------|-----------------------------------------|
| `space` | Start / pause                           |
| `r`     | Reset the current phase                 |
| `n`     | Skip to the next phase                  |
| `1` `2` `3` | Jump to focus / short break / long break |
| `q`     | Back to the menu                        |

Settings are saved to `~/.pomodoro-cli/settings.json`.

## Plugins

Built-in plugins:

- `sound` - plays a system sound when a phase starts (macOS and Windows; sounds are configurable).
- `desktop-notify` - shows a desktop notification when a phase ends (macOS, Linux and Windows).
- `session-log` - records finished focus sessions (and focus sessions skipped after they had started) and adds the `/history` and `/stats` commands. Records are appended to `~/.pomodoro-cli/history.jsonl` (configurable via `file`, where `~/` or `~\` means your home folder; enable `logBreaks` to log breaks too) as JSON Lines, one object per line: `at` (ISO timestamp), `phase`, `outcome` (`completed` or `skipped`), `focusedSeconds`, `durationSeconds`, `sessions`. Easy to analyse with `jq` or a script.

Enable or disable plugins in `/plugins`.

### Custom plugins

Drop a `.js` or `.mjs` file into `~/.pomodoro-cli/plugins/`. The default export is an object or a class with:

- `name` - `[A-Za-z0-9._-]+`
- `apiVersion: 1` - the plugin API version the plugin was written for

Plugins without a matching `apiVersion` are skipped with a message. A user plugin with the same `name` as a built-in plugin replaces it.

```js
// ~/.pomodoro-cli/plugins/hello.mjs
import { appendFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const LOG = join(homedir(), '.pomodoro-cli', 'hello.log');

/** @type {import('@palagdan/pomodoro-cli/plugin').PomodoroPlugin} */
export default {
  name: 'hello',
  apiVersion: 1,
  config: [
    { key: 'greeting', label: 'Greeting', type: 'string', default: 'Nice work!' },
  ],
  onPhaseEnd({ phase, sessions, config }) {
    appendFileSync(LOG, `${new Date().toISOString()} ${config.greeting} (${phase} done, ${sessions} focus sessions)\n`);
  },
  onExit() {
    appendFileSync(LOG, `${new Date().toISOString()} bye\n`);
  },
};
```

Do not use `console.log` in hooks: the terminal is owned by the UI and output would corrupt it. Errors thrown (or rejected) by a hook are caught and reported, and never crash the timer.

If you install the package next to your plugins (`cd ~/.pomodoro-cli/plugins && npm i -D @palagdan/pomodoro-cli`), you get types and the `definePlugin` helper:

```js
import { definePlugin } from '@palagdan/pomodoro-cli/plugin';

export default definePlugin({ name: 'hello', apiVersion: 1, onPhaseEnd(ctx) { /* ... */ } });
```

The same folder is where plugins `npm install` their own dependencies.

#### Hooks

All hooks are optional, may be `async`, and receive a single context object. Every hook gets `{ settings, config }`; timer hooks additionally get `{ phase, sessions, durationSeconds, elapsedSeconds }`, where `sessions` is the number of completed focus sessions after the event, `durationSeconds` is the full length of the phase and `elapsedSeconds` is how much of it had run when the event fired (`0` for a fresh phase).

| Hook               | Fires when                                                        | Context                         |
|--------------------|-------------------------------------------------------------------|---------------------------------|
| `onInit`           | the plugin becomes active (see below)                             | `settings`, `config`            |
| `onExit`           | the plugin becomes inactive (disabled) or the app exits           | `settings`, `config`            |
| `onConfigChange`   | the config of an active plugin is saved                           | `settings`, `config`            |
| `onSettingsChange` | timer settings change                                             | `settings`, `config`            |
| `onPhaseChange`    | the current phase switches (timer is paused at the new phase)     | + timer context (see above)    |
| `onTimerStart`     | the countdown of a phase starts for the first time                | + timer context (see above)    |
| `onPause`          | the timer is paused                                               | + timer context (see above)    |
| `onResume`         | the timer is resumed                                              | + timer context (see above)    |
| `onReset`          | the current phase is reset                                        | + timer context (see above)    |
| `onPhaseEnd`       | a phase runs down to 0                                            | + timer context (see above)    |
| `onPhaseSkip`      | the user skips the phase                                          | + timer context (see above)    |

`phase` is `'work'`, `'shortBreak'` or `'longBreak'`.

#### Commands

A plugin can add slash commands with `commands`. Each has a `name`, a `description` and a `run({ settings, config })` function that returns lines (sync or `async`). A line is a string or `{ text, color?, bold?, dim? }`. The lines are shown in a scrollable framed screen (`↑`/`↓`, `PageUp`/`PageDown` to scroll, `q` or `esc` to go back).

```js
// ~/.pomodoro-cli/plugins/hello.mjs
export default {
  name: 'hello',
  apiVersion: 1,
  commands: [
    {
      name: 'hello',
      description: 'Say hello',
      run({ settings, config }) {
        return [
          'Hello from a plugin!',
          { text: `Focus length: ${Math.round(settings.workDuration / 60)} min`, color: 'green', bold: true },
        ];
      },
    },
  ],
};
```

Rules:

- `name` uses lowercase letters, digits and dashes, without the leading slash (`hello` becomes `/hello`).
- `start`, `settings`, `plugins` and `exit` are reserved. On a name clash the first plugin wins and a warning is printed at startup. Invalid commands are ignored with a warning.
- Only commands of *active* plugins appear in the menu.
- `run` is limited to 10 seconds. A thrown error or a timeout is shown as a red line instead of crashing the app.
- Return plain data only: plugins never import React or Ink.

See `src/plugins/session-log.ts` for a full reference example (config, hooks and commands together).

#### Lifecycle

A plugin is *active* when it is enabled and all its `required` config fields are filled. Only active plugins receive hooks.

- `onInit` runs when a plugin becomes active: at app start, when enabled in `/plugins`, or when its required config is completed.
- `onExit` runs when a plugin becomes inactive (disabled) or when the app exits. On quit it is awaited for up to 3 seconds, then the process exits.
- Keep hooks fast, or make them `async`; do not block the timer.
- Do not do work at module top level. Disabled plugins are still imported to read their `name`.

#### Config fields

Declare `config` fields to get a form in `/plugins`. Common options: `key`, `label`, `hint`, `required`, `default`.

| `type`    | Extra options              | Value     |
|-----------|----------------------------|-----------|
| `string`  | `default`                  | `string`  |
| `secret`  | - (no `default`)           | `string`  |
| `number`  | `min`, `max`, `step`       | `number`  |
| `boolean` | `default`                  | `boolean` |
| `select`  | `options` (list of strings) | `string`  |

Values reach hooks through `ctx.config`, with defaults already applied. They are stored in `~/.pomodoro-cli/plugins/<name>.json`, which is created with owner-only permissions (`0600`). `secret` fields are masked in the UI, but they are stored as plain text in that file.

## Development

```bash
npm install
npm start            # run the app
npm run dev          # run with file watching
npm run typecheck    # type-check
npm test             # run the test suite once (Vitest)
npm run test:watch   # run tests in watch mode
npm run build        # compile to dist/
```

## Versioning

This project follows [SemVer](https://semver.org). Versions and `CHANGELOG.md` are generated from [Conventional Commits](https://www.conventionalcommits.org): `feat` bumps minor, `fix` bumps patch, and `!` or a `BREAKING CHANGE` footer bumps major.

Release steps, on `main`:

```bash
npm run release:dry          # preview the bump and changelog
npm run release              # first ever release: npm run release:first
git push --follow-tags
npm publish                  # scoped packages: npm publish --access public
```

Releases are published to npm by GitHub Actions (`.github/workflows/publish.yml`) when a `v*` tag is pushed, so the manual `npm publish` step is normally not needed:

```bash
npm run release        # bump version, update CHANGELOG, create tag
git push --follow-tags # triggers the publish workflow
```

The workflow uses npm trusted publishing, so no npm token is stored in the repo.

## License

ISC
