import React from 'react';
import { Box, Text } from 'ink';
import type { Command } from '../../types.js';

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
      width={44}
    >
      {commands.map((cmd, i) => {
        const active = i === selectedIndex;
        return (
          <Box key={cmd.name}>
            <Text color={active ? 'cyan' : undefined} dimColor={!active}>
              {active ? '▶ ' : '  '}
            </Text>
            <Box width={nameWidth} flexShrink={0}>
              <Text bold={active} color={active ? 'cyan' : undefined}>
                {cmd.name}
              </Text>
            </Box>
            <Text dimColor>{cmd.description}</Text>
          </Box>
        );
      })}
      <Box marginTop={1} borderTop borderStyle="single" borderColor="gray">
        <Text dimColor>↑↓ navigate   ↵ run   tab complete</Text>
      </Box>
    </Box>
  );
}
