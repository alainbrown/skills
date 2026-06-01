// PURE presentational component. Takes ALL data via props; contains NO
// chrome.* calls. The brand name is passed in so the demo/tests can vary it.
interface WordmarkProps {
  // FORGE: the displayed product name. Default kept bootable.
  name?: string;
  size?: 'sm' | 'lg';
  version?: string;
}

export function Wordmark({ name = 'forge', size = 'sm', version }: WordmarkProps) {
  return (
    <div className={`wordmark wordmark-${size}`}>
      <h1>{name}</h1>
      {version && <span className="v">v{version}</span>}
    </div>
  );
}
