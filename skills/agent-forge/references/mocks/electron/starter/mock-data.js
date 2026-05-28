// mock-data.js — sample content for the electron-interface mock.
//
// Vanilla JS, NO modules. Loaded BEFORE the inline script in index.html
// so `MOCK` is available as a window-global.
//
// Customize for your agent: swap `agent.name`, the sidebar tree, the
// editor content, the chat messages, the pending-approval diff, and
// the persona to match the design you're previewing.

const MOCK = {
  // ───────── Agent identity ─────────
  agent: {
    name: 'RecipeKeeper',
    description: 'A desktop assistant for organizing your personal recipe collection — substitutions, scaling, and tidy edits to your saved recipes.',
    persona:
      'Practical and kitchen-tested. Suggests substitutions with a reason; never assumes a measurement. Pauses before editing a saved recipe.',
  },

  // ───────── Empty state ─────────
  empty: {
    suggestions: [
      {
        title: 'Suggest a substitution',
        body: 'What can I use instead of fish sauce in pad thai tonight?',
      },
      {
        title: 'Scale a recipe',
        body: 'Halve mains/pad-thai.md for 2 servings.',
      },
      {
        title: 'Plan from what I have',
        body: 'What can I make with eggs, ricotta, and stale bread?',
      },
      {
        title: 'Save a new recipe',
        body: 'Capture the lemon-rosemary chicken I made last night.',
      },
    ],
  },

  // ───────── Default state — full conversation ─────────
  default: {
    messages: [
      {
        role: 'user',
        content: 'I am out of fish sauce. What can I use in pad thai tonight, and will it actually taste right?',
      },
      {
        role: 'assistant',
        content:
          'Pulled your pad thai recipe and your other Southeast-Asian recipes for context. The closest swap by flavor profile is soy sauce plus a tiny pinch of anchovy paste [1] — that gives you the salt and the umami funk that fish sauce normally carries. A 1:1 swap of light soy alone will work in a pinch, but the dish will read a bit flat compared with what your saved recipe usually delivers [2].',
        citations: [
          {
            index: 1,
            title: 'recipes/mains/pad-thai.md',
            source: 'recipes/mains/pad-thai.md',
            excerpt: 'Step 4: 2 tbsp fish sauce — provides salt and characteristic umami depth.',
          },
          {
            index: 2,
            title: 'recipes/mains/lemongrass-chicken.md',
            source: 'recipes/mains/lemongrass-chicken.md',
            excerpt: 'Note from past cook: soy-only substitution made the marinade taste thin.',
          },
        ],
        toolCalls: [
          {
            id: 'tc-1',
            name: 'file_read',
            args: { path: 'recipes/mains/pad-thai.md' },
            result: '# Pad Thai\n\nServes 4. ~25 min active.\n\n## Ingredients\n- 8 oz rice noodles\n- 2 tbsp fish sauce\n- 2 tbsp tamarind paste…\n(truncated, 1.1 KB)',
            expanded: true,
          },
          {
            id: 'tc-2',
            name: 'file_read',
            args: { path: 'recipes/mains/lemongrass-chicken.md' },
            result: '# Lemongrass Chicken\n\nServes 4. Marinade 2h.\n\n## Marinade\n- 3 tbsp fish sauce\n- 2 stalks lemongrass, bruised…\n(truncated, 920 B)',
            expanded: false,
          },
        ],
      },
    ],
  },

  // ───────── Streaming state ─────────
  streaming: {
    userMessage:
      'OK do the substitution. Update the pad thai recipe so the fish sauce line shows the soy-plus-anchovy swap as an alternate.',
    partialMessage:
      "Got it. I'll add the alternate inline under the fish-sauce line so you'll see it next time you cook this. Reading the file first so I don't clob",
    inProgressTool: {
      id: 'tc-3',
      name: 'file_read',
      args: { path: 'recipes/mains/pad-thai.md' },
    },
  },

  // ───────── Approval state ─────────
  approval: {
    userMessage: 'Yes, save the substitution into the recipe.',
    assistantPartial:
      'Drafted the change to `recipes/mains/pad-thai.md`. Review the diff and approve to save.',
    pendingApproval: {
      streamId: 'stream-42',
      toolCallId: 'tc-99',
      toolName: 'file_edit',
      args: {
        path: 'recipes/mains/pad-thai.md',
        summary: 'Add soy + anchovy alternate to the fish sauce ingredient line.',
      },
      diff: {
        before: '## Ingredients\n- 8 oz rice noodles\n- 2 tbsp fish sauce\n- 2 tbsp tamarind paste\n- 2 tbsp palm sugar\n- 3 cloves garlic, minced',
        after:  '## Ingredients\n- 8 oz rice noodles\n- 2 tbsp fish sauce  (or: 2 tbsp light soy + 1/4 tsp anchovy paste)\n- 2 tbsp tamarind paste\n- 2 tbsp palm sugar\n- 3 cloves garlic, minced',
      },
    },
  },

  // ───────── Error state ─────────
  error: {
    userMessage: 'Pull up the cookie recipe I saved last weekend.',
    lastError: {
      kind: 'llm_api_timeout',
      message: 'LLM API timeout — retrying (2/3)…',
      retryable: true,
    },
  },

  // ───────── Sibling UI: TodoList ─────────
  todos: [
    { text: 'Pull up pad-thai.md', status: 'completed' },
    { text: 'Check other SE-Asian recipes for context', status: 'completed' },
    { text: 'Draft fish-sauce substitution note', status: 'in_progress' },
    { text: 'Apply approved edit to recipe file', status: 'pending' },
    { text: 'Add cross-reference to lemongrass-chicken.md', status: 'pending' },
  ],

  // ───────── Three-pane sidebar ─────────
  sidebar: {
    rootLabel: '~/recipes',
    syncedAgo: '2s',
    files: {
      // a small tree — `expanded` controls render in single-render mode
      name: 'recipes',
      isDir: true,
      expanded: true,
      children: [
        {
          name: 'breakfast',
          isDir: true,
          expanded: false,
          children: [
            { name: 'pancakes.md', isDir: false },
            { name: 'baked-oats.md', isDir: false },
          ],
        },
        {
          name: 'mains',
          isDir: true,
          expanded: true,
          children: [
            { name: 'pad-thai.md', isDir: false, active: true },
            { name: 'lemongrass-chicken.md', isDir: false },
            { name: 'mushroom-risotto.md', isDir: false },
            { name: 'sheet-pan-salmon.md', isDir: false },
            { name: 'weeknight-tacos.md', isDir: false },
          ],
        },
        {
          name: 'desserts',
          isDir: true,
          expanded: false,
          children: [{ name: 'chocolate-chip-cookies.md', isDir: false }],
        },
        { name: 'index.md', isDir: false },
        { name: 'TODO.md', isDir: false },
      ],
    },
  },

  // ───────── Three-pane editor ─────────
  editor: {
    activeFile: {
      path: 'recipes/mains/pad-thai.md',
      dirty: false,
      content: [
        '# Pad Thai',
        '',
        '> Serves 4. ~25 min active. Adapted from the corner stall in Chiang Mai, 2019.',
        '',
        '## Idea in one sentence',
        '',
        'Rice noodles wok-tossed with a sweet-sour-salty sauce, tofu and shrimp,',
        'finished with peanuts, lime, and a generous handful of bean sprouts.',
        '',
        '## Why it works',
        '',
        '- The sauce comes together **before** the wok is hot — no scrambling.',
        '- Soaking noodles in **warm** water (not boiling) keeps them al dente.',
        '- The garnish plate is **non-negotiable**: peanuts, lime, sprouts, chili.',
        '',
        '## Ingredients',
        '',
        '```',
        '8 oz rice noodles, soaked 20 min in warm water',
        '2 tbsp fish sauce',
        '2 tbsp tamarind paste, 2 tbsp palm sugar',
        '3 cloves garlic minced, 4 oz firm tofu cubed, 6 oz shrimp peeled',
        '2 eggs, beaten. 2 cups bean sprouts. 3 scallions, sliced.',
        '```',
        '',
        '## See also',
        '',
        '- [[lemongrass-chicken]] — same sauce family, different protein.',
        '- [[mushroom-risotto]] — when you want something quiet, not loud.',
        '',
      ].join('\n'),
    },
  },
};

// Make available as a global for the inline script (no modules, no build).
window.MOCK = MOCK;
