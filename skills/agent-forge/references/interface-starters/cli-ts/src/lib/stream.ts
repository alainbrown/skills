/**
 * Stream consumer — drains an AsyncIterable<AgentEvent> while emitting
 * state-update callbacks. Honours an AbortSignal so a Ctrl-C in the React
 * tree can interrupt the in-flight turn cleanly.
 *
 * The React side (`useAgentStream`) calls this, NOT the agent harness
 * directly — keeps the React tree's effects pure and lets us unit-test
 * the consumer separately from rendering.
 */

import type { AgentEvent } from '../agent.js';

export type ToolInvocation = {
  id: string;
  name: string;
  input: unknown;
  status: 'running' | 'ok' | 'error';
  resultPreview?: string;
};

export type StreamHandlers = {
  onTextDelta: (delta: string) => void;
  onToolStart: (inv: ToolInvocation) => void;
  onToolEnd: (id: string, status: 'ok' | 'error', resultPreview?: string) => void;
  onError: (message: string) => void;
};

export type DrainResult = {
  text: string;
  aborted: boolean;
};

/** Cap a JSON-ish preview so we don't blow up the screen. */
export function previewValue(value: unknown, maxLen = 200): string {
  let s: string;
  try {
    s = typeof value === 'string' ? value : JSON.stringify(value);
  } catch {
    s = String(value);
  }
  return s.length > maxLen ? s.slice(0, maxLen - 1) + '…' : s;
}

export async function drainStream(
  stream: AsyncIterable<AgentEvent>,
  signal: AbortSignal,
  h: StreamHandlers,
): Promise<DrainResult> {
  let text = '';
  let aborted = false;

  try {
    for await (const event of stream) {
      if (signal.aborted) {
        aborted = true;
        break;
      }
      switch (event.type) {
        case 'text': {
          text += event.delta;
          h.onTextDelta(event.delta);
          break;
        }
        case 'tool_use': {
          h.onToolStart({
            id: event.id,
            name: event.name,
            input: event.input,
            status: 'running',
          });
          break;
        }
        case 'tool_result': {
          h.onToolEnd(
            event.id,
            event.isError ? 'error' : 'ok',
            previewValue(event.result),
          );
          break;
        }
        case 'error': {
          h.onError(event.error);
          break;
        }
      }
    }
  } catch (e) {
    h.onError(e instanceof Error ? e.message : String(e));
  }

  return { text, aborted };
}
