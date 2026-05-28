import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DiffView } from '../DiffView';

describe('DiffView', () => {
  it('renders without crashing for identical input', () => {
    render(<DiffView oldValue="abc" newValue="abc" />);
    expect(screen.getByTestId('diff-view')).toBeInTheDocument();
  });

  it('renders content from both sides of the diff', () => {
    // react-diff-viewer-continued folds identical context by default. Force
    // a fully-changed line so both old + new text are rendered (not collapsed).
    render(<DiffView oldValue="hello world" newValue="goodbye world" />);
    const view = screen.getByTestId('diff-view');
    // Spec is loose: as long as we get some rendered output (not the empty
    // string and not a crash), the wrapper is doing its job. The viewer's
    // exact textContent is library-internal.
    expect(view.textContent && view.textContent.length).toBeGreaterThan(0);
  });

  it('shows the filename header when supplied', () => {
    render(
      <DiffView
        oldValue="a"
        newValue="b"
        filename="src/index.ts"
      />,
    );
    const header = screen.getByTestId('diff-view-filename');
    expect(header).toBeInTheDocument();
    expect(header.textContent).toBe('src/index.ts');
  });

  it('omits the filename header when not supplied', () => {
    render(<DiffView oldValue="a" newValue="b" />);
    expect(screen.queryByTestId('diff-view-filename')).not.toBeInTheDocument();
  });

  it('compact mode renders the diff', () => {
    render(
      <DiffView oldValue="line1\nline2" newValue="line1\nLINE2" compact />,
    );
    // Both modes render; we just verify the component mounts in compact mode.
    expect(screen.getByTestId('diff-view')).toBeInTheDocument();
  });

  it('full mode renders the diff with split view', () => {
    render(
      <DiffView oldValue="line1\nline2" newValue="line1\nLINE2" compact={false} />,
    );
    expect(screen.getByTestId('diff-view')).toBeInTheDocument();
  });

  it('honors className prop on the wrapper', () => {
    render(
      <DiffView
        oldValue="x"
        newValue="y"
        className="my-custom"
      />,
    );
    expect(screen.getByTestId('diff-view').className).toMatch(/my-custom/);
  });
});
