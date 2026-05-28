import { describe, it, expect } from 'vitest';
import app from '../src/index.js';

describe('OpenAPI surface', () => {
  it('GET /openapi.json returns a valid OpenAPI 3.1 spec with both routes', async () => {
    const res = await app.request('/openapi.json');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toMatch(/json/);

    const spec = (await res.json()) as {
      openapi: string;
      info: { title: string; version: string };
      paths: Record<string, unknown>;
      components?: { schemas?: Record<string, unknown> };
    };

    expect(spec.openapi).toMatch(/^3\.1/);
    expect(spec.info.title).toBe('Agent API');
    expect(typeof spec.info.version).toBe('string');

    // Mounted via `app.route('/api', sub)` — paths should be fully-prefixed.
    expect(Object.keys(spec.paths)).toEqual(
      expect.arrayContaining(['/api/health', '/api/chat']),
    );

    // Schemas should include the named exports from types.ts.
    const schemaNames = Object.keys(spec.components?.schemas ?? {});
    expect(schemaNames).toEqual(
      expect.arrayContaining(['ChatRequest', 'ChatMessage', 'HealthResponse']),
    );
  });

  it('GET /docs returns a Swagger UI HTML page', async () => {
    const res = await app.request('/docs');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toMatch(/html/);

    const html = await res.text();
    expect(html).toMatch(/swagger/i);
    // The UI should be pointed at our spec URL.
    expect(html).toContain('/openapi.json');
  });
});
