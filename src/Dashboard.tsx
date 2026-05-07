import React from 'react';
import { Box, Text } from 'ink';
import os from 'os';
import { VERSION } from './constants.js';
import { capitalize } from './utils.js';
import type { Settings } from './types.js';

const TOMATO = [
  '      ██     ',
  '   ▄█████▄  ',
  '  ████████▌ ',
  '  ████████▌ ',
  '   ▀█████▀  ',
];

interface Props {
  settings: Settings;
}

export default function Dashboard({ settings }: Props) {
  const username = capitalize(os.userInfo().username);

  return (
    <Box
      borderStyle="round"
      borderColor="red"
      flexDirection="column"
      marginBottom={1}
      width={80}
    >
      {/* Title row */}
      <Box justifyContent="center" paddingY={0}>
        <Text bold color="red"> 🍅 Pomodoro CLI v{VERSION} </Text>
      </Box>

      {/* Horizontal divider under title */}
      <Box>
        <Text color="red">{'─'.repeat(76)}</Text>
      </Box>

      {/* Two-column content */}
      <Box>

        {/* Left column: welcome + tomato + settings */}
        <Box flexDirection="column" width={36} alignItems="center" paddingX={1} paddingY={1}>
          <Box marginBottom={1}>
            <Text bold>Welcome back </Text>
            <Text bold color="red">{username}</Text>
            <Text bold>!</Text>
          </Box>

          {TOMATO.map((line, i) => (
            <Text key={i} color="red">{line}</Text>
          ))}

          <Box marginTop={1} flexDirection="column" alignItems="center">
            <Text dimColor>
              <Text color="white">{settings.workMin}m</Text>
              {' work · '}
              <Text color="white">{settings.shortBreakMin}m</Text>
              {' short · '}
              <Text color="white">{settings.longBreakMin}m</Text>
              {' long'}
            </Text>
            <Text dimColor>
              {'long break every '}
              <Text color="white">{settings.longBreakEvery}</Text>
              {' sessions'}
            </Text>
          </Box>
        </Box>

        {/* Right column with left border acting as divider */}
        <Box
          flexDirection="column"
          flexGrow={1}
          paddingX={2}
          paddingY={1}
          borderStyle="single"
          borderColor="red"
          borderLeft={true}
          borderTop={false}
          borderBottom={false}
          borderRight={false}
        >
          <Text bold>Getting started</Text>
          <Text color="red">{'─'.repeat(28)}</Text>
          <Box marginTop={1} flexDirection="column" gap={1}>
            <Box>
              <Text color="cyan">/start  </Text>
              <Text dimColor>begin a focus session</Text>
            </Box>
            <Box>
              <Text color="cyan">/exit   </Text>
              <Text dimColor>quit the app</Text>
            </Box>
          </Box>
          <Box marginTop={2}>
            <Text dimColor>type </Text>
            <Text color="cyan">/</Text>
            <Text dimColor> in the prompt below</Text>
          </Box>
        </Box>

      </Box>
    </Box>
  );
}
