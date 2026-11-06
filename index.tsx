#!/usr/bin/env node
import React, { useState } from 'react';
import { render } from 'ink';
import Menu from './src/ui/screens/Menu.js';
import CommandOutput from './src/ui/screens/CommandOutput.js';
import App from './src/ui/screens/App.js';
import Settings from './src/ui/screens/Settings.js';
import PluginList from './src/ui/screens/PluginList.js';
import PluginConfig from './src/ui/screens/PluginConfig.js';
import { usePlugins } from './src/ui/hooks/usePlugins.js';
import { PluginHost, type PluginEntry } from './src/pluginHost.js';
import { useTimer } from './src/ui/hooks/useTimer.js';
import { loadSettings, saveSettings } from './src/storage.js';
import type { Settings as SettingsType, PhaseInfo, Screen } from './src/types.js';

const initialSettings = loadSettings();
const host = new PluginHost(initialSettings);
await host.load();

const phaseEvent = (event: 'onPhaseChange' | 'onTimerStart' | 'onPause' | 'onResume' | 'onReset' | 'onPhaseEnd' | 'onPhaseSkip') =>
  (info: PhaseInfo) => host.emit(event, info);

// Stable across renders: forwards every timer event to the plugins
const TIMER_CALLBACKS = {
  onPhaseChange: phaseEvent('onPhaseChange'),
  onTimerStart:  phaseEvent('onTimerStart'),
  onPause:       phaseEvent('onPause'),
  onResume:      phaseEvent('onResume'),
  onReset:       phaseEvent('onReset'),
  onPhaseEnd:    phaseEvent('onPhaseEnd'),
  onPhaseSkip:   phaseEvent('onPhaseSkip'),
};

function Root() {
  const [screen, setScreen]           = useState<Screen>('menu');
  const [settings, setSettings]       = useState<SettingsType>(initialSettings);
  const [activeName, setActiveName]   = useState<string | null>(null);
  const [command, setCommand]     = useState<string | null>(null);
  const plugins = usePlugins(host);
  const pluginCommands = host.commands(plugins);
  const activeEntry = plugins.find(e => e.plugin.name === activeName);

  // Timer lives here so sessions and the running countdown survive screen changes
  const timer = useTimer(settings, TIMER_CALLBACKS);

  if (screen === 'timer') {
    return <App settings={settings} timer={timer} onExit={() => setScreen('menu')} />;
  }
  if (screen === 'settings') {
    return (
      <Settings
        settings={settings}
        onSave={s => { setSettings(s); saveSettings(s); host.updateSettings(s); setScreen('menu'); }}
        onExit={() => setScreen('menu')}
      />
    );
  }
  if (screen === 'pluginConfig' && activeEntry) {
    return (
      <PluginConfig
        plugin={activeEntry.plugin}
        values={activeEntry.config}
        onSave={values => { host.saveConfig(activeEntry.plugin.name, values); setScreen('plugins'); }}
        onExit={() => setScreen('plugins')}
      />
    );
  }
  if (screen === 'command' && command) {
    return (
      <CommandOutput
        key={command}
        title={'/' + command}
        load={() => host.runCommand(command)}
        onExit={() => setScreen('menu')}
      />
    );
  }
  if (screen === 'plugins') {
    return (
      <PluginList
        entries={plugins}
        onToggle={(entry: PluginEntry) => host.setEnabled(entry.plugin.name, !entry.enabled)}
        onConfigure={(entry: PluginEntry) => { setActiveName(entry.plugin.name); setScreen('pluginConfig'); }}
        onExit={() => setScreen('menu')}
        initialName={activeName ?? undefined}
      />
    );
  }
  return (
    <Menu
      settings={settings}
      onStart={() => setScreen('timer')}
      onSettings={() => setScreen('settings')}
      onPlugins={() => setScreen('plugins')}
      pluginCommands={pluginCommands}
      onPluginCommand={name => { setCommand(name); setScreen('command'); }}
    />
  );
}

const app = render(<Root />);
await app.waitUntilExit();
await host.exit();
// Plugins may leave timers or sockets open — don't let them keep the process alive
process.exit(0);
