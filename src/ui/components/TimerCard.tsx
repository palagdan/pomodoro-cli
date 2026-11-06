import React from 'react';
import { Box, Text } from 'ink';
import { PHASES } from '../../constants.js';
import { formatTime, progressBar } from '../../utils.js';
import { buildDurations } from '../hooks/useTimer.js';
import type { PhaseName, Settings } from '../../types.js';

interface Props {
  phase: PhaseName;
  timeLeft: number;
  running: boolean;
  settings: Settings;
}

export default function TimerCard({ phase, timeLeft, running, settings }: Props) {
  const currentPhase = PHASES[phase];
  const total   = buildDurations(settings)[phase];
  const bar     = progressBar(timeLeft, total);
  const percent = Math.max(0, Math.min(100, Math.round((1 - timeLeft / total) * 100)));

  return (
    <Box
      borderStyle="round"
      borderColor={currentPhase.color as any}
      paddingX={4}
      paddingY={1}
      flexDirection="column"
      alignItems="center"
      width={44}
    >
      <Text bold color={currentPhase.color as any}>{currentPhase.label.toUpperCase()}</Text>

      <Box marginY={1}>
        <Text bold color={running ? 'white' : 'gray'}>{formatTime(timeLeft)}</Text>
      </Box>

      <Text color={currentPhase.color as any}>{bar}</Text>
      <Text dimColor>{percent}%</Text>
    </Box>
  );
}
