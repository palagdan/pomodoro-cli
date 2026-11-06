import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import type { PomodoroPlugin, PluginConfigField } from '../../types.js';

interface Props {
  plugin: PomodoroPlugin;
  values: Record<string, unknown>;
  onSave: (values: Record<string, unknown>) => void;
  onExit: () => void;
}

type FormMode = 'navigate' | 'editing';

function initDraft(fields: PluginConfigField[], saved: Record<string, unknown>): Record<string, unknown> {
  const draft: Record<string, unknown> = {};
  for (const f of fields) {
    if (saved[f.key] !== undefined) {
      draft[f.key] = saved[f.key];
    } else if (f.default !== undefined) {
      draft[f.key] = f.default;
    } else {
      draft[f.key] = f.type === 'number' ? (f.min ?? 0) : f.type === 'boolean' ? false : '';
    }
  }
  return draft;
}

export default function PluginConfig({ plugin, values, onSave, onExit }: Props) {
  const fields = plugin.config ?? [];
  const [cursor, setCursor]       = useState(0);
  const [mode, setMode]           = useState<FormMode>('navigate');
  const [draft, setDraft]         = useState<Record<string, unknown>>(() => initDraft(fields, values));
  const [editValue, setEditValue] = useState('');

  const field = fields[cursor];

  function adjustNumber(delta: number) {
    if (!field || field.type !== 'number') return;
    const current = Number(draft[field.key] ?? 0);
    const step    = field.step ?? 1;
    const min     = field.min ?? -Infinity;
    const max     = field.max ?? Infinity;
    setDraft(d => ({ ...d, [field.key]: Math.min(max, Math.max(min, current + delta * step)) }));
  }

  // Navigation mode — arrows, adjustments, save, enter-to-edit
  useInput((input, key) => {
    if (input === 'q' || key.escape) { onExit(); return; }
    if (key.upArrow)   setCursor(i => Math.max(0, i - 1));
    if (key.downArrow) setCursor(i => Math.min(fields.length - 1, i + 1));

    if (field?.type === 'number') {
      if (key.leftArrow || input === '-')                    adjustNumber(-1);
      if (key.rightArrow || input === '+' || input === '=')  adjustNumber(+1);
    }
    if (field?.type === 'boolean' && (key.return || input === ' ')) {
      setDraft(d => ({ ...d, [field.key]: !d[field.key] }));
    }
    if (field?.type === 'string' && key.return) {
      setEditValue(String(draft[field.key] ?? ''));
      setMode('editing');
    }
    if (input === 's') {
      onSave(draft);
    }
  }, { isActive: mode === 'navigate' });

  // Edit mode — only Escape cancels; TextInput handles Enter via onSubmit
  useInput((_input, key) => {
    if (key.escape) setMode('navigate');
  }, { isActive: mode === 'editing' });

  const hasNumbers = fields.some(f => f.type === 'number');

  return (
    <Box flexDirection="column" alignItems="center" paddingY={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">{plugin.name} — Configure</Text>
      </Box>

      <Box
        borderStyle="round"
        borderColor="cyan"
        flexDirection="column"
        width={50}
        paddingX={2}
        paddingY={1}
      >
        {fields.length === 0 ? (
          <Text dimColor>This plugin has no configuration fields.</Text>
        ) : (
          fields.map((f, i) => {
            const active = i === cursor;
            const value  = draft[f.key];

            return (
              <Box key={f.key} flexDirection="column" marginBottom={1}>
                <Box>
                  <Text color={active ? 'cyan' : undefined}>{active ? '▶ ' : '  '}</Text>
                  <Text bold={active} color={active ? 'cyan' : undefined}>{f.label}</Text>
                  {f.required && <Text color="red"> *</Text>}
                </Box>

                <Box marginLeft={4}>
                  {f.type === 'string' && active && mode === 'editing' ? (
                    <Box>
                      <Text color="green">❯ </Text>
                      <TextInput
                        value={editValue}
                        onChange={setEditValue}
                        onSubmit={val => {
                          setDraft(d => ({ ...d, [f.key]: val }));
                          setMode('navigate');
                        }}
                      />
                    </Box>
                  ) : f.type === 'string' ? (
                    String(value) ? (
                      <Text color={active ? 'white' : 'gray'}>{String(value)}</Text>
                    ) : (
                      <Text dimColor>{f.hint ?? '(not set)'}</Text>
                    )
                  ) : f.type === 'number' ? (
                    <Box>
                      {active && <Text dimColor>◀ </Text>}
                      <Text bold={active} color={active ? 'white' : 'gray'}>{String(value)}</Text>
                      {active && <Text dimColor> ▶</Text>}
                    </Box>
                  ) : (
                    <Text color={value ? 'green' : 'gray'}>{value ? '[x]' : '[ ]'} {f.hint ?? ''}</Text>
                  )}
                </Box>
              </Box>
            );
          })
        )}
      </Box>

      <Box marginTop={1} flexDirection="column" alignItems="center">
        {hasNumbers && <Text dimColor>←→ or +/- adjust numbers</Text>}
        <Text dimColor>↑↓ navigate   ↵ edit/toggle   s save   q discard</Text>
      </Box>
    </Box>
  );
}
