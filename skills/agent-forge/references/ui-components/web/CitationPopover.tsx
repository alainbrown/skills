/**
 * CitationPopover — inline `[N]` citation markers with hover popovers.
 *
 * License: MIT (vendored — you own this file)
 * Maintained-by: project owner
 *
 * For research/wiki agents that emit citation markers like `[1]`, `[2]`, or
 * `[1, 2]` in their text output. Wraps each match in a hoverable span that
 * shows the citation's title, excerpt, and source link.
 *
 * Tech-stack coupling:
 *   - React 19
 *   - Tailwind v4 utility classes only.
 *   - NO Radix / no popover lib. Manual `position: absolute` + onMouseEnter/
 *     Leave. This keeps the skill from pulling in @radix-ui/react-popover for
 *     a one-off behaviour. If you need keyboard-accessible popovers with
 *     proper focus management later, swap to Radix.
 *
 * Input contract:
 *   `children` must be a STRING or an array of strings (the common case for
 *   model output rendered as plain text). Arbitrary nested JSX is not walked
 *   — pre-render markdown to text first, or feed strings directly. The parser
 *   handles `[1]`, `[12]`, `[1, 2]`, `[1,2,3]` patterns.
 *
 * Clicking a citation:
 *   - URL source (matches `/^https?:/`): opens in a new tab via window.open.
 *   - Other (local path): dispatches a CustomEvent `citation:navigate` on the
 *     window with `{ source }` in detail. Wire your host to that event to
 *     handle local-file navigation (e.g. Electron shell.openPath, web router).
 */

'use client';

import * as React from 'react';

export interface Citation {
  index: number;
  title: string;
  source: string;
  excerpt?: string;
}

export interface CitationPopoverProps {
  children: React.ReactNode;
  citations: Citation[];
  className?: string;
}

// Match [1], [12], [1, 2], [1,2,3], etc.
const CITATION_RE = /\[(\d+(?:\s*,\s*\d+)*)\]/g;

interface ParsedSegment {
  kind: 'text' | 'cite';
  text: string;
  indices?: number[];
}

function parseCitations(text: string): ParsedSegment[] {
  const segments: ParsedSegment[] = [];
  let lastIndex = 0;
  for (const match of text.matchAll(CITATION_RE)) {
    const start = match.index ?? 0;
    if (start > lastIndex) {
      segments.push({ kind: 'text', text: text.slice(lastIndex, start) });
    }
    const indices = match[1]!
      .split(',')
      .map((s) => Number.parseInt(s.trim(), 10))
      .filter((n) => Number.isFinite(n));
    segments.push({ kind: 'cite', text: match[0], indices });
    lastIndex = start + match[0].length;
  }
  if (lastIndex < text.length) {
    segments.push({ kind: 'text', text: text.slice(lastIndex) });
  }
  return segments;
}

function asText(children: React.ReactNode): string {
  if (typeof children === 'string') return children;
  if (typeof children === 'number') return String(children);
  if (Array.isArray(children)) {
    return children
      .map((c) => (typeof c === 'string' || typeof c === 'number' ? String(c) : ''))
      .join('');
  }
  return '';
}

function openSource(source: string) {
  if (/^https?:/i.test(source)) {
    if (typeof window !== 'undefined') window.open(source, '_blank', 'noreferrer');
    return;
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('citation:navigate', { detail: { source } }));
  }
}

export function CitationPopover({
  children,
  citations,
  className,
}: CitationPopoverProps) {
  const byIndex = React.useMemo(() => {
    const map = new Map<number, Citation>();
    for (const c of citations) map.set(c.index, c);
    return map;
  }, [citations]);

  const segments = React.useMemo(() => parseCitations(asText(children)), [children]);

  return (
    <span data-testid="citation-popover" className={className}>
      {segments.map((seg, i) =>
        seg.kind === 'text' ? (
          <React.Fragment key={i}>{seg.text}</React.Fragment>
        ) : (
          <CitationMarker
            key={i}
            text={seg.text}
            citations={(seg.indices ?? [])
              .map((n) => byIndex.get(n))
              .filter((c): c is Citation => c !== undefined)}
          />
        ),
      )}
    </span>
  );
}

function CitationMarker({
  text,
  citations,
}: {
  text: string;
  citations: Citation[];
}) {
  const [open, setOpen] = React.useState(false);

  // If no citations matched our markers (e.g. agent referenced [99] but only
  // 5 citations were provided), render plain text.
  if (citations.length === 0) {
    return <span data-testid="citation-orphan">{text}</span>;
  }

  return (
    <span
      data-testid="citation-marker"
      role="button"
      tabIndex={0}
      aria-label={`Citation ${text}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onClick={() => citations[0] && openSource(citations[0].source)}
      className="relative inline-flex cursor-pointer items-baseline rounded px-0.5 text-[0.85em] font-medium text-sky-600 hover:bg-sky-100 hover:text-sky-700 dark:text-sky-400 dark:hover:bg-sky-900/40"
    >
      {text}
      {open && (
        <span
          data-testid="citation-popover-content"
          role="tooltip"
          className="absolute bottom-full left-1/2 z-50 mb-1 w-72 -translate-x-1/2 rounded-md border border-border bg-popover p-2 text-left text-xs text-popover-foreground shadow-lg"
        >
          {citations.map((c) => (
            <span
              key={c.index}
              className="mb-1 flex flex-col gap-0.5 border-b border-border/40 pb-1 last:mb-0 last:border-0 last:pb-0"
            >
              <span className="font-semibold">
                [{c.index}] {c.title}
              </span>
              {c.excerpt && (
                <span className="text-muted-foreground">{c.excerpt}</span>
              )}
              <span className="truncate font-mono text-[10px] text-sky-600 dark:text-sky-400">
                {c.source}
              </span>
            </span>
          ))}
        </span>
      )}
    </span>
  );
}
