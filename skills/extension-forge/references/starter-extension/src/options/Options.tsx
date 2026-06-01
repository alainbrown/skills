import type { Settings } from '../lib/types';
import { Switch } from '../components/Switch';
import { Wordmark } from '../components/Wordmark';

// PURE presentational view. Takes ALL data and callbacks via props; contains
// NO chrome.* calls. OptionsContainer wires storage and renders this. The demo
// reuses it with mock props — keep it free of side effects.
export interface OptionsProps {
  name: string;
  settings: Settings;
  saved: boolean;
  // FORGE: generic setting-change callback; the container persists it.
  onSettingChange: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
}

export function Options(props: OptionsProps) {
  const { name, settings, saved, onSettingChange } = props;

  return (
    <div className="options">
      <header className="top">
        <Wordmark name={name} size="lg" version="0.1" />
        <span className={`saved${saved ? '' : ' dirty'}`}>
          {saved ? 'saved' : 'saving…'}
        </span>
      </header>

      <main className="panels">
        <section className="panel">
          <h2>General</h2>

          <div className="field-row">
            <div className="field-label">
              <span className="label">Enabled</span>
              <span className="sub">Turn the extension on or off.</span>
            </div>
            <Switch
              on={settings.enabled}
              onChange={(next) => onSettingChange('enabled', next)}
            />
          </div>

          <div className="field-col">
            <label className="label" htmlFor="label-input">
              Display label
            </label>
            <input
              id="label-input"
              className="text-input"
              placeholder="your name…"
              value={settings.label}
              onChange={(e) => onSettingChange('label', e.target.value)}
            />
          </div>
        </section>
      </main>

      <footer className="foot">
        <span className="ver">build 0.1.0</span>
      </footer>
    </div>
  );
}
