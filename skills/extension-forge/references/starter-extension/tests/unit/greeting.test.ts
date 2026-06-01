import { describe, expect, it } from 'vitest';
import { buildGreeting, formatTimestamp } from '../../src/lib/greeting';

// Sample unit test of PURE logic helpers. No chrome.* needed — this is exactly
// why business logic lives in src/lib/ as pure functions.
describe('buildGreeting', () => {
  it('greets a named, enabled user', () => {
    expect(buildGreeting('Ada', true)).toBe('Hello, Ada!');
  });
  it('falls back to "there" when the label is blank', () => {
    expect(buildGreeting('   ', true)).toBe('Hello, there!');
  });
  it('shows a paused message when disabled', () => {
    expect(buildGreeting('Ada', false)).toBe('Paused — Ada');
  });
});

describe('formatTimestamp', () => {
  it('formats as zero-padded HH:MM', () => {
    const ts = new Date('2026-01-02T09:05:00').getTime();
    expect(formatTimestamp(ts)).toBe('09:05');
  });
});
