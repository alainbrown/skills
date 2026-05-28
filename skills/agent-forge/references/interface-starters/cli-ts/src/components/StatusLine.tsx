/**
 * StatusLine — single-row footer printing streaming status.
 *
 * Shows a spinner while streaming, and a hint about Ctrl-C / Ctrl-D when idle.
 * Token / cost reporting is a hook the harness can fill — model + counters
 * are passed in as props so the App owns nothing harness-specific.
 */

import React from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import type { StreamStatus } from '../hooks/useAgentStream.js';

export type StatusLineProps = {
  status: StreamStatus;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  costUsd?: number;
  errorMessage?: string | null;
};

export function StatusLine({
  status,
  model,
  inputTokens,
  outputTokens,
  costUsd,
  errorMessage,
}: StatusLineProps): React.JSX.Element {
  if (status === 'error') {
    return (
      <Box>
        <Text color="red" bold>error</Text>
        <Text color="red"> {errorMessage ?? 'unknown'}</Text>
      </Box>
    );
  }

  return (
    <Box>
      {status === 'streaming' ? (
        <Text color="yellow">
          <Spinner type="dots" /> streaming
        </Text>
      ) : (
        <Text dimColor>idle · /help · Ctrl-C interrupt · Ctrl-D exit</Text>
      )}
      {model ? <Text dimColor>  ·  {model}</Text> : null}
      {inputTokens !== undefined || outputTokens !== undefined ? (
        <Text dimColor>
          {'  ·  '}
          {inputTokens ?? 0} in / {outputTokens ?? 0} out
        </Text>
      ) : null}
      {costUsd !== undefined ? (
        <Text dimColor>  ·  ${costUsd.toFixed(4)}</Text>
      ) : null}
    </Box>
  );
}
