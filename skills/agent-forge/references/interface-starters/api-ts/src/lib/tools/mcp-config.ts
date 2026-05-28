/**
 * MCP server registry. The agent-forge skill populates this with the
 * MCP servers the user selected during scaffolding. At runtime, the
 * harness (src/agent.ts) reads from `mcpServers` and connects to each.
 *
 * Replace this stub or extend it as the harness requires.
 */

export type McpTransport =
  | { type: 'stdio'; command: string; args?: string[]; env?: Record<string, string> }
  | { type: 'sse'; url: string; headers?: Record<string, string> }
  | { type: 'http'; url: string; headers?: Record<string, string> };

export type McpServerConfig = {
  /** Stable identifier used in tool prefixes (e.g. `github:create_issue`). */
  name: string;
  /** Human-readable description shown in UIs/logs. */
  description?: string;
  /** Transport used to connect to the server. */
  transport: McpTransport;
  /** Optional allowlist of tool names. If omitted, all server tools are exposed. */
  allowedTools?: string[];
  /** If false, the server is registered but not auto-connected at boot. */
  enabled?: boolean;
};

export const mcpServers: McpServerConfig[] = [
  // Example (commented out — replace at scaffold time):
  // {
  //   name: 'github',
  //   description: 'GitHub repo + issue tools',
  //   transport: {
  //     type: 'stdio',
  //     command: 'npx',
  //     args: ['-y', '@modelcontextprotocol/server-github'],
  //     env: { GITHUB_PERSONAL_ACCESS_TOKEN: process.env.GITHUB_TOKEN ?? '' },
  //   },
  // },
];

/** Get a server config by name. Used by the harness when wiring tools. */
export function getMcpServer(name: string): McpServerConfig | undefined {
  return mcpServers.find((s) => s.name === name);
}

/** All enabled servers (defaults to true if `enabled` is undefined). */
export function enabledMcpServers(): McpServerConfig[] {
  return mcpServers.filter((s) => s.enabled !== false);
}
