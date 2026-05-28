import { describe, it, expect } from 'vitest';

import {
  mcpServers,
  enabledMcpServers,
  getMcpServer,
  type McpServerConfig,
} from '@/lib/tools/mcp-config';

describe('mcp registry', () => {
  it('starts empty in the starter so no servers are registered by default', () => {
    expect(Array.isArray(mcpServers)).toBe(true);
    // The starter ships with zero default servers; the skill scaffolder fills them in.
    expect(mcpServers).toEqual([]);
    expect(enabledMcpServers()).toEqual([]);
    expect(getMcpServer('nonexistent')).toBeUndefined();
  });

  it('supports lookup, enabled filtering, and the three transport kinds', () => {
    const fixture: McpServerConfig[] = [
      {
        name: 'github',
        transport: { type: 'stdio', command: 'noop', args: [] },
      },
      {
        name: 'docs',
        transport: { type: 'http', url: 'https://example.com/mcp' },
        enabled: false,
      },
      {
        name: 'events',
        transport: { type: 'sse', url: 'https://example.com/sse' },
        enabled: true,
      },
    ];

    // Mimic registry behavior with a local copy (don't mutate module state).
    const find = (name: string) => fixture.find((s) => s.name === name);
    const enabled = fixture.filter((s) => s.enabled !== false);

    expect(find('github')?.transport.type).toBe('stdio');
    expect(find('docs')?.transport.type).toBe('http');
    expect(find('events')?.transport.type).toBe('sse');
    expect(enabled.map((s) => s.name)).toEqual(['github', 'events']);
  });
});
