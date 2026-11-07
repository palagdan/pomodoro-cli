# Changelog

All notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

## [1.1.0](https://github.com/palagdan/pomodoro-cli/compare/v1.0.1...v1.1.0) (2026-11-07)

### Features

* support Windows in built-in plugins and CI ([24b37eb](https://github.com/palagdan/pomodoro-cli/commit/24b37eb805bf8d6663d4b6cd6405a92aae18c331))

### Documentation

* add demo GIF recorded with VHS ([0bf4dd0](https://github.com/palagdan/pomodoro-cli/commit/0bf4dd05cccb41c6a37fe92315c8d5560922d179))
* add Windows install guide ([596d031](https://github.com/palagdan/pomodoro-cli/commit/596d0317c5613e66c8f586f393ce5a771dc887c5))

## [1.0.1](https://github.com/palagdan/pomodoro-cli/compare/v1.0.0...v1.0.1) (2026-11-07)

## 1.0.0 (2026-11-06)

### Features

* add settings screen with configurable timer durations ([e4c960f](https://github.com/palagdan/pomodoro-cli/commit/e4c960f2e457b0837a7ec3b344f067cfd6d0db37))
* add slash-command menu, dashboard, and component refactor ([f76b0aa](https://github.com/palagdan/pomodoro-cli/commit/f76b0aae26a2725ff01ee44db7cf79be261fc3ab))
* **dashboard:** list all slash commands ([867b8f1](https://github.com/palagdan/pomodoro-cli/commit/867b8f10ce1a6679d56bb99a4a1494d27fec0d87))
* **plugins:** add session-log plugin with /history and /stats ([121655f](https://github.com/palagdan/pomodoro-cli/commit/121655ff19f8d1c7f3865b3399deac9b5df6fcbb))
* **plugins:** let plugins add slash commands ([0482ab4](https://github.com/palagdan/pomodoro-cli/commit/0482ab4b71af650de84f8a41bec1db61ca5be994))
* **plugins:** plugin API v1 with context hooks and lifecycle ([6c27ac5](https://github.com/palagdan/pomodoro-cli/commit/6c27ac524d9c09f9ddec62ee5a332be785ac2095))

### Bug Fixes

* clamp timer percentage during phase transitions ([94e2e47](https://github.com/palagdan/pomodoro-cli/commit/94e2e47c3c7fee845bb0ef2e446f7905e0abaac3))
* **dashboard:** drop emoji from framed title to keep borders aligned ([7dad986](https://github.com/palagdan/pomodoro-cli/commit/7dad9861539a95952475aab5ca23425581284ca6))
* **dashboard:** stretch title divider to the full frame width ([795a162](https://github.com/palagdan/pomodoro-cli/commit/795a16290e65c820559320801ed581cb18599430))
* persist settings and keep timer state across screens ([a94f7e8](https://github.com/palagdan/pomodoro-cli/commit/a94f7e8d30c0b507bf82b5b8005c1581741b81d6))
* **plugins:** avoid shell injection in sound and desktop-notify ([59cc8fc](https://github.com/palagdan/pomodoro-cli/commit/59cc8fc9244dbea7802bb5a242137aae9aefb278))
* **plugins:** bind plugin hooks to their instance and log errors via console ([2208831](https://github.com/palagdan/pomodoro-cli/commit/220883169bfcf6dbc4768322148c8774ea7650f7))
* **plugins:** enable newly discovered plugins and use file URLs for import ([28891bf](https://github.com/palagdan/pomodoro-cli/commit/28891bf06006adc02e42685774ed57dc65ed18c3))
* **plugins:** load plugin files in a stable order ([06d6990](https://github.com/palagdan/pomodoro-cli/commit/06d69903bdf03a68f67ec969cc2344346fb13d94))
* prevent double command execution on Enter in menu ([9851761](https://github.com/palagdan/pomodoro-cli/commit/9851761bc519c44aaafa007a462c705787e9d864))
* **timer:** keep tick updater pure and fire onPhaseStart for first phase ([e2e8547](https://github.com/palagdan/pomodoro-cli/commit/e2e8547adccec45c4f746945e96a14a3737f769c))
* **timer:** reset time left in the same render as the phase change ([34b61ce](https://github.com/palagdan/pomodoro-cli/commit/34b61ce4117d9ab3ad1297268d62e980e46a595c))
* use .js extensions on local ESM imports ([b3af4be](https://github.com/palagdan/pomodoro-cli/commit/b3af4be8260f1259e14794f5f26b57bc34164a4b))
* validate required plugin config fields before saving ([193a788](https://github.com/palagdan/pomodoro-cli/commit/193a788c14ee05b291c0122d36a26b6950496db8))

### Refactoring

* move UI into src/ui, add plugin system and plugin screens ([930561b](https://github.com/palagdan/pomodoro-cli/commit/930561bddb9b34d621427752bb05eaea6b78e910))

### Documentation

* add README with install, usage, plugin and release guide ([2a3761c](https://github.com/palagdan/pomodoro-cli/commit/2a3761c2ab6135b6e781cae6c38f5818dafd15f8))
* **agents:** document build and release workflow ([54d6a46](https://github.com/palagdan/pomodoro-cli/commit/54d6a46b1a5fd79dbda4d830ff96522cbecec076))
* describe the test suite and testing conventions ([1d347ca](https://github.com/palagdan/pomodoro-cli/commit/1d347ca7e50a5441cbc2964160c393ad91db8d81))
* document plugin API v1 for plugin authors and contributors ([2a9e239](https://github.com/palagdan/pomodoro-cli/commit/2a9e23950ee5ba5959576188f3d1a4d64ca7f8b8))
* document plugin commands and the session-log plugin ([b7910ba](https://github.com/palagdan/pomodoro-cli/commit/b7910bae4a8d030cd07ab57a4bcb30fde0bcb637))
* **readme:** describe minimalist design and its inspiration ([77bda3d](https://github.com/palagdan/pomodoro-cli/commit/77bda3d75e8a8235df71d058f02df9dfd75b74d0))
* update AGENTS.md layout and package.json metadata ([c516169](https://github.com/palagdan/pomodoro-cli/commit/c516169b5108952b4ffc1aa26c5589ac1fc9bfe9))
