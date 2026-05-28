import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect } from 'vitest';
import { Message } from '../src/components/Message.js';
import type { ChatMessage } from '../src/hooks/useAgentStream.js';

describe('Message', () => {
  it('renders a user message with "you>" prefix', () => {
    const msg: ChatMessage = { role: 'user', text: 'hello there', id: 'u1' };
    const { lastFrame } = render(<Message message={msg} />);
    const out = lastFrame() ?? '';
    expect(out).toContain('you>');
    expect(out).toContain('hello there');
  });

  it('renders an assistant message with "assistant>" prefix and markdown body', () => {
    const msg: ChatMessage = {
      role: 'assistant',
      text: '**bold** and `code`',
      toolInvocations: [],
      id: 'a1',
    };
    const { lastFrame } = render(<Message message={msg} />);
    const out = lastFrame() ?? '';
    expect(out).toContain('assistant>');
    // Markdown body is rendered — the raw "**bold**" should NOT survive.
    expect(out).toContain('bold');
    expect(out).not.toContain('**bold**');
    expect(out).toContain('code');
  });

  it('shows tool invocations inline above the body', () => {
    const msg: ChatMessage = {
      role: 'assistant',
      text: 'done',
      toolInvocations: [
        { id: 't1', name: 'read_file', input: { path: 'foo' }, status: 'ok', resultPreview: 'contents' },
      ],
      id: 'a2',
    };
    const { lastFrame } = render(<Message message={msg} />);
    const out = lastFrame() ?? '';
    expect(out).toContain('read_file');
    expect(out).toContain('done');
  });
});
