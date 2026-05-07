import React from 'react';
import { Box, Text } from 'ink';

interface Props {
  sessions: number;
  longBreakEvery: number;
}

export default function SessionCounter({ sessions, longBreakEvery }: Props) {
  const toNextLong = longBreakEvery - (sessions % longBreakEvery);
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
