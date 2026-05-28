/**
 * ChatHistory — scrolling region for completed messages.
 *
 * Wraps Ink's <Static>. Items in <Static> render once and never re-render,
 * so they scroll naturally in the terminal without flicker — the standard
 * Ink chat pattern. The active turn (streaming) is NOT here; it lives in
 * App's dynamic region below.
 */

import React from 'react';
import { Static } from 'ink';
import type { ChatMessage } from '../hooks/useAgentStream.js';
import { Message } from './Message.js';

export function ChatHistory({
  messages,
}: {
  messages: ChatMessage[];
}): React.JSX.Element {
  return (
    <Static items={messages}>
      {(m) => <Message key={m.id} message={m} />}
    </Static>
  );
}
