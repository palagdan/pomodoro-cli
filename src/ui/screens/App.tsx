import React from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { PHASES } from '../../constants.js';
import TimerCard from '../components/TimerCard.js';
import SessionCounter from '../components/SessionCounter.js';
import PhaseIndicators from '../components/PhaseIndicators.js';
import Controls from '../components/Controls.js';
import type { Settings } from '../../types.js';
import type { Timer } from '../hooks/useTimer.js';

interface Props {
  settings: Settings;
  timer: Timer;
  onExit?: () => void;
}

export default function App({ settings, timer, onExit }: Props) {
  const { exit } = useApp();
  const { phase, timeLeft, running, sessions, toggleRunning, resetPhase, skipPhase, jumpTo } = timer;

  useInput(input => {
    if (input === 'q') onExit ? onExit() : exit();
    if (input === ' ')  toggleRunning();
    if (input === 'r')  resetPhase();
    if (input === 'n')  skipPhase();
    if (input === '1')  jumpTo('work');
    if (input === '2')  jumpTo('shortBreak');
    if (input === '3')  jumpTo('longBreak');
  });

  return (
    <Box flexDirection="column" alignItems="center" paddingY={1}>
      <Box marginBottom={1}>
        <Text bold color={PHASES[phase].color as any}>🍅 Pomodoro Timer</Text>
      </Box>

      <TimerCard phase={phase} timeLeft={timeLeft} running={running} settings={settings} />
      <SessionCounter sessions={sessions} longBreakEvery={settings.longBreakEvery} />
      <Controls running={running} hasBackButton={!!onExit} />
      <PhaseIndicators phase={phase} />
    </Box>
  );
}
