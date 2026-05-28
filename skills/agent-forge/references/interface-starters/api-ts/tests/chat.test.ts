import { describe, it, expect } from 'vitest';
import app from '../src/index.js';
import type { AgentEvent } from '../src/agent.js';

/** Drain an SSE response body into the array of decoded AgentEvent objects. */
async function readSseEvents(
  res: Response,
): Promise<{ events: AgentEvent[]; done: boolean }> {
  if (!res.body) throw new Error('Response has no body');
  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  const events: AgentEvent[] = [];
  let done = false;

  while (true) {
    const { value, done: streamDone } = await reader.read();
    if (streamDone) break;
    buffer += decoder.decode(value, { stream: true });

    let sep: number;
    while ((sep = buffer.indexOf('\n\n')) !== -1) {
      const raw = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      const data = raw
        .split('\n')
        .filter((l) => l.startsWith('data:'))
        .map((l) => l.slice(5).trimStart())
        .join('\n');
      if (!data) continue;
      if (data === '[DONE]') {
        done = true;
        continue;
      }
      events.push(JSON.parse(data) as AgentEvent);
    }
  }
  return { events, done };
}

describe('POST /api/chat', () => {
  it('streams placeholder agent events terminating in [DONE]', async () => {
    const res = await app.request('/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'ping' }],
      }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toMatch(/text\/event-stream/);

    const { events, done } = await readSseEvents(res);
    expect(done).toBe(true);
    expect(events.length).toBeGreaterThan(0);

    // Placeholder agent emits only text deltas.
    for (const evt of events) {
      expect(evt.type).toBe('text');
    }
    const combined = events
      .filter((e): e is Extract<AgentEvent, { type: 'text' }> => e.type === 'text')
      .map((e) => e.delta)
      .join('');
    expect(combined).toContain('Placeholder agent');
    expect(combined).toContain('You typed: ping');
  });

  it('includes the prior message count in the stream when history is provided', async () => {
    const res = await app.request('/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'user', content: 'first turn' },
          { role: 'assistant', content: 'first reply' },
          { role: 'user', content: 'second turn' },
        ],
      }),
    });
    expect(res.status).toBe(200);

    const { events } = await readSseEvents(res);
    const text = events
      .filter((e): e is Extract<AgentEvent, { type: 'text' }> => e.type === 'text')
      .map((e) => e.delta)
      .join('');
    expect(text).toContain('2 prior messages');
    expect(text).toContain('You typed: second turn');
  });

  it('returns 400 for an invalid request body (zod validation)', async () => {
    const res = await app.request('/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ wrong: 'shape' }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 when the last message is not a non-empty user message', async () => {
    const res = await app.request('/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'assistant', content: 'hi' }],
      }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/user message/i);
  });

  it('returns 400 when messages is an empty array', async () => {
    const res = await app.request('/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ messages: [] }),
    });
    expect(res.status).toBe(400);
  });
});
