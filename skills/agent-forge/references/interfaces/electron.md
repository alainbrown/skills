# Interface: Electron

Desktop chat app with a window, IPC bridge between main (Node) and renderer (browser), and
streaming through the IPC channel. More involved than CLI or web — use only when desktop
distribution is a real requirement.

## When to pick Electron

| Reason to pick | Reason NOT to pick |
|----------------|-------------------|
| Need OS-level access (filesystem, notifications, system tray) | A web app would do |
| Distribute to non-technical users as `.dmg`/`.exe` | Engineers can run a CLI |
| Need to work offline / no server | Cloud is fine |
| Want auto-update without server changes | Distribution isn't a requirement |

If unsure: web first. Electron has a real maintenance cost (auto-update, code signing,
notarization on macOS, app store distribution).

## Scaffold (Electron Forge + Vite + React)

```
src/interface/electron/
├── forge.config.ts           ← Electron Forge build config
├── package.json              ← electron deps; "main": "src/main/index.ts"
├── src/
│   ├── main/
│   │   ├── index.ts          ← createWindow(); spawns/imports the agent
│   │   ├── agent-bridge.ts   ← IPC handlers for agent invocation
│   │   └── preload.ts        ← exposes safe APIs to renderer via contextBridge
│   ├── renderer/
│   │   ├── index.html
│   │   ├── App.tsx           ← chat UI
│   │   ├── components/Chat.tsx
│   │   └── lib/agent-client.ts ← calls window.api.* (exposed via preload)
│   └── shared/
│       └── types.ts          ← shared types between main and renderer
```

## Main process — agent bridge

The agent lives in the main process (Node). The renderer cannot run Node-only code, so we
expose an IPC API via the preload script.

```typescript
// src/main/agent-bridge.ts
import { ipcMain, IpcMainInvokeEvent } from "electron";
import { query } from "@anthropic-ai/claude-agent-sdk";

ipcMain.handle("agent:stream", async (event: IpcMainInvokeEvent, prompt: string) => {
  const sender = event.sender;
  try {
    for await (const message of query({ prompt, options: {/*...*/} })) {
      // Send each event back to the renderer
      sender.send("agent:stream-event", message);
    }
    sender.send("agent:stream-done");
  } catch (err) {
    sender.send("agent:stream-error", String(err));
  }
});
```

## Preload — safe API exposure

```typescript
// src/main/preload.ts
import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("api", {
  agentStream: (prompt: string) => ipcRenderer.invoke("agent:stream", prompt),
  onAgentEvent: (callback: (event: any) => void) => {
    ipcRenderer.on("agent:stream-event", (_, event) => callback(event));
  },
  onAgentDone: (callback: () => void) => {
    ipcRenderer.on("agent:stream-done", callback);
  },
  onAgentError: (callback: (err: string) => void) => {
    ipcRenderer.on("agent:stream-error", (_, err) => callback(err));
  },
});
```

## Renderer — chat UI

```tsx
// src/renderer/App.tsx
import { useEffect, useState } from "react";

declare global {
  interface Window {
    api: {
      agentStream: (prompt: string) => Promise<void>;
      onAgentEvent: (cb: (event: any) => void) => void;
      onAgentDone: (cb: () => void) => void;
      onAgentError: (cb: (err: string) => void) => void;
    };
  }
}

export function App() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);

  useEffect(() => {
    window.api.onAgentEvent((event) => {
      if (event.type === "text") {
        setMessages((m) => {
          const last = m[m.length - 1];
          if (last?.role === "assistant") {
            return [...m.slice(0, -1), { ...last, content: last.content + event.text }];
          }
          return [...m, { role: "assistant", content: event.text }];
        });
      }
    });
    window.api.onAgentDone(() => setStreaming(false));
    window.api.onAgentError((err) => {
      console.error(err);
      setStreaming(false);
    });
  }, []);

  async function send() {
    setMessages((m) => [...m, { role: "user", content: input }]);
    setInput("");
    setStreaming(true);
    await window.api.agentStream(input);
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map((m, i) => <Message key={i} message={m} />)}
        {streaming && <Spinner />}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); send(); }} className="p-4 border-t">
        <input value={input} onChange={(e) => setInput(e.target.value)} disabled={streaming} />
      </form>
    </div>
  );
}
```

## Python harness → Electron

For Python harnesses (OpenAI Agents SDK, Hermes, Aider), the agent CANNOT run inside Electron's
main process directly. Two options:

| Pattern | How |
|---------|-----|
| **Subprocess** | Electron main spawns a Python child process running the agent; pipes stdin/stdout for streaming. Simpler. |
| **Local server** | Python FastAPI runs as a separate process; Electron talks to it via HTTP/SSE on localhost. Cleaner but needs port management + launching. |

Recommend **subprocess** for desktop apps — single executable distribution, no port collisions.

```typescript
// src/main/agent-bridge.ts (Python harness via subprocess)
import { spawn } from "node:child_process";

ipcMain.handle("agent:stream", async (event, prompt: string) => {
  const py = spawn("python", ["-u", "src/main/agent_runner.py"], { stdio: ["pipe", "pipe", "pipe"] });
  py.stdin.write(JSON.stringify({ prompt }) + "\n");
  py.stdin.end();

  let buf = "";
  py.stdout.on("data", (chunk) => {
    buf += chunk.toString();
    const lines = buf.split("\n");
    buf = lines.pop()!;
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const eventData = JSON.parse(line);
        event.sender.send("agent:stream-event", eventData);
      } catch (e) {
        // ignore non-JSON lines
      }
    }
  });

  py.on("close", () => event.sender.send("agent:stream-done"));
});
```

## Distribution

The skill scaffolds the Electron app but does NOT set up:
- Code signing (macOS Developer ID, Windows Authenticode)
- Notarization (macOS Apple notary)
- Auto-updater (Squirrel, electron-updater)
- App store submission

The README explains how to add these later — links to electron-forge docs.

## Required env vars

Electron apps can't easily load `.env` at runtime if installed as `.dmg`/`.exe`. Two patterns:
- **Settings UI** — user enters keys via a settings page; persisted via electron-store
- **Bundle at build time** — keys baked into the app for personal-use only

Default: settings UI. The skill scaffolds a minimal `Settings.tsx` page wired to electron-store.

## Streaming UX

Same as Web — render tool calls visibly, sticky-scroll, markdown rendering, copy buttons.
Tool calls especially benefit from a desktop UI's richer interaction (collapsible cards,
file links that open in OS file manager, etc.).

## What to avoid

- Don't run agent logic in the renderer process — it has no Node access; secrets would leak
  to the client bundle. ALWAYS keep agent in main.
- Don't use `nodeIntegration: true` — it's a security hole. Use contextBridge.
- Don't ship without considering crash handling — long agent runs can lock the renderer if not
  streamed properly. Always use IPC events, not synchronous IPC calls, for streams.
