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
```

**Always run `npx tsc --noEmit` after changes and fix all errors before finishing.**

## Project Layout

```
index.tsx              Root component + screen routing
src/
  types.ts             PhaseName | shortBreak | longBreak, Phase, Settings, Command
  constants.ts         PHASES record, LONG_BREAK_INTERVAL = 4, VERSION
  utils.ts             formatTime(seconds), progressBar(current, total, width), capitalize(s)
  App.tsx              Timer screen
  Menu.tsx             Menu screen (slash commands + Dashboard)
  Dashboard.tsx        Two-column welcome panel
  Banner.tsx           ASCII art (unused in active flow)
  hooks/
    useTimer.ts        Timer state: phase, timeLeft, running, sessions + actions
  components/
    TimerCard.tsx      Phase label + MM:SS clock + progress bar
    SessionCounter.tsx Sessions count + next long break in N
    PhaseIndicators.tsx ● dots showing active phase
    Controls.tsx       Keyboard hints footer
    CommandPalette.tsx Filtered list of slash commands with keyboard nav
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
Edit `src/Menu.tsx` — add an entry to the `COMMANDS` array:
```ts
{ name: '/mycommand', description: 'What it does', action: () => { ... } }
```

### Add a new screen
1. Extend `type Screen` in `index.tsx`
2. Add a conditional branch in `<Root>` rendering the new component
3. Pass `onExit: () => void` prop for navigating back to menu

### Add a plugin hook
`useTimer` exposes: `{ phase, timeLeft, running, sessions, toggleRunning, resetPhase, skipPhase, jumpTo }`.
Wrap or extend the hook to inject side effects (sound, notifications, logging) without touching UI components.
