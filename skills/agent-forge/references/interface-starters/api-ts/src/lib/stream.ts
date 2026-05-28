import type { AgentEvent } from '../agent.js';

/**
 * Wrap an async iterable of `AgentEvent` as a `ReadableStream` of UTF-8
 * encoded SSE bytes. Each event is serialized as a single `data:` line
 * (JSON payload). The stream is terminated by `data: [DONE]\n\n` so
 * clients can flip a "thinking" flag off cleanly.
 *
 * Errors thrown by the iterator are converted into a final `error`
 * AgentEvent and the stream is closed (the connection is kept open long
 * enough for the client to read the error rather than seeing an abort).
 */
export function sseFromAgentEvents(
  events: AsyncIterable<AgentEvent>,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: AgentEvent): void => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };
      try {
        for await (const event of events) {
          send(event);
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        send({ type: 'error', error: message });
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      } finally {
        controller.close();
      }
    },
  });
}

/** Standard SSE response headers — applied at the route layer. */
export const sseHeaders: Record<string, string> = {
  'content-type': 'text/event-stream; charset=utf-8',
  'cache-control': 'no-cache, no-transform',
  connection: 'keep-alive',
  // Disable proxy buffering (e.g. nginx) so events flush in real time.
  'x-accel-buffering': 'no',
};
