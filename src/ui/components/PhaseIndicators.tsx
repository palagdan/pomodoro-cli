import React from 'react';
import { Box, Text } from 'ink';
import { PHASES } from '../../constants.js';
import type { PhaseName } from '../../types.js';

const LABELS: Record<PhaseName, string> = {
  work:       '● Focus',
  shortBreak: '● Short',
  longBreak:  '● Long',
};

interface Props {
  phase: PhaseName;
}

export default function PhaseIndicators({ phase }: Props) {
  return (
    <Box marginTop={1}>
      {(Object.keys(PHASES) as PhaseName[]).map(p => (
        <Box key={p} marginX={1}>
          <Text
            color={p === phase ? (PHASES[p].color as any) : undefined}
            dimColor={p !== phase}
          >
            {LABELS[p]}
          </Text>
        </Box>
      ))}
    </Box>
  );
}
