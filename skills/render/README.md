# render

Create interactive, LLM-powered browser experiences — wizards, forms, chat interfaces, and conversational workflows rendered as React components in the browser.

## Usage

The skill triggers automatically when you describe a browser-based interactive experience:

```
"Render me a 3-step wizard that helps set up a new project"
"I want a browser-based chat interface for code review"
"Build me a survey that adapts questions based on previous answers"
"Create an interactive form that generates a report"
```

You can also invoke it directly with `/render`.

## What it does

The render skill gives the agent a browser UI layer. Instead of generating a standalone app and walking away, the agent:

1. **Designs** the experience with you (identifies the pattern, confirms the steps)
2. **Generates** a workspace with a lightweight runtime and custom React components
3. **Launches** a local server and opens the experience in your browser
4. **Enters a conversation loop** — your browser input flows back to the agent via stdout, the agent processes it and updates the UI in real time

The agent IS the LLM. No external API keys needed. The browser is just a rendering surface.

## Features

- **Four experience patterns** — Wizard, Chat, Form→Response, Dashboard (and composites — a wizard step can contain a chat)
- **Stdout communication protocol** — browser input flows to agent via server stdout; agent writes state.json; server pushes updates via SSE
- **Shipped runtime** — server.mjs, shell.html, and package.json are actual files copied into each workspace (not regenerated). The agent only customizes the components and styles.
- **Streaming responses** — for chat patterns, the agent writes state incrementally so text appears progressively in the browser
- **Branching wizards** — steps can branch based on user choices; the agent decides the path, not the browser
- **Back/undo** — wizard steps preserve field values when navigating back
- **Durable context** — `memory.json` captures the design spec and key facts, survives context compression. On long sessions, the agent asks what to carry forward.
- **Dark mode by default** — base theme with markdown styles, system fonts, and thinking indicators built into the shell
- **Self-contained workspaces** — each experience is a standalone directory. Run `npm start` to relaunch anytime.

## How it works

```
Browser → POST /input → Server prints JSON to stdout → Agent reads TaskOutput
                                                              ↓
                                                     Agent processes input
                                                              ↓
                                              Agent writes updated state.json
                                                              ↓
                              Server detects change (fs.watch) → SSE push → Browser re-renders
```

## Test scenarios

| Scenario | Prompt | Tests |
|----------|--------|-------|
| **Wizard** | "Render me a 3-step project setup wizard" | Multi-step forms, progress tracking, agent generates content between steps |
| **Chat** | "Browser-based chat for code review" | Message list, markdown/code rendering, conversation loop |
| **Ambiguous** | "Adaptive survey that gives a personalized report" | Pattern identification (wizard), dynamic question generation, design interview |

## Eval results

Tested across 2 iterations against baseline (no skill), 3 scenarios, 6 criteria each.

| Eval | Skill Wins | Ties | Baseline Wins |
|------|-----------|------|--------------|
| Wizard | 5/6 | 1/6 | 0/6 |
| Chat | 5/6 | 1/6 | 0/6 |
| Survey | 5/6 | 1/6 | 0/6 |
| **Total** | **15/18 (83%)** | **3/18** | **0/18** |

### Where the skill wins

- **Runtime architecture** — baseline never produces the server+SSE+state.json system
- **Communication loop** — baseline has zero agent involvement after generation
- **Design phase** — baseline jumps straight to code
- **No API keys** — the agent IS the LLM; baselines require external API keys or hardcode logic

### Where the baseline holds up

- **Component polish** — baselines produced well-styled UIs (a11y, streaming, syntax highlighting)
- **Launchability** — some baselines simpler to start (open HTML directly)

### Key findings

- The survey eval showed the biggest conceptual gap. Baseline hardcoded ~15 question nodes with a static branching graph. The skill has the agent generate questions dynamically at each step — truly adaptive because the LLM tailors questions based on all previous context.
- Iteration-2 confirmed all new features were picked up: `memory.json` in all 3 evals, streaming in chat, branching in survey, back/undo in wizard + survey, context management in all 3.
- Runtime files copied verbatim (verified via `diff`) — zero hallucination risk on plumbing.

## Design decisions

- **Agent-as-LLM** — the agent's own intelligence powers the experience, not an external API. This means no API keys, no provider lock-in, and the agent can use its full conversation context.
- **Stdout for communication** — the server prints browser input to stdout, which the agent reads from its background task output. This is a natural Claude Code pattern (background process + TaskOutput) that avoids file polling or WebSockets from the agent side.
- **Shipped runtime files** — server.mjs, shell.html, and package.json are actual files in the skill's `runtime/` directory, copied as-is into each workspace. The agent only generates the creative parts (components, styles, state). This prevents re-hallucination of boilerplate and ensures the plumbing is always correct.
- **SSE over WebSocket** — Server-Sent Events are simpler, unidirectional (server→browser), and sufficient since browser→agent communication goes through POST /input. No need for bidirectional sockets.
- **Babel standalone** — in-browser JSX transpilation means no build step, no node_modules for the frontend, and the agent can update components by editing a single HTML file.
- **memory.json for durable context** — separate from state.json (which is for the browser). Captures the design spec and key facts so the agent can re-orient after context compression. On long sessions, the agent asks the user what to carry forward rather than guessing — the user knows their domain better.
