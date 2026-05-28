import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect } from 'vitest';
import { App } from '../src/App.js';

/**
 * App-level integration tests using ink-testing-library. We feed an initial
 * prompt through the optional `initialPrompt` prop — same code path as a
 * user submission — and assert on the rendered frames.
 *
 * The agent's stream is the placeholder (src/agent.ts), so the responses are
 * deterministic. Frames need a brief async window for the stream to drain.
 */

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

describe('App', () => {
  it('renders the banner and an empty input prompt on mount', () => {
    const { lastFrame } = render(<App />);
    const out = lastFrame() ?? '';
    expect(out).toContain('agent-cli');
    expect(out).toContain('agent>');
  });

  it('runs the initial prompt and shows the placeholder response in history', async () => {
    const { lastFrame, frames } = render(<App initialPrompt="hello" />);
    // Give the async stream a couple ticks to drain.
    await sleep(50);
    const joined = frames.join('\n');
    expect(joined).toContain('hello'); // user message echoed
    expect(joined + lastFrame()).toContain('Agent placeholder');
  });

  it('shows a status footer', () => {
    const { lastFrame } = render(<App />);
    const out = lastFrame() ?? '';
    // Either "idle" or "streaming" should appear in the status line.
    expect(out).toMatch(/idle|streaming/);
  });
});
