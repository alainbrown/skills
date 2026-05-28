/**
 * useAgentStream — React hook owning the live agent-turn state.
 *
 * Exposes a small imperative API (start, cancel) plus state for the
 * App component to render:
 *
 *   - history:       completed messages (stable; goes into <Static>)
 *   - streaming:     current assistant buffer + active tool invocations
 *   - status:        idle | streaming | error
 *
 * Why an imperative submit instead of just declarative state? Submitting
 * a new prompt is an event, not a derived value — making it a state
 * transition would force the App to deal with a "submit token" or extra
 * re-render cycles.
 */

import { useCallback, useRef, useState } from 'react';
import { streamAgent } from '../agent.js';
import { drainStream, type ToolInvocation } from '../lib/stream.js';

export type ChatMessage =
  | { role: 'user'; text: string; id: string }
  | { role: 'assistant'; text: string; toolInvocations: ToolInvocation[]; id: string };

export type StreamStatus = 'idle' | 'streaming' | 'error';

export type UseAgentStream = {
  history: ChatMessage[];
  streamingText: string;
  activeTools: ToolInvocation[];
  status: StreamStatus;
  errorMessage: string | null;
  submit: (prompt: string) => Promise<void>;
  cancel: () => void;
};

export function useAgentStream(): UseAgentStream {
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [streamingText, setStreamingText] = useState('');
  const [activeTools, setActiveTools] = useState<ToolInvocation[]>([]);
  const [status, setStatus] = useState<StreamStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const acRef = useRef<AbortController | null>(null);

  const cancel = useCallback(() => {
    acRef.current?.abort();
  }, []);

  const submit = useCallback(async (prompt: string) => {
    if (!prompt.trim()) return;
    const userId = `u-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const asstId = `a-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // Push user message immediately so it shows in the static history.
    setHistory((h) => [...h, { role: 'user', text: prompt, id: userId }]);
    setStreamingText('');
    setActiveTools([]);
    setStatus('streaming');
    setErrorMessage(null);

    const ac = new AbortController();
    acRef.current = ac;

    // Use refs-via-closure for the latest streaming text/tools — setState is
    // batched, but for tool ordering we need the previous list, which React
    // gives us in the functional updater.
    const result = await drainStream(streamAgent(prompt), ac.signal, {
      onTextDelta: (delta) => setStreamingText((t) => t + delta),
      onToolStart: (inv) => setActiveTools((tools) => [...tools, inv]),
      onToolEnd: (id, st, preview) =>
        setActiveTools((tools) =>
          tools.map((t) =>
            t.id === id ? { ...t, status: st, resultPreview: preview } : t,
          ),
        ),
      onError: (msg) => {
        setErrorMessage(msg);
        setStatus('error');
      },
    });

    // Flush the assistant message into the static history.
    // We read the latest streaming text and tools from the closures via
    // setState callbacks to capture the actual final values.
    setActiveTools((toolsFinal) => {
      setStreamingText((textFinal) => {
        setHistory((h) => [
          ...h,
          {
            role: 'assistant',
            text: result.aborted ? textFinal + '\n[interrupted]' : textFinal,
            toolInvocations: toolsFinal,
            id: asstId,
          },
        ]);
        return '';
      });
      return [];
    });

    if (result.aborted) {
      setStatus('idle');
    } else if (status !== 'error') {
      setStatus('idle');
    }

    acRef.current = null;
  }, [status]);

  return {
    history,
    streamingText,
    activeTools,
    status,
    errorMessage,
    submit,
    cancel,
  };
}
