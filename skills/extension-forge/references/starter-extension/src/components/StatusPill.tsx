// PURE presentational component. Takes ALL data via props; contains NO
// chrome.* calls. Safe to render in tests/demos with mock props.
interface StatusPillProps {
  on: boolean;
  label: string;
}

export function StatusPill({ on, label }: StatusPillProps) {
  return (
    <div className={`status${on ? ' status-on' : ' status-off'}`}>
      <span className="dot" />
      <span>{label}</span>
    </div>
  );
}
