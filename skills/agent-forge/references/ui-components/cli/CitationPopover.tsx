/**
 * CitationPopover (CLI flavor — exported also as CitationFooter)
 *
 * Sibling of references/ui-components/web/CitationPopover.tsx — but the
 * "popover" metaphor doesn't exist in a terminal (no hover state), so this
 * CLI version renders the children inline with [N] markers preserved, then
 * prints a numbered footer listing the citations beneath them.
 *
 * Prop shape is kept identical to the web version so callers can swap the
 * component per interface without changing data. We export TWO names:
 *
 *   - `CitationPopover` — prop-shape symmetry with web. Same import path
 *     conceptually swappable in a render-once-per-platform layout.
 *   - `CitationFooter`  — clearer name for new CLI code.
 *
 * Both are the same component. Pick whichever name reads better in context.
 *
 * License: MIT (vendored — you own this file)
 * Maintained-by: project owner
 */

import React from 'react';
import { Box, Text } from 'ink';

export type Citation = {
  index: number;
  title: string;
  source: string;
  excerpt?: string;
};

export type CitationFooterProps = {
  children: React.ReactNode;
  citations: Citation[];
};

/** Alias kept for prop-shape symmetry with the web `CitationPopover`. */
export type CitationPopoverProps = CitationFooterProps;

function CitationFooterImpl({
  children,
  citations,
}: CitationFooterProps): React.JSX.Element {
  const sorted = [...citations].sort((a, b) => a.index - b.index);

  return (
    <Box flexDirection="column">
      {/* Body content (with [N] markers already in children). */}
      <Box flexDirection="column">{children}</Box>

      {sorted.length > 0 ? (
        <Box flexDirection="column" marginTop={1}>
          <Text dimColor>{'─'.repeat(20)}</Text>
          <Text bold dimColor>
            Citations
          </Text>
          {sorted.map((c) => (
            <Box key={c.index} flexDirection="column" marginTop={0}>
              <Text>
                <Text color="cyan">[{c.index}]</Text>
                <Text bold> {c.title}</Text>
              </Text>
              <Box marginLeft={4}>
                <Text dimColor>{c.source}</Text>
              </Box>
              {c.excerpt ? (
                <Box marginLeft={4}>
                  <Text dimColor italic>
                    &quot;{c.excerpt}&quot;
                  </Text>
                </Box>
              ) : null}
            </Box>
          ))}
        </Box>
      ) : null}
    </Box>
  );
}

export const CitationFooter = CitationFooterImpl;
export const CitationPopover = CitationFooterImpl;

export default CitationFooter;
