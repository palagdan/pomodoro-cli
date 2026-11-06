import React, { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { PluginEntry } from '../../pluginHost.js';

interface Props {
  entries: readonly PluginEntry[];
  onToggle: (entry: PluginEntry) => void;
  onConfigure: (entry: PluginEntry) => void;
  onExit: () => void;
  /** Plugin whose row the cursor should start on (e.g. after returning from its config screen). */
  initialName?: string;
}

export default function PluginList({ entries, onToggle, onConfigure, onExit, initialName }: Props) {
  const [cursor, setCursor] = useState(() => {
    const idx = initialName ? entries.findIndex(e => e.plugin.name === initialName) : -1;
    return idx >= 0 ? idx : 0;
  });

  const hasConfigurablePlugin = entries.some(e => e.plugin.config?.length);

  // Clamp the cursor if entries shrink
  useEffect(() => {
    setCursor(i => Math.min(i, Math.max(0, entries.length - 1)));
  }, [entries.length]);

  useInput((input, key) => {
    if (input === 'q' || key.escape) { onExit(); return; }
    if (key.upArrow)   setCursor(i => Math.max(0, i - 1));
    if (key.downArrow) setCursor(i => Math.min(Math.max(0, entries.length - 1), i + 1));
    const entry = entries[Math.min(cursor, entries.length - 1)];
    if (!entry) return;
    if (input === ' ') onToggle(entry);
    if (key.return && entry.plugin.config?.length) onConfigure(entry);
  });

  return (
    <Box flexDirection="column" paddingY={1} paddingX={2}>
      <Box marginBottom={1}>
        <Text bold>Plugins</Text>
      </Box>

      {entries.length === 0 ? (
        <Box marginBottom={1}>
          <Text dimColor>No plugins loaded. Drop .js or .mjs files into ~/.pomodoro-cli/plugins/ to add your own.</Text>
        </Box>
      ) : (
        entries.map((e, i) => {
          const isCursor = i === cursor;
          const p        = e.plugin;
          const hasCfg   = !!p.config?.length;
          const needs    = e.enabled && e.missing.length > 0;

          return (
            <Box key={p.name} flexDirection="column">
              <Box>
                <Text color={isCursor ? 'cyan' : undefined}>{isCursor ? '▶ ' : '  '}</Text>
                <Text color={e.enabled ? 'green' : 'red'}>{e.enabled ? '✓' : '✗'}</Text>
                <Text> </Text>
                <Text bold={isCursor}>{p.name.padEnd(16)}</Text>
                {e.active ? (
                  <Text color="green">active</Text>
                ) : !e.enabled ? (
                  <Text dimColor>disabled</Text>
                ) : (
                  <Text color="yellow">needs setup</Text>
                )}
                {hasCfg && !needs && e.missing.length === 0 && <Text color="green">  configured</Text>}
                {e.builtin && <Text dimColor>  built-in</Text>}
              </Box>
              {p.description && (
                <Box marginLeft={5}>
                  <Text dimColor>{p.description}</Text>
                </Box>
              )}
            </Box>
          );
        })
      )}

      <Box marginTop={1}>
        <Text dimColor>space toggle{hasConfigurablePlugin ? '   ↵ configure' : ''}   q back</Text>
      </Box>
    </Box>
  );
}
