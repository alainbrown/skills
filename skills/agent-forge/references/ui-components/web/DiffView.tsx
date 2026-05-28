/**
 * DiffView — unified diff render, thin wrapper around react-diff-viewer-continued.
 *
 * License: MIT (vendored — you own this file)
 * Maintained-by: project owner
 *
 * Used as the "show what changed" view for tools that mutate text (file-edit,
 * wiki-edit, etc.). Compose inside ApprovalPanel via `renderToolPreview` for
 * inline diff previews, or render standalone for "before/after" displays.
 *
 * Tech-stack coupling:
 *   - React 19. `react-diff-viewer-continued` historically advertises a React
 *     16/17/18 peer range; under React 19 you may need
 *     `pnpm install --no-strict-peer-dependencies` or a `pnpm.overrides` /
 *     `resolutions` entry. See `package.json.fragment.md` for the snippet.
 *   - Tailwind v4 utility classes only.
 *
 * Compact mode: side-by-side off, line numbers off, 3-line context. Use it
 * inside ApprovalPanel cards where vertical real-estate is tight.
 */

'use client';

import * as React from 'react';
import ReactDiffViewer from 'react-diff-viewer-continued';

export interface DiffViewProps {
  oldValue: string;
  newValue: string;
  filename?: string;
  className?: string;
  /**
   * Compact: inline preview (no line numbers, no split view, tight padding).
   * Full (default): line numbers on, side-by-side split-view.
   */
  compact?: boolean;
}

// We pick our own palette so it follows the host project's dark/light theme
// reasonably well. react-diff-viewer-continued exposes both light and dark via
// the `useDarkTheme` flag; we expose this as a prop in the future if needed.
// For now: dark theme is the default (matches both starters' aesthetic).
const STYLES = {
  variables: {
    dark: {
      diffViewerBackground: 'transparent',
      addedBackground: 'rgba(16, 185, 129, 0.15)',
      addedColor: 'inherit',
      removedBackground: 'rgba(239, 68, 68, 0.15)',
      removedColor: 'inherit',
      wordAddedBackground: 'rgba(16, 185, 129, 0.35)',
      wordRemovedBackground: 'rgba(239, 68, 68, 0.35)',
      gutterBackground: 'transparent',
      gutterColor: '#94a3b8',
    },
  },
} as const;

export function DiffView({
  oldValue,
  newValue,
  filename,
  className,
  compact = false,
}: DiffViewProps) {
  return (
    <div
      data-testid="diff-view"
      className={[
        'overflow-hidden rounded-md border border-border bg-card/40 text-[12px]',
        className ?? '',
      ]
        .join(' ')
        .trim()}
    >
      {filename && (
        <div
          data-testid="diff-view-filename"
          className="border-b border-border/60 bg-muted/40 px-3 py-1.5 font-mono text-[11px] text-muted-foreground"
        >
          {filename}
        </div>
      )}
      <div className="max-h-[28rem] overflow-auto">
        <ReactDiffViewer
          oldValue={oldValue}
          newValue={newValue}
          splitView={!compact}
          hideLineNumbers={compact}
          extraLinesSurroundingDiff={compact ? 3 : 5}
          useDarkTheme={true}
          styles={STYLES}
        />
      </div>
    </div>
  );
}
