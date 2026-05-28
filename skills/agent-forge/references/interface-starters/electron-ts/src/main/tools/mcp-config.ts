/**
 * MCP (Model Context Protocol) server configuration for the main process.
 *
 * Replace this stub when wiring MCP servers — the typical shape is something like:
 *
 * ```ts
 * export const mcpServers = {
 *   filesystem: {
 *     command: 'npx',
 *     args: ['-y', '@modelcontextprotocol/server-filesystem', '/some/path'],
 *   },
 *   github: {
 *     command: 'npx',
 *     args: ['-y', '@modelcontextprotocol/server-github'],
 *     env: { GITHUB_PERSONAL_ACCESS_TOKEN: process.env.GITHUB_TOKEN ?? '' },
 *   },
 * };
 * ```
 *
 * Then pass `mcpServers` into your harness call inside `src/main/agent.ts`.
 */
export type McpServerConfig = {
  command: string;
  args?: string[];
  env?: Record<string, string>;
};

export const mcpServers: Record<string, McpServerConfig> = {};
