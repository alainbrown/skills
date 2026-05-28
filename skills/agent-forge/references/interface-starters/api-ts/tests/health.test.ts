import { describe, it, expect } from 'vitest';
import app from '../src/index.js';

describe('GET /api/health', () => {
  it('returns ok + version + uptime', async () => {
    const res = await app.request('/api/health');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toMatch(/application\/json/);

    const body = (await res.json()) as {
      ok: boolean;
      version: string;
      uptime_seconds: number;
    };
    expect(body.ok).toBe(true);
    expect(typeof body.version).toBe('string');
    expect(typeof body.uptime_seconds).toBe('number');
    expect(body.uptime_seconds).toBeGreaterThanOrEqual(0);
  });
});
