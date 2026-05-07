import React, { useState } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import TextInput from 'ink-text-input';
import Dashboard from './Dashboard.js';
import CommandPalette from './components/CommandPalette.js';
import type { Command, Settings } from './types.js';

interface Props {
  settings: Settings;
  onStart: () => void;
  onSettings: () => void;
}

export default function Menu({ settings, onStart, onSettings }: Props) {
  const { exit } = useApp();
  const [value, setValue] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const COMMANDS: Command[] = [
    { name: '/start',    description: 'Start the Pomodoro timer',  action: onStart    },
    { name: '/settings', description: 'Configure timer durations', action: onSettings },
    { name: '/exit',     description: 'Exit the app',              action: exit       },
  ];

  const isSlashMode = value.startsWith('/');
  const query = value.slice(1).toLowerCase();
  const filtered = isSlashMode
    ? COMMANDS.filter(c => c.name.slice(1).startsWith(query))
    : [];

  const safeIndex = Math.min(selectedIndex, Math.max(0, filtered.length - 1));

  useInput((_input, key) => {
    if (!isSlashMode || filtered.length === 0) return;
    if (key.upArrow)   setSelectedIndex(i => Math.max(0, i - 1));
    if (key.downArrow) setSelectedIndex(i => Math.min(filtered.length - 1, i + 1));
    if (key.return)    filtered[safeIndex]?.action();
    if (key.tab) { setValue(filtered[safeIndex]?.name ?? value); setSelectedIndex(0); }
  });

  function handleChange(val: string) {
    setValue(val);
    setSelectedIndex(0);
  }

  function handleSubmit(val: string) {
    const match = COMMANDS.find(c => c.name === val.trim());
    if (match) match.action();
  }

  return (
    <Box flexDirection="column" paddingY={1} paddingX={2}>
      <Dashboard settings={settings} />

      <Box>
        <Text color="green">❯ </Text>
        <TextInput
          value={value}
          onChange={handleChange}
          onSubmit={handleSubmit}
          placeholder="Type a command…"
        />
      </Box>

      {isSlashMode && filtered.length > 0 && (
        <CommandPalette commands={filtered} selectedIndex={safeIndex} />
      )}

      {isSlashMode && filtered.length === 0 && (
        <Box marginTop={1}>
          <Text dimColor>No matching commands for </Text>
          <Text color="yellow">{value}</Text>
        </Box>
      )}
    </Box>
  );
}
