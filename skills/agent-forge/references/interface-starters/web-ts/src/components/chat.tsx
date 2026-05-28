'use client';

import * as React from 'react';
import { ArrowDown, MessageSquareText } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Message } from '@/components/message';
import { InputBar } from '@/components/input-bar';
import { useStickyScroll } from '@/hooks/use-sticky-scroll';
import { readAgentStream } from '@/lib/stream';
import {
  makeId,
  type ChatMessage,
  type ToolInvocation,
} from '@/lib/chat-types';

const CHAT_ENDPOINT = '/api/chat';

export function Chat() {
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = React.useState(false);
  const [pendingFirstToken, setPendingFirstToken] = React.useState(false);
  const abortRef = React.useRef<AbortController | null>(null);

  const { containerRef, scrollToBottom, isAtBottom } =
    useStickyScroll<HTMLDivElement>();

  const sendMessage = React.useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;

      const userMsg: ChatMessage = {
        id: makeId(),
        role: 'user',
        content: trimmed,
        tools: [],
        createdAt: Date.now(),
      };
      const assistantId = makeId();
      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        tools: [],
        streaming: true,
        createdAt: Date.now(),
      };

      // Build the history payload from messages BEFORE the new user turn.
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      history.push({ role: 'user', content: trimmed });

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setIsStreaming(true);
      setPendingFirstToken(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch(CHAT_ENDPOINT, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ messages: history }),
          signal: controller.signal,
        });

        for await (const event of readAgentStream(res, controller.signal)) {
          setPendingFirstToken(false);
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? applyEvent(m, event) : m)),
          );
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, streaming: false } : m,
            ),
          );
        } else {
          const message = err instanceof Error ? err.message : String(err);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, streaming: false, error: message }
                : m,
            ),
          );
        }
      } finally {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, streaming: false } : m,
          ),
        );
        setIsStreaming(false);
        setPendingFirstToken(false);
        abortRef.current = null;
      }
    },
    [isStreaming, messages],
  );

  const stop = React.useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const isEmpty = messages.length === 0;

  return (
    <>
      <div
        ref={containerRef}
        className="relative flex-1 overflow-y-auto pb-6 pt-4"
        data-testid="chat-scroll"
      >
        {isEmpty ? (
          <EmptyState />
        ) : (
          <ol className="flex flex-col gap-6" aria-label="Chat messages">
            {messages.map((m) => (
              <Message key={m.id} message={m} />
            ))}
            {pendingFirstToken && <ThinkingIndicator />}
          </ol>
        )}
      </div>

      {!isAtBottom && !isEmpty && (
        <div className="pointer-events-none flex justify-center">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => scrollToBottom(true)}
            className="pointer-events-auto -mt-10 mb-2 h-7 gap-1 rounded-full px-3 text-xs shadow-md"
          >
            <ArrowDown className="!size-3" />
            Jump to latest
          </Button>
        </div>
      )}

      <InputBar
        disabled={isStreaming}
        onSubmit={sendMessage}
        onStop={isStreaming ? stop : undefined}
      />
    </>
  );
}

function applyEvent(
  msg: ChatMessage,
  event: import('@/agent').AgentEvent,
): ChatMessage {
  switch (event.type) {
    case 'text':
      return { ...msg, content: msg.content + event.delta };
    case 'tool_use': {
      const invocation: ToolInvocation = {
        id: event.id,
        name: event.name,
        input: event.input,
        status: 'pending',
      };
      return { ...msg, tools: [...msg.tools, invocation] };
    }
    case 'tool_result': {
      const tools = msg.tools.map((t) =>
        t.id === event.id
          ? { ...t, result: event.result, isError: event.isError, status: 'complete' as const }
          : t,
      );
      return { ...msg, tools };
    }
    case 'error':
      return { ...msg, error: event.error };
    default:
      return msg;
  }
}

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
      <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-4">
        <MessageSquareText className="size-6 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-medium">Start a conversation</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Type a message to talk to the placeholder agent. Swap in a real
          harness by editing <code className="rounded bg-muted px-1 py-0.5 text-[11px]">src/agent.ts</code>.
        </p>
      </div>
    </div>
  );
}

function ThinkingIndicator() {
  return (
    <li
      aria-label="Agent is thinking"
      className="flex items-center gap-2 px-4 text-xs text-muted-foreground"
      data-testid="thinking-indicator"
    >
      <span className="relative inline-flex">
        <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-foreground/40" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-foreground/60" />
      </span>
      thinking...
    </li>
  );
}
