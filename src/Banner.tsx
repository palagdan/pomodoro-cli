import React from 'react';
import { Box, Text } from 'ink';

const ART = [
  ' ██████╗  ██████╗ ███╗   ███╗ ██████╗ ██████╗  ██████╗ ██████╗  ██████╗ ',
  ' ██╔══██╗██╔═══██╗████╗ ████║██╔═══██╗██╔══██╗██╔═══██╗██╔══██╗██╔═══██╗',
  ' ██████╔╝██║   ██║██╔████╔██║██║   ██║██║  ██║██║   ██║██████╔╝██║   ██║',
  ' ██╔═══╝ ██║   ██║██║╚██╔╝██║██║   ██║██║  ██║██║   ██║██╔══██╗██║   ██║',
  ' ██║     ╚██████╔╝██║ ╚═╝ ██║╚██████╔╝██████╔╝╚██████╔╝██║  ██║╚██████╔╝',
  ' ╚═╝      ╚═════╝ ╚═╝     ╚═╝ ╚═════╝ ╚═════╝  ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ',
];

const WIDTH = ART[0].length;

export default function Banner() {
  return (
    <Box flexDirection="column" marginBottom={1}>
      {ART.map((line, i) => (
        <Text key={i} color="red">{line}</Text>
      ))}

      {/* Tagline centered under the art */}
      <Box justifyContent="center" width={WIDTH}>
        <Text dimColor>🍅  Focus CLI — type </Text>
        <Text color="cyan">/</Text>
        <Text dimColor> to get started</Text>
      </Box>
    </Box>
  );
}
