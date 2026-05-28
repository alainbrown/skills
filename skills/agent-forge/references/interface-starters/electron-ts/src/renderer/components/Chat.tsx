import { useCallback, useEffect, useRef, useState } from 'react';
import { Message, type ChatMessage } from './Message';
import { InputBar } from './InputBar';
import { streamAgent } from '../lib/agent-client';
import type { AgentEvent } from '../../shared/types';

export function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef(true);

  // Sticky scroll: only auto-pin to the bottom when the user hasn't scrolled away.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
      stickyRef.current = distance < 64;
    };
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!stickyRef.current) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, streaming]);

  const send = useCallback(async (prompt: string) => {
    if (!prompt.trim() || streaming) return;
    setError(null);
    setStreaming(true);

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: prompt,
      createdAt: Date.now(),
    };
    const assistantId = crypto.randomUUID();
    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      toolInvocations: [],
      createdAt: Date.now(),
    };
    setMessages((m) => [...m, userMsg, assistantMsg]);

    try {
      for await (const event of streamAgent(prompt)) {
        applyEvent(setMessages, assistantId, event);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setStreaming(false);
    }
  }, [streaming]);

  return (
    <div className="flex h-full flex-col">
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-6"
        data-testid="chat-scroll"
      >
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
          {messages.length === 0 && (
            <div className="rounded-lg border border-dashed border-slate-800 p-6 text-center text-sm text-slate-400">
              Start a conversation below. Replace <code>src/main/agent.ts</code> with a real harness to swap in your model.
            </div>
          )}
          {messages.map((m) => (
            <Message key={m.id} message={m} />
          ))}
          {streaming && (
            <div className="flex items-center gap-2 text-xs text-slate-500" data-testid="chat-spinner">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-brand-500" />
              <span>thinking…</span>
            </div>
          )}
          {error && (
            <div className="rounded-md border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          )}
        </div>
      </div>
      <InputBar onSend={send} disabled={streaming} />
    </div>
  );
}

function applyEvent(
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
  assistantId: string,
  event: AgentEvent,
): void {
  setMessages((prev) =>
    prev.map((m) => {
      if (m.id !== assistantId) return m;
      switch (event.type) {
        case 'text':
          return { ...m, content: m.content + event.delta };
        case 'tool_use':
          return {
            ...m,
            toolInvocations: [
              ...(m.toolInvocations ?? []),
              { id: event.id, name: event.name, input: event.input, state: 'pending' },
            ],
          };
        case 'tool_result':
          return {
            ...m,
            toolInvocations: (m.toolInvocations ?? []).map((t) =>
              t.id === event.id
                ? { ...t, output: event.result, isError: event.isError, state: 'done' }
                : t,
            ),
          };
        case 'error':
          return { ...m, content: m.content + `\n\n[error] ${event.error}` };
        default:
          return m;
      }
    }),
  );
}
