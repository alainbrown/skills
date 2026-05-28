/**
 * ApprovalPanel — Ink (CLI) sibling of references/ui-components/web/ApprovalPanel.tsx
 *
 * Same prop shape as the web version. Renders to terminal using Ink primitives.
 * Shows the topmost pending approval request in a bordered panel and listens
 * for y/n/d keypresses via Ink's `useInput`.
 *
 * Layout sketch:
 *   ┌─ Approval required: wiki_write_page ─────┐
 *   │ {summary}                                 │
 *   │ {renderToolPreview(req) OR JSON preview}  │
 *   │                                           │
 *   │ [y] approve   [n] reject   [d] details    │
 *   └───────────────────────────────────────────┘
 *
 * Behavior:
 *   - `y` → onApprove(topRequest.id)
 *   - `n` → onReject(topRequest.id)
 *   - `d` → toggle expanded details view
 *   - If multiple pending requests, shows "+N more" indicator.
 *   - If `requests` is empty, renders nothing (returns null).
 *
 * The wiring to actually pause the agent stream and yield resolution lives
 * elsewhere (see the `approval-bridge` pattern in PATTERN_LEDGER).
 *
 * License: MIT (vendored — you own this file)
 * Maintained-by: project owner
 */

import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

export type ApprovalRequest = {
  id: string;
  toolName: string;
  args: Record<string, unknown>;
  summary?: string;
};

export type ApprovalPanelProps = {
  requests: ApprovalRequest[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  /** Optional renderer for richer tool-specific previews (e.g., DiffView). */
  renderToolPreview?: (req: ApprovalRequest) => React.ReactNode;
  /** When true, ApprovalPanel reads keyboard input. Defaults to true. */
  focus?: boolean;
};

function jsonPreview(args: Record<string, unknown>, maxLines = 8): string[] {
  let text: string;
  try {
    text = JSON.stringify(args, null, 2);
  } catch {
    text = String(args);
  }
  const lines = text.split('\n');
  if (lines.length <= maxLines) return lines;
  return [...lines.slice(0, maxLines), `… (${lines.length - maxLines} more lines)`];
}

export function ApprovalPanel({
  requests,
  onApprove,
  onReject,
  renderToolPreview,
  focus = true,
}: ApprovalPanelProps): React.JSX.Element | null {
  const [expanded, setExpanded] = useState(false);
  const top = requests[0];

  useInput(
    (input, _key) => {
      if (!top) return;
      if (input === 'y' || input === 'Y') {
        onApprove(top.id);
        setExpanded(false);
        return;
      }
      if (input === 'n' || input === 'N') {
        onReject(top.id);
        setExpanded(false);
        return;
      }
      if (input === 'd' || input === 'D') {
        setExpanded((e) => !e);
      }
    },
    { isActive: focus && Boolean(top) },
  );

  if (!top) return null;

  const more = requests.length - 1;
  const previewLines = jsonPreview(top.args, expanded ? 200 : 6);

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="yellow" paddingX={1}>
      <Box>
        <Text bold color="yellow">
          Approval required:{' '}
        </Text>
        <Text bold>{top.toolName}</Text>
        {more > 0 ? <Text dimColor> (+{more} more pending)</Text> : null}
      </Box>

      {top.summary ? (
        <Box marginTop={1}>
          <Text>{top.summary}</Text>
        </Box>
      ) : null}

      <Box flexDirection="column" marginTop={1}>
        {renderToolPreview ? (
          <>{renderToolPreview(top)}</>
        ) : (
          previewLines.map((line, i) => (
            <Text key={i} dimColor>
              {line}
            </Text>
          ))
        )}
      </Box>

      <Box marginTop={1}>
        <Text>
          <Text bold color="green">[y]</Text>
          <Text> approve   </Text>
          <Text bold color="red">[n]</Text>
          <Text> reject   </Text>
          <Text bold color="cyan">[d]</Text>
          <Text> {expanded ? 'collapse' : 'details'}</Text>
        </Text>
      </Box>
    </Box>
  );
}

export default ApprovalPanel;
