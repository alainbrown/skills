import React from 'react';
import { Text } from 'ink';
import { render } from 'ink-testing-library';
import { describe, it, expect, vi } from 'vitest';
import { ApprovalPanel, type ApprovalRequest } from '../ApprovalPanel.js';

const sampleReq: ApprovalRequest = {
  id: 'req-1',
  toolName: 'wiki_write_page',
  args: { path: 'wiki/foo.md', body: 'hello' },
  summary: 'Create wiki/foo.md',
};

describe('ApprovalPanel', () => {
  it('renders null when there are no requests', () => {
    const { lastFrame } = render(
      <ApprovalPanel requests={[]} onApprove={() => {}} onReject={() => {}} />,
    );
    // Empty render — frame should be empty or whitespace.
    expect((lastFrame() ?? '').trim()).toBe('');
  });

  it('shows the topmost request with summary and keybinds', () => {
    const { lastFrame } = render(
      <ApprovalPanel requests={[sampleReq]} onApprove={() => {}} onReject={() => {}} />,
    );
    const out = lastFrame() ?? '';
    expect(out).toContain('Approval required');
    expect(out).toContain('wiki_write_page');
    expect(out).toContain('Create wiki/foo.md');
    expect(out).toContain('[y]');
    expect(out).toContain('[n]');
    expect(out).toContain('[d]');
  });

  it('shows a "+N more" indicator when multiple requests are pending', () => {
    const reqs: ApprovalRequest[] = [
      sampleReq,
      { ...sampleReq, id: 'req-2' },
      { ...sampleReq, id: 'req-3' },
    ];
    const { lastFrame } = render(
      <ApprovalPanel requests={reqs} onApprove={() => {}} onReject={() => {}} />,
    );
    expect(lastFrame() ?? '').toContain('+2 more');
  });

  it('calls onApprove with the topmost request id when y is pressed', () => {
    const onApprove = vi.fn();
    const onReject = vi.fn();
    const { stdin } = render(
      <ApprovalPanel requests={[sampleReq]} onApprove={onApprove} onReject={onReject} />,
    );
    stdin.write('y');
    expect(onApprove).toHaveBeenCalledWith('req-1');
    expect(onReject).not.toHaveBeenCalled();
  });

  it('calls onReject with the topmost request id when n is pressed', () => {
    const onApprove = vi.fn();
    const onReject = vi.fn();
    const { stdin } = render(
      <ApprovalPanel requests={[sampleReq]} onApprove={onApprove} onReject={onReject} />,
    );
    stdin.write('n');
    expect(onReject).toHaveBeenCalledWith('req-1');
    expect(onApprove).not.toHaveBeenCalled();
  });

  it('uses renderToolPreview when supplied', () => {
    const { lastFrame } = render(
      <ApprovalPanel
        requests={[sampleReq]}
        onApprove={() => {}}
        onReject={() => {}}
        renderToolPreview={() => <Text>CUSTOM_PREVIEW_MARKER</Text>}
      />,
    );
    const out = lastFrame() ?? '';
    expect(out).toContain('CUSTOM_PREVIEW_MARKER');
    // JSON preview should NOT be shown when a custom previewer is provided.
    expect(out).not.toContain('"path"');
    expect(out).not.toContain('"body"');
  });
});
