import React, { useState } from 'react';
import { render } from 'ink';
import Menu from './src/Menu.js';
import App from './src/App.js';

type Screen = 'menu' | 'timer';

function Root() {
  const [screen, setScreen] = useState<Screen>('menu');

  if (screen === 'timer') {
    return <App onExit={() => setScreen('menu')} />;
  }
  return <Menu onStart={() => setScreen('timer')} />;
}

render(<Root />);
