import { streamAgent, type AgentEvent, type HistoryMessage } from '@/agent';

export const runtime = 'nodejs';
// Allow streaming responses up to 5 minutes; tune for your harness/model.
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

type ChatRequestBody = {
  prompt?: string;
  messages?: Array<{ role: 'user' | 'assistant'; content: string }>;
};

/**
 * POST /api/chat
 *
 * Body: { prompt: string, messages?: [...] }  OR  { messages: [...] }
 *
 * Streams Server-Sent Events back. Each event is one `AgentEvent` JSON
 * object on a single `data:` line. The client (see src/components/chat.tsx)
 * parses these and updates message state in real time.
 */
export async function POST(req: Request): Promise<Response> {
  let body: ChatRequestBody;
  try {
    body = (await req.json()) as ChatRequestBody;
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body' }),
      { status: 400, headers: { 'content-type': 'application/json' } },
    );
  }

  // Accept either { prompt, messages: history } or { messages: [...] } where
  // the last user message is the prompt and prior turns are the history.
  let prompt = (body.prompt ?? '').trim();
  let history: HistoryMessage[] = (body.messages ?? []).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  if (!prompt && history.length > 0) {
    const lastUser = [...history].reverse().find((m) => m.role === 'user');
    if (lastUser) {
      prompt = lastUser.content;
      history = history.filter((m) => m !== lastUser);
    }
  }

  if (!prompt) {
    return new Response(
      JSON.stringify({ error: 'Missing prompt' }),
      { status: 400, headers: { 'content-type': 'application/json' } },
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: AgentEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };
      try {
        for await (const event of streamAgent(prompt, history)) {
          send(event);
        }
        // Signal a clean close; clients can use this to flip "thinking" off.
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        send({ type: 'error', error: message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
      'x-accel-buffering': 'no',
    },
  });
}
