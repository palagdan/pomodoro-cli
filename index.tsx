import React, { useState } from 'react';
import { render } from 'ink';
import Menu from './src/ui/screens/Menu.js';
import App from './src/ui/screens/App.js';
import Settings from './src/ui/screens/Settings.js';
import PluginList from './src/ui/screens/PluginList.js';
import PluginConfig from './src/ui/screens/PluginConfig.js';
import { usePlugins } from './src/ui/hooks/usePlugins.js';
import type { Settings as SettingsType, PomodoroPlugin, Screen } from './src/types.js';
import { DEFAULT_SETTINGS } from './src/constants.js';

function Root() {
  const [screen, setScreen]             = useState<Screen>('menu');
  const [settings, setSettings]         = useState<SettingsType>(DEFAULT_SETTINGS);
  const [activePlugin, setActivePlugin] = useState<PomodoroPlugin | null>(null);
  const { plugins, enabled, pluginConfigs, emit, toggle, saveConfig } = usePlugins(settings);

  if (screen === 'timer') {
    return <App settings={settings} onExit={() => setScreen('menu')} emit={emit} />;
  }
  if (screen === 'settings') {
    return (
      <Settings
        settings={settings}
        onSave={s => { setSettings(s); emit('onSettingsChange', s); setScreen('menu'); }}
        onExit={() => setScreen('menu')}
      />
    );
  }
  if (screen === 'pluginConfig' && activePlugin) {
    return (
      <PluginConfig
        plugin={activePlugin}
        values={pluginConfigs[activePlugin.name] ?? {}}
        onSave={values => { saveConfig(activePlugin.name, values); setScreen('plugins'); }}
        onExit={() => setScreen('plugins')}
      />
    );
  }
  if (screen === 'plugins') {
    return (
      <PluginList
        plugins={plugins}
        enabled={enabled}
        pluginConfigs={pluginConfigs}
        onToggle={toggle}
        onConfigure={p => { setActivePlugin(p); setScreen('pluginConfig'); }}
        onExit={() => setScreen('menu')}
      />
    );
  }
  return (
    <Menu
      settings={settings}
      onStart={() => setScreen('timer')}
      onSettings={() => setScreen('settings')}
      onPlugins={() => setScreen('plugins')}
    />
  );
}

render(<Root />);
