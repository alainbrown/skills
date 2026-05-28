/**
 * App — top-level Ink chat layout.
 *
 *   ┌─ Static history (scrolls) ──────────────────┐
 *   │ you> ...                                     │
 *   │ assistant> ...                               │
 *   │   tool calls inline                          │
 *   └──────────────────────────────────────────────┘
 *
 *   ┌─ Active tools pane (visible while streaming) ┐
 *   │ … tool_name(args) → preview                  │
 *   └──────────────────────────────────────────────┘
 *
 *   ┌─ Streaming buffer (the in-flight assistant)  ┐
 *   │ assistant> tokens as they arrive             │
 *   └──────────────────────────────────────────────┘
 *
 *   ┌─ Input bar ──────────────────────────────────┐
 *   │ agent> type a message                        │
 *   └──────────────────────────────────────────────┘
 *
 *   ┌─ Status line ────────────────────────────────┐
 *   │ idle / streaming · model · token / cost      │
 *   └──────────────────────────────────────────────┘
 *
 * Ctrl-C aborts the current turn (does NOT exit). Ctrl-D exits.
 */

import React, { useState } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import { ChatHistory } from './components/ChatHistory.js';
import { InputBar } from './components/InputBar.js';
import { StatusLine } from './components/StatusLine.js';
import { ToolInvocation } from './components/ToolInvocation.js';
import { useAgentStream } from './hooks/useAgentStream.js';

export type AppProps = {
  /** When set, run a one-shot prompt then exit. The Ink path is only used
   *  in interactive (TTY) mode; one-shot prompts go through the raw renderer
   *  in `cli/render.ts`. This prop is mostly here for testing. */
  initialPrompt?: string;
  /** Optional model label for the status line. */
  model?: string;
};

export function App({ initialPrompt, model }: AppProps): React.JSX.Element {
  const { exit } = useApp();
  const [input, setInput] = useState('');
  const {
    history,
    streamingText,
    activeTools,
    status,
    errorMessage,
    submit,
    cancel,
  } = useAgentStream();

  // Fire the initial prompt once on mount.
  const [initialFired, setInitialFired] = useState(false);
  React.useEffect(() => {
    if (initialPrompt && !initialFired) {
      setInitialFired(true);
      void submit(initialPrompt);
    }
  }, [initialPrompt, initialFired, submit]);

  // Custom Ctrl-C / Ctrl-D handling. We disable exitOnCtrlC on the render
  // side so we can interpret Ctrl-C as "abort the turn" instead of exit.
  useInput((inputChar, key) => {
    if (key.ctrl && inputChar === 'c') {
      if (status === 'streaming') {
        cancel();
      } else {
        // No active turn: a Ctrl-C just clears the input.
        setInput('');
      }
      return;
    }
    if (key.ctrl && inputChar === 'd') {
      exit();
    }
  });

  const handleSubmit = (v: string): void => {
    const trimmed = v.trim();
    setInput('');
    if (!trimmed) return;
    if (trimmed === '/exit' || trimmed === '/quit') {
      exit();
      return;
    }
    void submit(trimmed);
  };

  return (
    <Box flexDirection="column">
      {/* Banner is printed once via a Static-friendly initial item; for
          simplicity we just print here, before history mounts. */}
      <Box marginBottom={1}>
        <Text dimColor>agent-cli — type /exit, Ctrl-C interrupt, Ctrl-D exit</Text>
      </Box>

      {/* Completed messages — these go into <Static> and scroll naturally. */}
      <ChatHistory messages={history} />

      {/* Active tools pane — only while streaming. Updates in place. */}
      {status === 'streaming' && activeTools.length > 0 ? (
        <Box flexDirection="column" marginTop={1} borderStyle="single" borderColor="gray" paddingX={1}>
          <Text bold dimColor>Active tools</Text>
          {activeTools.map((t) => (
            <ToolInvocation key={t.id} invocation={t} />
          ))}
        </Box>
      ) : null}

      {/* In-flight assistant buffer — rendered as plain text for speed.
          Markdown rendering happens AFTER the stream completes (via the
          finalized history item). */}
      {status === 'streaming' && streamingText ? (
        <Box marginTop={1} flexDirection="column">
          <Text bold color="magenta">assistant&gt;</Text>
          <Box marginLeft={2}>
            <Text>{streamingText}</Text>
          </Box>
        </Box>
      ) : null}

      {/* Input + status pinned to the bottom. */}
      <Box marginTop={1}>
        <InputBar
          value={input}
          onChange={setInput}
          onSubmit={handleSubmit}
          disabled={status === 'streaming'}
        />
      </Box>
      <StatusLine status={status} model={model} errorMessage={errorMessage} />
    </Box>
  );
}
