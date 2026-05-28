/**
 * MCP server registry stub.
 *
 * The harness snippet reads this list to know which MCP servers to connect to.
 * Add entries when wiring up new MCP servers; the skill will populate this with
 * the user's chosen servers during generation.
 */

export interface McpServerConfig {
  /** Stable id used by the harness to address this server. */
  name: string;
  /** Command + args for the stdio transport (most MCP servers). */
  command: string;
  args?: string[];
  /** Optional env passed to the spawned MCP server. */
  env?: Record<string, string>;
  /** When true, the harness will skip this entry without failing. */
  disabled?: boolean;
}

export const mcpServers: McpServerConfig[] = [
  // Example — uncomment & customize, or let the skill fill these in.
  // {
  //   name: 'filesystem',
  //   command: 'npx',
  //   args: ['-y', '@modelcontextprotocol/server-filesystem', process.cwd()],
  // },
];

export function enabledMcpServers(): McpServerConfig[] {
  return mcpServers.filter((s) => !s.disabled);
}
