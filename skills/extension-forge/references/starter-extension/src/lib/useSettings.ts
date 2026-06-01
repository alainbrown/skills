import { useCallback, useEffect, useState } from 'react';
import type { Settings } from './types';
import { getSettings, setSettings } from './chromeStorage';

// FORGE: React hook that loads settings, subscribes to cross-context changes,
// and exposes an updater. This is chrome.*-aware glue — it belongs in a
// Container, never in a pure component. Returns null until first load.
export function useSettings() {
  const [settings, setState] = useState<Settings | null>(null);

  useEffect(() => {
    let mounted = true;
    getSettings().then((s) => {
      if (mounted) setState(s);
    });
    const handler = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: chrome.storage.AreaName,
    ) => {
      if (area === 'sync' && changes.settings) {
        setState(changes.settings.newValue as Settings);
      }
    };
    chrome.storage.onChanged.addListener(handler);
    return () => {
      mounted = false;
      chrome.storage.onChanged.removeListener(handler);
    };
  }, []);

  const update = useCallback(
    async <K extends keyof Settings>(key: K, value: Settings[K]) => {
      await setSettings({ [key]: value } as Partial<Settings>);
    },
    [],
  );

  return [settings, update] as const;
}
