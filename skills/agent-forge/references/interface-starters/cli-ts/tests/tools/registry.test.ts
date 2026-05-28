import { describe, it, expect } from 'vitest';
import { mcpServers, enabledMcpServers } from '../../src/tools/mcp-config.js';

// Placeholder tests — the skill extends this file with one assertion per
// configured MCP server / custom tool during generation.
describe('tool registry', () => {
  it('mcpServers is an array', () => {
    expect(Array.isArray(mcpServers)).toBe(true);
  });

  it('enabledMcpServers excludes disabled entries', () => {
    const enabled = enabledMcpServers();
    expect(enabled.every((s) => !s.disabled)).toBe(true);
  });
});
