# pomodoro-cli

A minimalist Pomodoro timer for people who live in the terminal.

The interface is inspired by AI coding harnesses such as Claude Code and OpenAI's Codex CLI: one prompt, slash commands with a filterable palette, and clean bordered panels. No mouse, no clutter, just focus. Built with [Ink](https://github.com/vadimdemedes/ink).

## Install

```bash
npm install -g @your-scope/pomodoro-cli
pomodoro
```

Requires Node.js 20+.

> The package name is not final yet: the unscoped name `pomodoro-cli` is already taken on npm, so replace `@your-scope` with the actual scope once published.

## Usage

The menu is driven by slash commands:

| Command     | Action                |
|-------------|-----------------------|
| `/start`    | Start the timer       |
| `/settings` | Edit timer durations  |
| `/plugins`  | Manage plugins        |
| `/exit`     | Quit                  |

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

- `sound` - plays a macOS system sound when a phase starts (sounds are configurable).
- `desktop-notify` - shows a desktop notification when a phase ends (macOS and Linux).

Enable or disable plugins in `/plugins`.

### Custom plugins

Drop a `.js` or `.mjs` file into `~/.pomodoro-cli/plugins/`. The default export is a class or an object with a `name` (`[A-Za-z0-9._-]+`).

Available hooks (all optional):

- `onInit(settings)`
- `onPhaseStart(phase, settings)`
- `onPhaseEnd(phase, sessions, settings)`
- `onPhaseSkip(phase)`
- `onSettingsChange(settings)`

```js
// ~/.pomodoro-cli/plugins/hello.mjs
export default {
  name: 'hello',
  onPhaseEnd(phase, sessions) {
    console.error(`Finished ${phase} (sessions: ${sessions})`);
  },
};
```

A plugin can declare `config` fields (`{ key, label, type: 'string' | 'number' | 'boolean', default, hint, ... }`) and a `configure(values)` method that receives the saved values. They can be edited from `/plugins`, and are stored in `~/.pomodoro-cli/plugins/<name>.json`.

## Development

```bash
npm install
npm start            # run the app
npm run dev          # run with file watching
npm run typecheck    # type-check
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

## License

ISC
