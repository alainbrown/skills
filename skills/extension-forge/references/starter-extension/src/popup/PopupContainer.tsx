import { useCallback } from 'react';
import { useSettings } from '../lib/useSettings';
import { buildGreeting } from '../lib/greeting';
import { Popup } from './Popup';

// Container: ALL chrome.* / storage / messaging wiring lives here. It reads
// state via hooks, computes derived view-model values with PURE helpers, and
// renders the pure <Popup/>. No presentation logic belongs in this file.
export function PopupContainer() {
  const [settings, updateSetting] = useSettings();

  const onToggleEnabled = useCallback(
    (next: boolean) => {
      void updateSetting('enabled', next);
    },
    [updateSetting],
  );

  const onOpenSettings = useCallback(() => {
    chrome.runtime.openOptionsPage();
  }, []);

  // Render nothing until settings have loaded from chrome.storage.
  if (!settings) return null;

  return (
    <Popup
      // FORGE: replace 'forge-extension' with the real product name.
      name="forge-extension"
      greeting={buildGreeting(settings.label, settings.enabled)}
      enabled={settings.enabled}
      onToggleEnabled={onToggleEnabled}
      onOpenSettings={onOpenSettings}
    />
  );
}
