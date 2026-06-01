// PURE presentational component. Takes ALL data via props; contains NO
// chrome.* calls and no storage/messaging access. The demo project reuses
// these with mock props — keep it that way.
interface SwitchProps {
  on: boolean;
  onChange: (next: boolean) => void;
}

export function Switch({ on, onChange }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      className={`switch${on ? ' on' : ''}`}
      onClick={() => onChange(!on)}
    />
  );
}
