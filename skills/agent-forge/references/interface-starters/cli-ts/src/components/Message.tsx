/**
 * Message — renders one chat message.
 *
 * User messages: bold cyan label + plain text.
 * Assistant messages: dim "assistant>" label + markdown-rendered body.
 *
 * Used inside <Static> for completed messages.
 */

import React from 'react';
import { Box, Text } from 'ink';
import { renderMarkdown } from '../lib/markdown.js';
import type { ChatMessage } from '../hooks/useAgentStream.js';
import { ToolInvocation } from './ToolInvocation.js';

export function Message({ message }: { message: ChatMessage }): React.JSX.Element {
  if (message.role === 'user') {
    return (
      <Box flexDirection="column" marginTop={1}>
        <Box>
          <Text bold color="cyan">you&gt; </Text>
          <Text>{message.text}</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" marginTop={1}>
      <Box>
        <Text bold color="magenta">assistant&gt;</Text>
      </Box>
      {message.toolInvocations.length > 0 ? (
        <Box flexDirection="column" marginLeft={2}>
          {message.toolInvocations.map((t) => (
            <ToolInvocation key={t.id} invocation={t} />
          ))}
        </Box>
      ) : null}
      <Box marginLeft={2}>{renderMarkdown(message.text || '(no text)')}</Box>
    </Box>
  );
}
