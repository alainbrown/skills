// FORGE: a tiny PURE logic helper, here only to demonstrate the unit-test
// setup. Pure functions like this (no chrome.*, no DOM) are the easiest things
// to test and the natural home for real business logic. Replace with yours.

/**
 * Build the greeting line shown in the popup/options surfaces.
 * Pure: same inputs always produce the same output.
 */
export function buildGreeting(label: string, enabled: boolean): string {
  const name = label.trim() || 'there';
  return enabled ? `Hello, ${name}!` : `Paused — ${name}`;
}

/** Pure, deterministic-by-injection: pass `now` instead of reading the clock. */
export function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}
