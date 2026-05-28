import type { AgentEvent } from '@/agent';

/**
 * Parse a `text/event-stream` response body as an async iterable of
 * `AgentEvent`. Returns when the server signals `[DONE]` or the stream
 * ends. Throws on JSON parse errors so callers can surface them.
 */
export async function* readAgentStream(
  response: Response,
  signal?: AbortSignal,
): AsyncGenerator<AgentEvent> {
  if (!response.body) {
    throw new Error('Response has no body');
  }
  if (!response.ok) {
    let detail = '';
    try {
      detail = await response.text();
    } catch {
      /* ignore */
    }
    throw new Error(
      `Chat API returned ${response.status} ${response.statusText}${
        detail ? `: ${detail}` : ''
      }`,
    );
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  try {
    while (true) {
      if (signal?.aborted) {
        await reader.cancel().catch(() => {});
        return;
      }
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE events are separated by a blank line.
      let sep: number;
      while ((sep = buffer.indexOf('\n\n')) !== -1) {
        const raw = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);
        const event = parseSseEvent(raw);
        if (event === null) continue;
        if (event === '[DONE]') return;
        yield event;
      }
    }

    // Flush any trailing event without a terminating blank line.
    const trailing = buffer.trim();
    if (trailing.length > 0) {
      const event = parseSseEvent(trailing);
      if (event && event !== '[DONE]') yield event;
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
      /* ignore */
    }
  }
}

function parseSseEvent(raw: string): AgentEvent | '[DONE]' | null {
  // Take the concatenation of all `data:` lines in the event block.
  const data = raw
    .split('\n')
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trimStart())
    .join('\n')
    .trim();

  if (!data) return null;
  if (data === '[DONE]') return '[DONE]';
  try {
    return JSON.parse(data) as AgentEvent;
  } catch {
    return { type: 'error', error: `Malformed SSE payload: ${data.slice(0, 120)}` };
  }
}
