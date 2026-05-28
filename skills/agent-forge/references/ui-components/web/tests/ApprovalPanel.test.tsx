import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  ApprovalPanel,
  type ApprovalRequest,
} from '../ApprovalPanel';

const make = (id: string, toolName = 'wiki_write_page'): ApprovalRequest => ({
  id,
  toolName,
  args: { path: '/notes/foo.md', content: 'hello world' },
  summary: `summary for ${id}`,
});

describe('ApprovalPanel', () => {
  it('renders null when no requests', () => {
    const { container } = render(
      <ApprovalPanel requests={[]} onApprove={() => {}} onReject={() => {}} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders a card per request with tool name and summary', () => {
    render(
      <ApprovalPanel
        requests={[make('a', 'tool_a'), make('b', 'tool_b')]}
        onApprove={() => {}}
        onReject={() => {}}
      />,
    );
    expect(screen.getByTestId('approval-panel')).toBeInTheDocument();
    expect(screen.getByTestId('approval-card-a')).toBeInTheDocument();
    expect(screen.getByTestId('approval-card-b')).toBeInTheDocument();
    expect(screen.getByText('tool_a')).toBeInTheDocument();
    expect(screen.getByText('tool_b')).toBeInTheDocument();
    expect(screen.getByText('summary for a')).toBeInTheDocument();
  });

  it('shows the request count in the heading', () => {
    render(
      <ApprovalPanel
        requests={[make('a'), make('b'), make('c')]}
        onApprove={() => {}}
        onReject={() => {}}
      />,
    );
    expect(screen.getByText(/Pending approvals \(3\)/)).toBeInTheDocument();
  });

  it('fires onApprove with the correct id', () => {
    const onApprove = vi.fn();
    render(
      <ApprovalPanel
        requests={[make('alpha'), make('beta')]}
        onApprove={onApprove}
        onReject={() => {}}
      />,
    );
    fireEvent.click(screen.getByTestId('approve-beta'));
    expect(onApprove).toHaveBeenCalledTimes(1);
    expect(onApprove).toHaveBeenCalledWith('beta');
  });

  it('fires onReject with the correct id', () => {
    const onReject = vi.fn();
    render(
      <ApprovalPanel
        requests={[make('alpha')]}
        onApprove={() => {}}
        onReject={onReject}
      />,
    );
    fireEvent.click(screen.getByTestId('reject-alpha'));
    expect(onReject).toHaveBeenCalledWith('alpha');
  });

  it('renders default JSON preview when no renderToolPreview supplied', () => {
    render(
      <ApprovalPanel
        requests={[make('x')]}
        onApprove={() => {}}
        onReject={() => {}}
      />,
    );
    const details = screen.getByTestId('approval-details-x');
    // The args JSON should appear inside the details element.
    expect(details.textContent).toContain('hello world');
    expect(details.textContent).toContain('/notes/foo.md');
  });

  it('honors a custom renderToolPreview', () => {
    render(
      <ApprovalPanel
        requests={[make('y')]}
        onApprove={() => {}}
        onReject={() => {}}
        renderToolPreview={(r) => (
          <div data-testid="custom-preview">custom for {r.id}</div>
        )}
      />,
    );
    expect(screen.getByTestId('custom-preview').textContent).toBe('custom for y');
  });

  it('renders cards newest-on-top (last request first in DOM)', () => {
    render(
      <ApprovalPanel
        requests={[make('first'), make('second')]}
        onApprove={() => {}}
        onReject={() => {}}
      />,
    );
    const cards = screen.getAllByText(/^summary for /);
    expect(cards[0]?.textContent).toContain('second');
    expect(cards[1]?.textContent).toContain('first');
  });
});
