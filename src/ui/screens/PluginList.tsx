import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { PomodoroPlugin } from '../../types.js';

interface Props {
  plugins: PomodoroPlugin[];
  enabled: Set<string>;
  pluginConfigs: Record<string, Record<string, unknown>>;
  onToggle: (name: string) => void;
  onConfigure: (plugin: PomodoroPlugin) => void;
  onExit: () => void;
}

function configStatus(plugin: PomodoroPlugin, values: Record<string, unknown>): 'none' | 'ok' | 'needs-setup' {
  if (!plugin.config?.length) return 'none';
  const missing = plugin.config.filter(f => f.required && !values[f.key]);
  return missing.length > 0 ? 'needs-setup' : 'ok';
}

export default function PluginList({ plugins, enabled, pluginConfigs, onToggle, onConfigure, onExit }: Props) {
  const [cursor, setCursor] = useState(0);

  const hasConfigurablePlugin = plugins.some(p => p.config?.length);

  useInput((input, key) => {
    if (input === 'q' || key.escape) { onExit(); return; }
    if (key.upArrow)   setCursor(i => Math.max(0, i - 1));
    if (key.downArrow) setCursor(i => Math.min(Math.max(0, plugins.length - 1), i + 1));
    if (input === ' ' && plugins.length > 0) {
      const name = plugins[cursor]?.name;
      if (name) onToggle(name);
    }
    if (key.return && plugins.length > 0) {
      const p = plugins[cursor];
      if (p?.config?.length) onConfigure(p);
    }
  });

  return (
    <Box flexDirection="column" paddingY={1} paddingX={2}>
      <Box marginBottom={1}>
        <Text bold>Plugins</Text>
      </Box>

      {plugins.length === 0 ? (
        <Box marginBottom={1}>
          <Text dimColor>No plugins loaded. Drop .js or .mjs files into ~/.pomodoro-cli/plugins/ to add your own.</Text>
        </Box>
      ) : (
        plugins.map((p, i) => {
          const isEnabled = enabled.has(p.name);
          const isCursor  = i === cursor;
          const cfgValues = pluginConfigs[p.name] ?? {};
          const status    = configStatus(p, cfgValues);

          return (
            <Box key={p.name}>
              <Text color={isCursor ? 'cyan' : undefined}>{isCursor ? '▶ ' : '  '}</Text>
              <Text color={isEnabled ? 'green' : 'red'}>{isEnabled ? '✓' : '✗'}</Text>
              <Text> </Text>
              <Text bold={isCursor}>{p.name.padEnd(16)}</Text>
              <Text dimColor>{isEnabled ? 'active  ' : 'disabled'}</Text>
              {status === 'needs-setup' && <Text color={'yellow' as any}>  needs setup</Text>}
              {status === 'ok'          && <Text color={'green'  as any}>  configured</Text>}
              {p.builtin && <Text dimColor>  built-in</Text>}
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
