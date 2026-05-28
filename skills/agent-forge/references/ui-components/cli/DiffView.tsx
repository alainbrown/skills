/**
 * DiffView — Ink (CLI) sibling of references/ui-components/web/DiffView.tsx
 *
 * Same prop shape as the web version. Renders a unified diff to the terminal
 * using Ink primitives + the `diff` npm package's `structuredPatch`.
 *
 * Color scheme:
 *   - additions (`+`)  → green
 *   - deletions (`-`)  → red
 *   - context lines    → dim
 *   - hunk headers     → cyan
 *
 * Compact mode = 3 lines of context. Otherwise 5.
 *
 * License: MIT (vendored — you own this file)
 * Maintained-by: project owner
 */

import React from 'react';
import { Box, Text } from 'ink';
import { structuredPatch } from 'diff';

export type DiffViewProps = {
  oldValue: string;
  newValue: string;
  filename?: string;
  compact?: boolean;
};

type Hunk = {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: string[];
};

export function DiffView({
  oldValue,
  newValue,
  filename,
  compact = false,
}: DiffViewProps): React.JSX.Element {
  const context = compact ? 3 : 5;
  const patch = structuredPatch(
    filename ?? 'a',
    filename ?? 'b',
    oldValue,
    newValue,
    '',
    '',
    { context },
  );

  const hunks: Hunk[] = patch.hunks;

  if (hunks.length === 0) {
    return (
      <Box flexDirection="column">
        {filename ? (
          <Text bold>{filename}</Text>
        ) : null}
        <Text dimColor italic>(no changes)</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {filename ? (
        <Box>
          <Text bold>{filename}</Text>
        </Box>
      ) : null}

      {hunks.map((hunk, hIdx) => (
        <Box key={hIdx} flexDirection="column">
          <Text color="cyan">
            @@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines} @@
          </Text>
          {hunk.lines.map((line, lIdx) => {
            const ch = line.charAt(0);
            if (ch === '+') {
              return (
                <Text key={lIdx} color="green">
                  {line}
                </Text>
              );
            }
            if (ch === '-') {
              return (
                <Text key={lIdx} color="red">
                  {line}
                </Text>
              );
            }
            return (
              <Text key={lIdx} dimColor>
                {line}
              </Text>
            );
          })}
        </Box>
      ))}
    </Box>
  );
}

export default DiffView;
