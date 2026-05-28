/**
 * Mock data for the web interface preview.
 *
 * The agent-forge skill EDITS this file to customize the mock for a specific
 * user's agent. Look for `// mock content — skill replaces ...` markers; those
 * are the safe-to-overwrite fields. Structure stays the same.
 *
 * No build, no bundler. Loaded directly via <script src="mock-data.js"></script>
 * before index.html's init(). Exposes a single global: `MOCK`.
 */

window.MOCK = {
  // mock content — skill replaces with state.agent.{name, description, persona}
  agent: {
    name: 'depcheck',
    description: 'Finds duplicate and outdated dependencies in your project.',
    persona: 'precise, terse, code-first',
  },

  // Whether conditional states/elements are active. The skill flips these
  // based on state.tools and state.context.
  // mock content — skill toggles based on state.tools / state.context
  features: {
    todoWrite: true,       // adds TodoList sidebar in default state
    hitl: true,            // enables approval state button + approval-state rendering
    citations: true,       // pins CitationPopover open in default state
    streaming: true,       // default ux.streaming is token-by-token
  },

  // mock content — skill rewrites suggestions to fit the agent's purpose
  empty: {
    suggestions: [
      'Find duplicate dependencies in this monorepo',
      'Which packages are pinned to outdated versions?',
      'Show me unused devDependencies',
      'Audit lockfile for phantom installs',
    ],
  },

  // mock content — skill rewrites this conversation in the agent's voice
  // about a problem the agent is plausibly built to solve.
  default: {
    messages: [
      {
        id: 'm1',
        role: 'user',
        content: 'Find duplicate dependencies in package.json across the workspace.',
      },
      {
        id: 'm2',
        role: 'assistant',
        content:
          "I'll scan the workspace's package.json files and group identical packages by name. Three duplicates show up [1]:\n\n```\nlodash       4.17.21  (apps/web, packages/utils)\nzod          3.22.4   (apps/api, packages/schema, packages/utils)\nreact        18.2.0   (apps/web, apps/admin)\n```\n\nThe `zod` pin in `packages/utils` is one minor behind the others. Want me to align them?",
        toolCalls: [
          {
            id: 't1',
            name: 'glob',
            status: 'done',
            expanded: false,
            args: { pattern: '**/package.json' },
            result: ['apps/web/package.json', 'apps/api/package.json', 'apps/admin/package.json', 'packages/schema/package.json', 'packages/utils/package.json'],
          },
          {
            id: 't2',
            name: 'file_read',
            status: 'done',
            expanded: true,
            args: { paths: ['apps/web/package.json', 'packages/utils/package.json'] },
            result: { 'apps/web/package.json': '{ "dependencies": { "lodash": "4.17.21", "react": "18.2.0", "zod": "3.22.4" } }', 'packages/utils/package.json': '{ "dependencies": { "lodash": "4.17.21", "zod": "3.22.3" } }' },
          },
        ],
      },
    ],
    citations: [
      {
        index: 1,
        title: 'npm — duplicate dependency resolution',
        source: 'https://docs.npmjs.com/cli/v10/commands/npm-dedupe',
        excerpt: 'Searches the local package tree and attempts to simplify by moving dependencies up the tree.',
      },
    ],
  },

  // mock content — skill rewrites partial-message text in agent voice
  streaming: {
    partialMessage:
      "I'll align the `zod` pin to `3.22.4` across all packages. Running `pnpm up -r zod@3.22.4` would be the cleanest fix, but let me first check whether any package has a stricter constraint",
    inProgressTool: {
      id: 't3',
      name: 'bash',
      status: 'running',
      args: { command: 'pnpm why zod --recursive' },
    },
  },

  // mock content — skill replaces with a representative HITL tool + diff
  approval: {
    pendingApproval: {
      id: 'a1',
      toolName: 'file_edit',
      summary: 'packages/utils/package.json',
      args: {
        path: 'packages/utils/package.json',
        old: '"zod": "3.22.3"',
        new: '"zod": "3.22.4"',
      },
      diff: {
        before: '{\n  "name": "@workspace/utils",\n  "dependencies": {\n    "lodash": "4.17.21",\n    "zod": "3.22.3"\n  }\n}\n',
        after:  '{\n  "name": "@workspace/utils",\n  "dependencies": {\n    "lodash": "4.17.21",\n    "zod": "3.22.4"\n  }\n}\n',
      },
    },
  },

  // mock content — skill may swap message/type to match ux.errorPolicy
  error: {
    lastError: {
      type: 'rate_limit',
      message: 'LLM API rate-limited (429). Retrying in 8s...',
      retryIn: 8,
    },
  },

  // mock content — only rendered when features.todoWrite is true
  todos: [
    { text: 'Glob all package.json files', status: 'completed' },
    { text: 'Group deps by name across workspace', status: 'completed' },
    { text: 'Align outdated zod pin in packages/utils', status: 'in_progress' },
    { text: 'Re-run dedupe and confirm lockfile clean', status: 'pending' },
  ],
};
