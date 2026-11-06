import { useSyncExternalStore } from 'react';
import type { PluginEntry, PluginHost } from '../../pluginHost.js';

/** Re-renders whenever the host's plugin list, enabled state or config changes. */
export function usePlugins(host: PluginHost): readonly PluginEntry[] {
  return useSyncExternalStore(host.subscribe, host.getSnapshot);
}
