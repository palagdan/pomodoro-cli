import { useState, useEffect, useCallback } from 'react';
import { loadPlugins, loadEnabledSet, saveEnabledPlugins, loadPluginConfig, savePluginConfig } from '../../plugins.js';
import type { PomodoroPlugin, Settings } from '../../types.js';

export type PluginEmit = (event: string, ...args: unknown[]) => void;

function callHandler(plugin: PomodoroPlugin, event: string, args: unknown[]): void {
  const handler = (plugin as unknown as Record<string, unknown>)[event];
  if (typeof handler !== 'function') return;
  try {
    Promise.resolve((handler as (...a: unknown[]) => unknown).apply(plugin, args)).catch(err => {
      console.error(`[${plugin.name}] ${event} error: ${err}`);
    });
  } catch (err) {
    console.error(`[${plugin.name}] ${event} error: ${err}`);
  }
}

export function usePlugins(settings: Settings) {
  const [plugins, setPlugins]           = useState<PomodoroPlugin[]>([]);
  const [enabled, setEnabled]           = useState<Set<string>>(new Set());
  const [pluginConfigs, setPluginConfigs] = useState<Record<string, Record<string, unknown>>>({});

  useEffect(() => {
    loadPlugins().then(loaded => {
      const enabledSet = loadEnabledSet(loaded);

      // Load each plugin's saved config and call configure() so plugins initialise their state
      const configs: Record<string, Record<string, unknown>> = {};
      for (const p of loaded) {
        if (p.config?.length) {
          const values = loadPluginConfig(p.name);
          configs[p.name] = values;
          try { p.configure?.(values); } catch (err) {
            console.error(`[${p.name}] configure error: ${err}`);
          }
        }
      }

      setPluginConfigs(configs);
      setPlugins(loaded);
      setEnabled(enabledSet);

      for (const p of loaded) {
        if (enabledSet.has(p.name)) {
          callHandler(p, 'onInit', [settings]);
        }
      }
    });
  // Only run once on mount — settings at init time is intentional
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emit: PluginEmit = useCallback((event, ...args) => {
    for (const p of plugins) {
      if (!enabled.has(p.name)) continue;
      callHandler(p, event, args);
    }
  }, [plugins, enabled]);

  const toggle = useCallback((name: string) => {
    setEnabled(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      saveEnabledPlugins(next, plugins);
      return next;
    });
  }, [plugins]);

  const saveConfig = useCallback((name: string, values: Record<string, unknown>) => {
    savePluginConfig(name, values);
    setPluginConfigs(prev => ({ ...prev, [name]: values }));
    const plugin = plugins.find(p => p.name === name);
    try { plugin?.configure?.(values); } catch (err) {
      console.error(`[${name}] configure error: ${err}`);
    }
  }, [plugins]);

  return { plugins, enabled, pluginConfigs, emit, toggle, saveConfig };
}
