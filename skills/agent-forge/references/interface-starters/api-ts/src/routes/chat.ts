import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { streamAgent, type HistoryMessage } from '../agent.js';
import { sseFromAgentEvents, sseHeaders } from '../lib/stream.js';
import { ChatRequestSchema, ErrorResponseSchema } from '../types.js';

const route = createRoute({
  method: 'post',
  path: '/chat',
  summary: 'Stream a chat completion from the agent',
  description:
    'Accepts a list of messages (last one is the new user prompt). Responds with ' +
    '`text/event-stream`: each `data:` line carries one AgentEvent JSON object. ' +
    'The stream terminates with `data: [DONE]`.',
  tags: ['agent'],
  request: {
    body: {
      required: true,
      content: { 'application/json': { schema: ChatRequestSchema } },
    },
  },
  responses: {
    200: {
      description:
        'SSE stream of AgentEvent JSON, one per `data:` line, terminated by `data: [DONE]`.',
      content: { 'text/event-stream': { schema: z.string() } },
    },
    400: {
      description: 'Invalid request body or empty conversation.',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

export const chatRoute = new OpenAPIHono().openapi(route, (c) => {
  const { messages } = c.req.valid('json');

  // The last message is the new prompt; prior turns are the history.
  const last = messages[messages.length - 1];
  if (!last || last.role !== 'user' || last.content.trim().length === 0) {
    return c.json(
      { error: 'Last message must be a non-empty user message.' },
      400,
    );
  }
  const prompt = last.content;
  const history: HistoryMessage[] = messages.slice(0, -1).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const stream = sseFromAgentEvents(streamAgent(prompt, history));
  return new Response(stream, { status: 200, headers: sseHeaders });
});
