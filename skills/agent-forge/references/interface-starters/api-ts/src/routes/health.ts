import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import { HealthResponseSchema } from '../types.js';

const startedAt = Date.now();

/** Read from package.json at build/load time; falls back to 0.0.0. */
const SERVICE_VERSION = process.env.npm_package_version ?? '0.0.0';

const route = createRoute({
  method: 'get',
  path: '/health',
  summary: 'Health check',
  description: 'Returns `{ ok: true, version, uptime_seconds }` when the service is up.',
  tags: ['system'],
  responses: {
    200: {
      description: 'Service is healthy',
      content: { 'application/json': { schema: HealthResponseSchema } },
    },
  },
});

export const healthRoute = new OpenAPIHono().openapi(route, (c) => {
  return c.json(
    {
      ok: true as const,
      version: SERVICE_VERSION,
      uptime_seconds: (Date.now() - startedAt) / 1000,
    },
    200,
  );
});
