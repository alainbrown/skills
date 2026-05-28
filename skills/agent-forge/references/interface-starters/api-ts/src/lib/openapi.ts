import { OpenAPIHono } from '@hono/zod-openapi';
import { swaggerUI } from '@hono/swagger-ui';

/** Static metadata for the generated OpenAPI document. */
export const openApiInfo = {
  openapi: '3.1.0' as const,
  info: {
    title: 'Agent API',
    version: '0.1.0',
    description:
      'Server-Sent-Events streaming chat endpoint for an agent built with agent-forge. ' +
      'Each `data:` line on /api/chat carries one AgentEvent JSON object; the stream ' +
      'terminates with `data: [DONE]`. See /docs for the Swagger UI.',
  },
};

/**
 * Wire up the OpenAPI document + Swagger UI on a fully-assembled app.
 *
 * Call this once in `src/server.ts` (and the test bootstrap) after every
 * route has been mounted via `app.route(...)`. Splitting this out keeps the
 * routes file free of doc metadata and makes it trivial to disable the
 * docs in production by simply not calling this function.
 */
export function attachOpenApiDocs(app: OpenAPIHono): void {
  app.doc('/openapi.json', openApiInfo);
  app.get('/docs', swaggerUI({ url: '/openapi.json' }));
}
