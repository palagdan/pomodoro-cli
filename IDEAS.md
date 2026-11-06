# Feature Ideas

## Plugin System

Load JS/TS files from `~/.pomodoro-cli/plugins/`. Each plugin is a module that exports lifecycle hooks called automatically by the app.

### Plugin interface

```ts
export interface PomodoroPlugin {
  name: string;
  description?: string;

  // Called when the app starts
  onInit?: (settings: Settings) => void | Promise<void>;

  // Called when a phase begins (work, shortBreak, longBreak)
  onPhaseStart?: (phase: PhaseName, settings: Settings) => void | Promise<void>;

  // Called when a phase ends naturally (timer reaches 0)
  onPhaseEnd?: (phase: PhaseName, sessions: number, settings: Settings) => void | Promise<void>;

  // Called when the user manually skips a phase
  onPhaseSkip?: (phase: PhaseName) => void | Promise<void>;

  // Called when settings are saved
  onSettingsChange?: (settings: Settings) => void | Promise<void>;
}
```

### Plugin file location

```
~/.pomodoro-cli/
  settings.json
  plugins/
    slack-status.js
    sound.js
    jira-logger.js
```

### Example plugin — macOS sound notification

```js
// ~/.pomodoro-cli/plugins/sound.js
import { exec } from 'child_process';

export const name = 'sound';
export const description = 'Play a sound when a phase ends';

export function onPhaseEnd(phase) {
  const sound = phase === 'work' ? 'Glass' : 'Blow';
  exec(`afplay /System/Library/Sounds/${sound}.aiff`);
}
```

### Example plugin — Slack status

```js
// ~/.pomodoro-cli/plugins/slack-status.js
export const name = 'slack-status';

const TOKEN = process.env.SLACK_TOKEN;

async function setStatus(text, emoji, expireMin = 0) {
  const expiration = expireMin > 0
    ? Math.floor(Date.now() / 1000) + expireMin * 60
    : 0;
  await fetch('https://slack.com/api/users.profile.set', {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile: { status_text: text, status_emoji: emoji, status_expiration: expiration } }),
  });
}

export function onPhaseStart(phase, settings) {
  if (phase === 'work') setStatus('In a Pomodoro', ':tomato:', settings.workMin);
  else setStatus('On a break', ':coffee:');
}

export function onPhaseEnd() {
  setStatus('', '');
}
```

### Plugin config schema

Each plugin exports a `config` array describing the fields it needs. The app reads this to generate a settings form automatically — no hardcoded UI per plugin.

```ts
export interface PluginConfigField {
  key: string;
  label: string;
  type: 'string' | 'number' | 'boolean';
  required?: boolean;
  default?: string | number | boolean;
  hint?: string;       // shown as dimmed placeholder
  min?: number;        // for type: 'number'
  max?: number;
  step?: number;
}
```

Config values are saved to `~/.pomodoro-cli/plugins/<name>.json` automatically when the user saves from the in-app form.

### `/plugins` screen

```
╭─── Plugins ─────────────────────────────╮
│                                          │
│  ✓ sound          configured             │
│  ✗ slack-status   needs setup  ← cursor  │
│  ✗ jira-logger    needs setup            │
│                                          │
│  ↵ configure   space toggle   q back    │
╰──────────────────────────────────────────╯
```

- `✓` = all required fields are present
- `✗` = missing required fields
- `↵` opens a dynamically generated config form for the selected plugin
- `space` enables/disables a plugin without deleting its config

### Config form (auto-generated from schema)

```
╭─── slack-status — Configure ────────────╮
│                                          │
│  ▶ Slack Bot Token                       │
│    > xoxb-________________               │
│                                          │
│    Focus emoji                           │
│    > :tomato:                            │
│                                          │
│  ↑↓ navigate   ↵ edit field   s save   │
╰──────────────────────────────────────────╯
```

- `type: "string"` fields use the `ink-text-input` text prompt
- `type: "number"` fields use the existing `←→` stepper
- `type: "boolean"` fields use a `[x]` / `[ ]` toggle

### Implementation plan

1. `src/plugins.ts` — `loadPlugins()` scans `~/.pomodoro-cli/plugins/*.{js,mjs}`, dynamic-imports each, reads `<name>.json` for config values
2. `src/hooks/usePlugins.ts` — wraps plugin list, exposes `emit(event, ...args)` which calls all plugins in parallel
3. `src/PluginList.tsx` — `/plugins` screen: list with status indicators
4. `src/PluginConfig.tsx` — dynamic config form generated from `plugin.config` schema
5. Wire `emit('onPhaseStart')` / `emit('onPhaseEnd')` into `useTimer.ts`
6. Add `/plugins` to `Menu.tsx` COMMANDS array

---

## Other Ideas

- **`/history`** — log of completed sessions saved to `~/.pomodoro-cli/history.json`
- **`/stats`** — weekly bar chart of focus minutes rendered with `█` characters
- **`/todo`** — simple task list, pick a task before each session
- **`/export`** — dump history to CSV or Markdown
- **Desktop notifications** — `node-notifier` for background alerts
- **Ambient sound** — stream lofi/white noise via `mpv` during focus, pause on break
- **Jira time logging** — log pomodoro to a Jira issue via REST API on phase end
- **`/streak`** — GitHub-style daily usage streak calendar
