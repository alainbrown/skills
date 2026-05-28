import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect } from 'vitest';
import { ToolInvocation } from '../src/components/ToolInvocation.js';

describe('ToolInvocation', () => {
  it('renders a running tool with name and clipped args', () => {
    const { lastFrame } = render(
      <ToolInvocation
        invocation={{
          id: 't1',
          name: 'read_file',
          input: { path: 'src/index.tsx' },
          status: 'running',
        }}
      />,
    );
    const out = lastFrame() ?? '';
    expect(out).toContain('read_file');
    expect(out).toContain('src/index.tsx');
  });

  it('renders ok status with a checkmark', () => {
    const { lastFrame } = render(
      <ToolInvocation
        invocation={{
          id: 't1',
          name: 'list_files',
          input: '.',
          status: 'ok',
          resultPreview: '12 files',
        }}
      />,
    );
    const out = lastFrame() ?? '';
    expect(out).toContain('list_files');
    expect(out).toContain('12 files');
    expect(out).toContain('✓');
  });

  it('renders error status with an X mark', () => {
    const { lastFrame } = render(
      <ToolInvocation
        invocation={{
          id: 't1',
          name: 'bash',
          input: 'rm -rf /',
          status: 'error',
          resultPreview: 'permission denied',
        }}
      />,
    );
    const out = lastFrame() ?? '';
    expect(out).toContain('bash');
    expect(out).toContain('✗');
  });

  it('clips very long inputs', () => {
    const longInput = 'a'.repeat(200);
    const { lastFrame } = render(
      <ToolInvocation
        invocation={{ id: 't1', name: 'echo', input: longInput, status: 'ok' }}
      />,
    );
    const out = lastFrame() ?? '';
    expect(out).toContain('…');
    expect(out).not.toContain('a'.repeat(150));
  });
});
