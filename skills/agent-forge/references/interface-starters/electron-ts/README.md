# agent-electron

Electron + React + IPC streaming starter for the **agent-forge** skill. Replace
`src/main/agent.ts` with a harness snippet (Anthropic Agent SDK, OpenAI Agents,
Vercel AI SDK, a Python subprocess, etc.) and you have a working desktop chat app.

## Quick start

```bash
pnpm install
pnpm start            # launches Electron with HMR
```

The first time you boot, the **Settings** page is shown so you can paste API keys.
Keys are stored locally via `electron-store` and persist between launches — they are
never bundled into the renderer.

## Scripts

| Command            | What it does                                                       |
|--------------------|--------------------------------------------------------------------|
| `pnpm start`       | Electron Forge dev server (Vite HMR, opens a BrowserWindow)        |
| `pnpm package`     | Builds the app for the current platform into `out/`                |
| `pnpm make`        | Builds installers (Squirrel/ZIP/Deb/RPM) into `out/make/`          |
| `pnpm test`        | Runs Vitest (main-process bridge tests + renderer component tests) |
| `pnpm typecheck`   | TypeScript strict typecheck                                        |
| `pnpm lint`        | ESLint                                                             |

## Architecture

```
┌────────────────────────────────────┐    ┌────────────────────────────┐
│ Renderer (React, browser context)  │    │ Main (Node, Electron)      │
│                                    │    │                            │
│  Chat ─► streamAgent(prompt)       │    │  registerAgentBridge()     │
│         (renderer/lib/agent-       │    │   ├─ ipcMain.handle(...)   │
│          client.ts)                │    │   └─ for await streamAgent │
│         │                          │    │       (src/main/agent.ts)  │
│         ▼                          │    │       │                    │
│  window.api  ◄──── contextBridge ──┼────┼─► preload/index.ts         │
│                                    │    │       │                    │
│  events: agent:stream-event:<id>   │◄───┼── sender.send(...)         │
└────────────────────────────────────┘    └────────────────────────────┘
```

### IPC contract

| Channel                              | Direction         | Payload                             |
|--------------------------------------|-------------------|--------------------------------------|
| `agent:stream`                       | renderer → main   | `(prompt: string) → { streamId }`    |
| `agent:stream-event:<streamId>`      | main → renderer   | `AgentEvent`                         |
| `agent:stream-done:<streamId>`       | main → renderer   | none                                 |
| `agent:stream-error:<streamId>`      | main → renderer   | `string`                             |
| `settings:get`                       | renderer → main   | `() → AppSettings`                   |
| `settings:set`                       | renderer → main   | `(patch) → AppSettings`              |
| `shell:open-path`                    | renderer → main   | `(absPath: string) → string`         |

Per-stream channel suffixes mean multiple concurrent turns never cross-talk.

### Security posture

- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: false` (preload needs
  Node to talk to `electron`). The renderer can only touch `window.api`.
- **No CSP is set in dev** because Vite's HMR injects inline `<script>` blocks. A
  TODO comment in `index.html` points at where to add a production CSP — do this
  before distributing the app.
- API keys live in the main process only. The renderer asks `settings:get` for the
  metadata it needs to render the UI; keys are never broadcast on IPC events.

## Replacing the placeholder agent

Open `src/main/agent.ts` and look for the marker:

```ts
// === BEGIN AGENT WIRING ===
// REPLACE: This file is replaced by the harness snippet during skill generation.
// === END AGENT WIRING ===
```

Implement `streamAgent(prompt) → AsyncGenerator<AgentEvent>` — yield `text`, `tool-call`,
`tool-result`, `thinking`, or `metadata` events as the conversation progresses. The UI
will pick up each event type automatically.

For Python harnesses, spawn a subprocess from `agent.ts` and parse newline-delimited
JSON from its stdout — see `references/interfaces/electron.md` for the canonical pattern.

## Tailwind v4

This project uses `@tailwindcss/vite`. Theme tokens live in `src/renderer/index.css`
under `@theme { … }` — there is no JS-based config. The `tailwind.config.ts` and
`postcss.config.mjs` files are kept as stubs in case you need to opt into the
PostCSS pipeline later.

## Distribution (deferred)

This starter does NOT set up:

- **Code signing** — macOS Developer ID, Windows Authenticode. See [Forge code signing docs](https://www.electronforge.io/guides/code-signing).
- **Notarization** — macOS Apple notary. See [Forge notarization docs](https://www.electronforge.io/guides/code-signing#code-signing-on-macos).
- **Auto-update** — Squirrel / `electron-updater`. See [Forge auto-update docs](https://www.electronforge.io/advanced/auto-update).
- **App store submission** — Mac App Store, Microsoft Store.

For personal-use builds, `pnpm package` produces a runnable `.app`/`.exe`/binary in
`out/`. For real distribution, add the above before shipping.

## Tests

- `tests/main/agent-bridge.test.ts` — mocks `electron` + `electron-store`, dispatches
  IPC calls, asserts the placeholder agent streams text through the per-stream channel.
- `tests/renderer/Chat.test.tsx` — renders `<Chat />` with a fake `window.api`, fires
  a message, drives streaming events into the component, asserts the UI updates and
  tool-invocation cards render.

```bash
pnpm test
```

## Project layout

```
electron-ts/
├── forge.config.ts                 # Forge + Vite plugin config
├── vite.{main,preload,renderer}.config.ts
├── tailwind.config.ts / postcss.config.mjs  # stubs (Tailwind v4 uses @theme)
├── index.html                      # renderer entry — MUST live at project root
│                                   #   (Vite's renderer pass uses cwd as `root`)
├── src/
│   ├── main/
│   │   ├── index.ts                # createWindow, app lifecycle
│   │   ├── agent.ts                # PLACEHOLDER (replace with harness)
│   │   ├── agent-bridge.ts         # ipcMain handlers + stream fan-out
│   │   ├── settings.ts             # electron-store wrapper
│   │   └── tools/                  # mcp-config.ts + custom tool stubs
│   ├── preload/index.ts            # contextBridge exposes window.api
│   ├── renderer/
│   │   ├── main.tsx                # React entry — wired from /index.html
│   │   ├── App.tsx                 # routes between chat and settings
│   │   ├── components/             # Chat, Message, ToolInvocation, InputBar, Settings
│   │   ├── lib/agent-client.ts     # AsyncIterable wrapper over IPC
│   │   └── index.css               # Tailwind v4 + @theme tokens
│   └── shared/types.ts             # AgentEvent, AppSettings, IPC channel names
├── tests/{main,renderer}/...
├── .env.example
├── .npmrc                          # node-linker=hoisted (Forge requires this)
└── README.md
```

### Forge + pnpm gotchas baked in

- `.npmrc` sets `node-linker=hoisted` — Forge requires it for `pnpm package`.
- `vite.main.config.ts` and `vite.preload.config.ts` pin `entryFileNames` so the
  output is literally `main.js` and `preload.js` (Forge's main loader and
  `path.join(__dirname, 'preload.js')` depend on those names).
- `index.html` lives at the project root — Forge's renderer config uses cwd as
  Vite's `root`, so moving it under `src/renderer/` breaks the renderer build.
- `electron-store` is pinned to v8 (CJS). v10+ is ESM-only and would need a
  dynamic import in `settings.ts`.
