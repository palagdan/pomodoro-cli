import React from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { PHASES } from '../../constants';
import { useTimer } from '../hooks/useTimer';
import TimerCard from '../components/TimerCard';
import SessionCounter from '../components/SessionCounter';
import PhaseIndicators from '../components/PhaseIndicators';
import Controls from '../components/Controls';
import type { Settings, PhaseName } from '../../types';
import type { PluginEmit } from '../hooks/usePlugins';

interface Props {
  settings: Settings;
  onExit?: () => void;
  emit?: PluginEmit;
}

export default function App({ settings, onExit, emit }: Props) {
  const { exit } = useApp();
  const { phase, timeLeft, running, sessions, toggleRunning, resetPhase, skipPhase, jumpTo } = useTimer(settings, {
    onPhaseStart: (p: PhaseName) => emit?.('onPhaseStart', p, settings),
    onPhaseEnd:   (p: PhaseName, s: number) => emit?.('onPhaseEnd', p, s, settings),
    onPhaseSkip:  (p: PhaseName) => emit?.('onPhaseSkip', p),
  });

  useInput((input, key) => {
    if (input === 'q' || (key.ctrl && input === 'c')) onExit ? onExit() : exit();
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
