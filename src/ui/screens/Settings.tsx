import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { Settings } from '../../types.js';

interface Field {
  key: keyof Settings;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
}

const FIELDS: Field[] = [
  { key: 'workMin',        label: 'Work duration',    unit: 'min',      min: 1, max: 90, step: 1 },
  { key: 'shortBreakMin',  label: 'Short break',      unit: 'min',      min: 1, max: 30, step: 1 },
  { key: 'longBreakMin',   label: 'Long break',       unit: 'min',      min: 1, max: 60, step: 1 },
  { key: 'longBreakEvery', label: 'Long break every', unit: 'sessions', min: 1, max: 10, step: 1 },
];

interface Props {
  settings: Settings;
  onSave: (s: Settings) => void;
  onExit: () => void;
}

export default function SettingsScreen({ settings, onSave, onExit }: Props) {
  const [draft, setDraft] = useState<Settings>({ ...settings });
  const [cursor, setCursor] = useState(0);

  function adjust(delta: number) {
    const field = FIELDS[cursor]!;
    const current = draft[field.key];
    const next = Math.min(field.max, Math.max(field.min, current + delta * field.step));
    setDraft(d => ({ ...d, [field.key]: next }));
  }

  useInput((input, key) => {
    if (key.upArrow)    setCursor(i => Math.max(0, i - 1));
    if (key.downArrow)  setCursor(i => Math.min(FIELDS.length - 1, i + 1));
    if (key.leftArrow)  adjust(-1);
    if (key.rightArrow) adjust(+1);
    if (input === '-')  adjust(-1);
    if (input === '+' || input === '=') adjust(+1);
    if (key.return)     onSave(draft);
    if (input === 'q' || key.escape) onExit();
  });

  return (
    <Box flexDirection="column" alignItems="center" paddingY={1}>
      <Box marginBottom={1}>
        <Text bold color="red">⚙  Timer Settings</Text>
      </Box>

      <Box
        borderStyle="round"
        borderColor="red"
        flexDirection="column"
        width={44}
        paddingX={2}
        paddingY={1}
      >
        {FIELDS.map((field, i) => {
          const active = i === cursor;
          const value  = draft[field.key];
          return (
            <Box key={field.key} marginY={0}>
              <Text color={active ? 'cyan' : undefined} dimColor={!active}>
                {active ? '▶ ' : '  '}
              </Text>
              <Box flexGrow={1}>
                <Text bold={active} color={active ? 'cyan' : undefined}>
                  {field.label}
                </Text>
              </Box>
              <Box>
                <Text dimColor={!active}>{active ? '◀ ' : '  '}</Text>
                <Text bold color={active ? 'white' : 'gray'}>{String(value).padStart(2)}</Text>
                <Text dimColor> {field.unit}</Text>
                <Text dimColor={!active}>{active ? ' ▶' : '  '}</Text>
              </Box>
            </Box>
          );
        })}
      </Box>

      <Box marginTop={1} flexDirection="column" alignItems="center">
        <Text dimColor>↑↓ navigate   ←→ or +/- adjust</Text>
        <Text dimColor>↵ save and return   [q] discard</Text>
      </Box>
    </Box>
  );
}
