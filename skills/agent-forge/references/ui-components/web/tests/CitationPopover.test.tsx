import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CitationPopover, type Citation } from '../CitationPopover';

const SAMPLE_CITATIONS: Citation[] = [
  {
    index: 1,
    title: 'Pragmatic Programmer',
    source: 'https://pragprog.com/titles/tpp20/',
    excerpt: 'tracer bullets fire all the way through the system',
  },
  {
    index: 2,
    title: 'Local design notes',
    source: '/notes/design.md',
    excerpt: 'see section 3',
  },
];

describe('CitationPopover', () => {
  it('renders plain text when no citations in body', () => {
    render(
      <CitationPopover citations={SAMPLE_CITATIONS}>
        This is plain prose with no markers.
      </CitationPopover>,
    );
    expect(screen.getByTestId('citation-popover').textContent).toBe(
      'This is plain prose with no markers.',
    );
    expect(screen.queryByTestId('citation-marker')).not.toBeInTheDocument();
  });

  it('detects [N] markers and wraps them', () => {
    render(
      <CitationPopover citations={SAMPLE_CITATIONS}>
        See [1] for details.
      </CitationPopover>,
    );
    const marker = screen.getByTestId('citation-marker');
    expect(marker).toBeInTheDocument();
    expect(marker.textContent).toBe('[1]');
  });

  it('detects multiple separate markers', () => {
    render(
      <CitationPopover citations={SAMPLE_CITATIONS}>
        Refs [1] and also [2] elsewhere.
      </CitationPopover>,
    );
    expect(screen.getAllByTestId('citation-marker')).toHaveLength(2);
  });

  it('detects grouped markers like [1, 2]', () => {
    render(
      <CitationPopover citations={SAMPLE_CITATIONS}>
        See [1, 2] for both.
      </CitationPopover>,
    );
    const markers = screen.getAllByTestId('citation-marker');
    expect(markers).toHaveLength(1);
    expect(markers[0]?.textContent).toBe('[1, 2]');
  });

  it('renders orphan markers as plain text when index is unknown', () => {
    render(
      <CitationPopover citations={SAMPLE_CITATIONS}>
        See [99] which does not exist.
      </CitationPopover>,
    );
    expect(screen.queryByTestId('citation-marker')).not.toBeInTheDocument();
    expect(screen.getByTestId('citation-orphan').textContent).toBe('[99]');
  });

  it('shows popover content on hover', () => {
    render(
      <CitationPopover citations={SAMPLE_CITATIONS}>
        Refer to [1].
      </CitationPopover>,
    );
    const marker = screen.getByTestId('citation-marker');
    expect(
      screen.queryByTestId('citation-popover-content'),
    ).not.toBeInTheDocument();

    fireEvent.mouseEnter(marker);
    const content = screen.getByTestId('citation-popover-content');
    expect(content.textContent).toContain('Pragmatic Programmer');
    expect(content.textContent).toContain('tracer bullets');

    fireEvent.mouseLeave(marker);
    expect(
      screen.queryByTestId('citation-popover-content'),
    ).not.toBeInTheDocument();
  });

  it('shows multiple citations in a grouped popover', () => {
    render(
      <CitationPopover citations={SAMPLE_CITATIONS}>
        See [1, 2].
      </CitationPopover>,
    );
    const marker = screen.getByTestId('citation-marker');
    fireEvent.mouseEnter(marker);
    const content = screen.getByTestId('citation-popover-content');
    expect(content.textContent).toContain('Pragmatic Programmer');
    expect(content.textContent).toContain('Local design notes');
  });

  it('preserves text around markers', () => {
    render(
      <CitationPopover citations={SAMPLE_CITATIONS}>
        Before [1] after.
      </CitationPopover>,
    );
    expect(screen.getByTestId('citation-popover').textContent).toBe(
      'Before [1] after.',
    );
  });
});
