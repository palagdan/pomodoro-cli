import React from 'react';
import { Box, Text } from 'ink';
import { LONG_BREAK_INTERVAL } from '../constants.js';

interface Props {
  sessions: number;
}

export default function SessionCounter({ sessions }: Props) {
  const toNextLong = LONG_BREAK_INTERVAL - (sessions % LONG_BREAK_INTERVAL);
  return (
    <Box marginTop={1}>
      <Text dimColor>Sessions completed: </Text>
      <Text bold color="yellow">{sessions}</Text>
      <Text dimColor>  (next long break in </Text>
      <Text bold color="cyan">{toNextLong}</Text>
      <Text dimColor>)</Text>
    </Box>
  );
}
