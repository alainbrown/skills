import { StatusPill } from '../components/StatusPill';
import { Switch } from '../components/Switch';
import { Wordmark } from '../components/Wordmark';

// PURE presentational view. Takes ALL data and callbacks via props; contains
// NO chrome.* calls. PopupContainer does the wiring and renders this. The demo
// project renders <Popup {...mockProps} /> directly — keep it side-effect free.
export interface PopupProps {
  // FORGE: rename/extend these to match the real popup data shape.
  name: string;
  greeting: string;
  enabled: boolean;
  onToggleEnabled: (next: boolean) => void;
  onOpenSettings: () => void;
}

export function Popup(props: PopupProps) {
  const { name, greeting, enabled, onToggleEnabled, onOpenSettings } = props;

  return (
    <div className="popup">
      <header className="head">
        <Wordmark name={name} size="sm" version="0.1" />
        <StatusPill on={enabled} label={enabled ? 'on' : 'off'} />
      </header>

      <section className="hero">
        <div className="eyebrow">status</div>
        <div className="greeting">{greeting}</div>
      </section>

      <div className="row">
        <span className="label">Enabled</span>
        <Switch on={enabled} onChange={onToggleEnabled} />
      </div>

      <footer className="foot">
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            onOpenSettings();
          }}
        >
          Open settings
        </a>
        <span className="ver">build 0.1.0</span>
      </footer>
    </div>
  );
}
