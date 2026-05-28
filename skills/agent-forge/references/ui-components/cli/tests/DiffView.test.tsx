import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect } from 'vitest';
import { DiffView } from '../DiffView.js';

describe('DiffView', () => {
  it('renders no-changes message when inputs are identical', () => {
    const { lastFrame } = render(<DiffView oldValue="same\n" newValue="same\n" />);
    expect(lastFrame() ?? '').toContain('no changes');
  });

  it('renders the filename header when provided', () => {
    const { lastFrame } = render(
      <DiffView oldValue="a\n" newValue="b\n" filename="foo.txt" />,
    );
    expect(lastFrame() ?? '').toContain('foo.txt');
  });

  it('renders added and removed lines with their leading markers', () => {
    const oldValue = 'line1\nline2\nline3\n';
    const newValue = 'line1\nLINE2\nline3\nline4\n';
    const { lastFrame } = render(<DiffView oldValue={oldValue} newValue={newValue} />);
    const out = lastFrame() ?? '';
    expect(out).toContain('-line2');
    expect(out).toContain('+LINE2');
    expect(out).toContain('+line4');
    // hunk header.
    expect(out).toMatch(/@@\s*-\d+,\d+\s*\+\d+,\d+\s*@@/);
  });

  it('renders a hunk header even in compact mode', () => {
    const oldValue = Array.from({ length: 20 }, (_, i) => `line${i}`).join('\n');
    const newValue = oldValue.replace('line10', 'LINE10');
    const { lastFrame } = render(
      <DiffView oldValue={oldValue} newValue={newValue} compact />,
    );
    const out = lastFrame() ?? '';
    expect(out).toContain('-line10');
    expect(out).toContain('+LINE10');
    expect(out).toMatch(/@@/);
  });
});
