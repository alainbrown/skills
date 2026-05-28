/**
 * ToolInvocation — single-line status indicator for one tool call.
 *
 * Layout: `<icon> name(args) → result`
 *
 *   ⏳ running
 *   ✓  ok
 *   ✗  error
 *
 * Long inputs and results are clipped — the full payload still lives in
 * the agent transcript; this component is just visual confirmation that
 * a tool fired and what happened.
 */

import React from 'react';
import { Box, Text } from 'ink';
import type { ToolInvocation as Invocation } from '../lib/stream.js';

const STATUS_ICON: Record<Invocation['status'], string> = {
  running: '…',
  ok: '✓',
  error: '✗',
};

const STATUS_COLOR: Record<Invocation['status'], string> = {
  running: 'yellow',
  ok: 'green',
  error: 'red',
};

function formatArgs(input: unknown, max = 60): string {
  try {
    const s = typeof input === 'string' ? input : JSON.stringify(input);
    return s.length > max ? s.slice(0, max - 1) + '…' : s;
  } catch {
    return String(input);
  }
}

export function ToolInvocation({
  invocation,
}: {
  invocation: Invocation;
}): React.JSX.Element {
  const icon = STATUS_ICON[invocation.status];
  const color = STATUS_COLOR[invocation.status];
  return (
    <Box>
      <Text color={color}>{icon} </Text>
      <Text bold>{invocation.name}</Text>
      <Text dimColor>({formatArgs(invocation.input)})</Text>
      {invocation.resultPreview ? (
        <Text dimColor> → {formatArgs(invocation.resultPreview, 40)}</Text>
      ) : null}
    </Box>
  );
}
