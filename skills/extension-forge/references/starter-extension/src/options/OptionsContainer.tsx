import { useCallback, useState } from 'react';
import type { Settings } from '../lib/types';
import { useSettings } from '../lib/useSettings';
import { Options } from './Options';

// Container: ALL chrome.* / storage wiring lives here. Renders pure <Options/>.
export function OptionsContainer() {
  const [settings, updateSetting] = useSettings();
  const [saved, setSaved] = useState(true);

  const onSettingChange = useCallback(
    <K extends keyof Settings>(key: K, value: Settings[K]) => {
      setSaved(false);
      void updateSetting(key, value).then(() => setSaved(true));
    },
    [updateSetting],
  );

  if (!settings) return null;

  return (
    <Options
      // FORGE: replace with the real product name.
      name="forge-extension"
      settings={settings}
      saved={saved}
      onSettingChange={onSettingChange}
    />
  );
}
