import React from 'react';
import { Box, Text } from 'ink';
import type { Command } from '../../types.js';

// Names column is at least this wide so long command names fit, like Claude Code's menu.
const MIN_NAME_WIDTH = 24;

interface Props {
  commands: Command[];
  selectedIndex: number;
  nameWidth: number;
}

export default function CommandPalette({ commands, selectedIndex, nameWidth }: Props) {
  if (commands.length === 0) return null;

  return (
    <Box
      flexDirection="column"
      marginTop={1}
      borderStyle="round"
      borderColor="gray"
      paddingX={1}
      width={80}
    >
      {commands.map((cmd, i) => {
        const active = i === selectedIndex;
        return (
          <Box key={cmd.name}>
            <Text color={active ? 'cyan' : undefined} dimColor={!active}>
              {active ? '▶ ' : '  '}
            </Text>
            <Box width={Math.max(MIN_NAME_WIDTH, nameWidth)} flexShrink={0}>
              <Text bold={active} color={active ? 'cyan' : undefined}>
                {cmd.name}
              </Text>
            </Box>
            <Text dimColor>{cmd.description}</Text>
          </Box>
        );
      })}
      <Box marginTop={1} borderTop borderStyle="single" borderColor="gray" paddingX={1}>
        <Text dimColor>↑↓ navigate   ↵ run   tab complete</Text>
      </Box>
    </Box>
  );
}
