import { z } from '@hono/zod-openapi';

export type { AgentEvent, HistoryMessage } from './agent.js';

/** Single chat message in the request payload. */
export const ChatMessageSchema = z
  .object({
    role: z.enum(['user', 'assistant', 'system']).openapi({ example: 'user' }),
    content: z.string().openapi({ example: 'Hello, agent.' }),
  })
  .openapi('ChatMessage');

/** POST /api/chat request body. */
export const ChatRequestSchema = z
  .object({
    messages: z
      .array(ChatMessageSchema)
      .min(1)
      .openapi({ description: 'Conversation history. The last message is treated as the new prompt.' }),
  })
  .openapi('ChatRequest');

/** GET /api/health response body. */
export const HealthResponseSchema = z
  .object({
    ok: z.literal(true),
    version: z.string().openapi({ example: '0.1.0' }),
    uptime_seconds: z.number().openapi({ example: 12.34 }),
  })
  .openapi('HealthResponse');

/** Generic error envelope returned for 4xx/5xx JSON responses. */
export const ErrorResponseSchema = z
  .object({
    error: z.string().openapi({ example: 'Missing prompt' }),
  })
  .openapi('ErrorResponse');

export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type ChatRequest = z.infer<typeof ChatRequestSchema>;
export type HealthResponse = z.infer<typeof HealthResponseSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
