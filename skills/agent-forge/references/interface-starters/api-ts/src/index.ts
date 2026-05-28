import { OpenAPIHono } from '@hono/zod-openapi';
import { chatRoute } from './routes/chat.js';
import { healthRoute } from './routes/health.js';
import { attachOpenApiDocs } from './lib/openapi.js';

/**
 * Build the fully-wired Hono app. Exported as `app` for tests and as the
 * default export for runtimes that auto-detect a `{ fetch }` handler
 * (Cloudflare Workers, Vercel Edge, Deno Deploy, Bun.serve).
 *
 * For Node, the dedicated entry point `src/server.ts` wraps this with
 * `@hono/node-server`'s `serve()`.
 */
export const app = new OpenAPIHono();

app.route('/api', healthRoute);
app.route('/api', chatRoute);

attachOpenApiDocs(app);

// Friendly root — point humans at the docs.
app.get('/', (c) =>
  c.json({
    name: 'agent-api',
    docs: '/docs',
    openapi: '/openapi.json',
    endpoints: ['GET /api/health', 'POST /api/chat'],
  }),
);

export default app;
