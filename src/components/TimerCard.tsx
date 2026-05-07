import React from 'react';
import { Box, Text } from 'ink';
import { PHASES } from '../constants.js';
import { formatTime, progressBar } from '../utils.js';
import type { PhaseName } from '../types.js';

interface Props {
  phase: PhaseName;
  timeLeft: number;
  running: boolean;
}

export default function TimerCard({ phase, timeLeft, running }: Props) {
  const currentPhase = PHASES[phase];
  const bar     = progressBar(timeLeft, currentPhase.duration);
  const percent = Math.round((1 - timeLeft / currentPhase.duration) * 100);

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
