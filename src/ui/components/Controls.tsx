import React from 'react';
import { Box, Text } from 'ink';

interface Props {
  running: boolean;
  hasBackButton?: boolean;
}

export default function Controls({ running, hasBackButton = false }: Props) {
  return (
    <Box marginTop={1} flexDirection="column" alignItems="center">
      <Text dimColor>
        {running ? '⏸  [space] pause' : '▶  [space] start'}
        {'   [r] reset   [n] skip'}
      </Text>
      <Text dimColor>
        {'[1] focus   [2] short break   [3] long break   [q] '}
        {hasBackButton ? 'back to menu' : 'quit'}
      </Text>
    </Box>
  );
}
