import React, { useState } from 'react';
import { render } from 'ink';
import Menu from './src/Menu.js';
import App from './src/App.js';
import Settings from './src/Settings.js';
import type { Settings as SettingsType } from './src/types.js';

type Screen = 'menu' | 'timer' | 'settings';

const DEFAULT_SETTINGS: SettingsType = {
  workMin: 25,
  shortBreakMin: 5,
  longBreakMin: 15,
  longBreakEvery: 4,
};

function Root() {
  const [screen, setScreen] = useState<Screen>('menu');
  const [settings, setSettings] = useState<SettingsType>(DEFAULT_SETTINGS);

  if (screen === 'timer') {
    return <App settings={settings} onExit={() => setScreen('menu')} />;
  }
  if (screen === 'settings') {
    return (
      <Settings
        settings={settings}
        onSave={s => { setSettings(s); setScreen('menu'); }}
        onExit={() => setScreen('menu')}
      />
    );
  }
  return (
    <Menu
      settings={settings}
      onStart={() => setScreen('timer')}
      onSettings={() => setScreen('settings')}
    />
  );
}

render(<Root />);
