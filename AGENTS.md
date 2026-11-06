# Pomodoro CLI — Agent Instructions

## Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20+ (ESM, `"type": "module"`) |
| Language | TypeScript 5 |
| UI framework | Ink 6 (React for CLIs) |
| JSX runner | tsx (zero-config TS/JSX, no Babel) |
| Layout engine | Yoga (via Ink — flexbox in the terminal) |

## Running & Checking

```bash
npm start              # start the app
npm run dev            # start with file watching
npx tsc --noEmit       # type-check — run this after every edit
npm run build          # compile to dist/ via tsconfig.build.json
```

**Always run `npx tsc --noEmit` after changes and fix all errors before finishing.**

## Releasing

- Commit messages must follow Conventional Commits (`feat:`, `fix:`, `feat!:` / `BREAKING CHANGE`); they drive the SemVer bump and `CHANGELOG.md`.
- Never edit `version` in `package.json` by hand.
- Release from `main` with the scripts: `npm run release:dry` to preview, then `npm run release` (`release:first` for the first release).

## Project Layout

```
index.tsx                 Root component + screen routing (shebang for the bin)
tsconfig.build.json       Build config: compiles to dist/ (gitignored, published bin)
.versionrc.json           commit-and-tag-version config (changelog + bump)
src/
  types.ts                PhaseName, Phase, Settings, Command, Screen, plugin API types (PomodoroPlugin, PluginHooks, contexts)
  plugin-api.ts           Public plugin API entry (definePlugin, PLUGIN_API_VERSION); exported as "<pkg>/plugin"
  constants.ts            PHASES record, LONG_BREAK_INTERVAL, DEFAULT_SETTINGS, VERSION
  utils.ts                formatTime, progressBar, capitalize
  storage.ts              Settings persistence
  plugins.ts              Plugin discovery + apiVersion check, enabled/disabled state, config files (0600)
  pluginHost.ts           PluginHost: plugin lifecycle (init/exit/config change), emit()
  plugins/
    sound.ts              Built-in: system sound on phase start (macOS)
    desktop-notify.ts     Built-in: desktop notification on phase end
  ui/
    hooks/
      useTimer.ts         Timer state: phase, timeLeft, running, sessions + actions
      usePlugins.ts       Subscribes React to the PluginHost (plugin entries)
    screens/
      App.tsx             Timer screen
      Menu.tsx            Menu screen (slash commands + Dashboard)
      Dashboard.tsx       Two-column welcome panel
      Settings.tsx        Timer duration settings
      PluginList.tsx      Enable/disable plugins
      PluginConfig.tsx    Per-plugin config form
    components/
      TimerCard.tsx       Phase label + MM:SS clock + progress bar
      SessionCounter.tsx  Sessions count + next long break in N
      PhaseIndicators.tsx Dots showing active phase
      Controls.tsx        Keyboard hints footer
      CommandPalette.tsx  Filtered list of slash commands with keyboard nav
```

## Critical Rules

### ESM imports
All local imports must use the `.js` extension even for `.ts`/`.tsx` source files:
```ts
import { useTimer } from './hooks/useTimer.js';  // correct
import { useTimer } from './hooks/useTimer';     // wrong — breaks at runtime
```

### Never draw borders manually
```tsx
// WRONG — │ is only 1 line tall, content overflows the box
<Box>
  <Text>│</Text>
  <Box flexDirection="column">...</Box>
  <Text>│</Text>
</Box>

// CORRECT — Ink tracks content height and extends border automatically
<Box borderStyle="round" borderColor="red">
  ...
</Box>

// CORRECT — left-only border for column dividers
<Box
  borderStyle="single" borderColor="red"
  borderLeft={true} borderTop={false} borderBottom={false} borderRight={false}
>
  ...
</Box>
```

### Progress bar safety
Always clamp the ratio before `String.repeat()`:
```ts
const ratio = Math.max(0, Math.min(1, 1 - current / total));
```
Phase transitions cause one render where `timeLeft > newPhase.duration`, making ratio negative.

### Color values
Ink accepts string color names: `"red"`, `"green"`, `"blue"`, `"cyan"`, `"yellow"`, `"white"`, `"gray"`.
Cast to `any` when passing dynamic color strings: `color={someVar as any}`.

## Extending the App

### Add a slash command
Edit `src/ui/screens/Menu.tsx` — add an entry to the `COMMANDS` array:
```ts
{ name: '/mycommand', description: 'What it does', action: () => { ... } }
```

### Add a new screen
1. Extend `type Screen` in `src/types.ts`
2. Add a conditional branch in `<Root>` rendering the new component
3. Pass `onExit: () => void` prop for navigating back to menu

### Plugin system
Built-in plugins live in `src/plugins/`; user plugins in `~/.pomodoro-cli/plugins/*.js|mjs` (same name replaces a built-in). A plugin default-exports an object/class with `name` and `apiVersion: PLUGIN_API_VERSION`.
- Hooks take a single context object (`{ settings, config }`, timer hooks add `{ phase, sessions }`), never positional args.
- Add a new hook to `PluginHooks` in `src/types.ts`; `HookPayload` typing makes `host.emit(...)` type-checked.
- `host.emit` is called from `TIMER_CALLBACKS` in `index.tsx`. Only active plugins (enabled and required config set) get hooks; `PluginHost` (`src/pluginHost.ts`) owns onInit/onExit/onConfigChange and `exit()` awaits onExit up to 3s.
- Breaking change for third-party plugins (changing hook signatures, removing hooks): bump `PLUGIN_API_VERSION` and use a `feat!:` commit. Adding optional hooks or context fields is non-breaking.
- Disabled names are stored in `~/.pomodoro-cli/plugins-disabled.json`; plugin config in `~/.pomodoro-cli/plugins/<name>.json`.
