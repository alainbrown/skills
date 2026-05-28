/**
 * Node.js entry point. Wraps the Web-standard Hono app with
 * `@hono/node-server` so it runs on a plain `node` process.
 *
 * Other runtimes do not need this file:
 *   - Bun:                 `bun run src/index.ts`
 *   - Cloudflare Workers:  `wrangler dev` against `src/index.ts`
 *   - Vercel Edge / Deno:  point your config at `src/index.ts`
 */
import { serve } from '@hono/node-server';
import app from './index.js';

const port = Number(process.env.PORT ?? 3000);

serve({ fetch: app.fetch, port }, (info) => {
  // eslint-disable-next-line no-console
  console.log(`agent-api listening on http://localhost:${info.port}`);
  // eslint-disable-next-line no-console
  console.log(`  docs:    http://localhost:${info.port}/docs`);
  // eslint-disable-next-line no-console
  console.log(`  openapi: http://localhost:${info.port}/openapi.json`);
});
