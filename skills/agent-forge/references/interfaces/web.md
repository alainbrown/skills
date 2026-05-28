# Interface: Web (Next.js)

The web interface is a Next.js App Router app with a chat UI on the client and an API route
that streams from the agent on the server.

## What "Web" means here

| Stack | Default | Why |
|-------|---------|-----|
| Framework | Next.js 15+ (App Router) | Most mainstream React stack; deployable to many hosts |
| UI primitives | shadcn/ui + Tailwind | Clean default; user can swap |
| Streaming | AI SDK (TS) / SSE manual (Python) | AI SDK has `useChat` + `streamText` baked in |
| Server | Next.js API route (TS) / FastAPI (Python) | Whatever matches the agent's language |

For **Python harnesses** (OpenAI Agents SDK, LangGraph, Hermes, Aider), the produced project is:
- FastAPI backend with SSE endpoint
- Static React frontend (Vite) OR Next.js as separate service

For **TS harnesses** (Claude Agent SDK, Mastra, OpenCode, Crush), Next.js is one repo for both
frontend and API.

## TS pattern (Claude Agent SDK + Next.js)

```
src/interface/web/
├── app/
│   ├── page.tsx              ← chat UI (client component)
│   └── api/chat/route.ts     ← agent invocation, returns streaming response
├── components/
│   ├── Chat.tsx              ← uses useChat() from ai/react
│   ├── Message.tsx           ← renders user/assistant messages with markdown
│   └── ToolInvocation.tsx    ← renders tool calls (collapsible)
└── lib/
    └── agent-client.ts       ← thin wrapper around the agent
```

### API route

```typescript
// app/api/chat/route.ts
import { query } from "@anthropic-ai/claude-agent-sdk";

export async function POST(req: Request) {
  const { messages } = await req.json();
  const lastUserMessage = messages[messages.length - 1]?.content;

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of query({ prompt: lastUserMessage, options: {/*...*/} })) {
          controller.enqueue(new TextEncoder().encode(JSON.stringify(event) + "\n"));
        }
      } catch (err) {
        controller.enqueue(new TextEncoder().encode(JSON.stringify({ type: "error", error: String(err) }) + "\n"));
      }
      controller.close();
    },
  });

  return new Response(stream, { headers: { "Content-Type": "text/event-stream" } });
}
```

### Client

```typescript
// components/Chat.tsx
"use client";
import { useState } from "react";

export function Chat() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");

  async function send() {
    const userMsg = { role: "user", content: input };
    setMessages((m) => [...m, userMsg]);
    setInput("");

    const res = await fetch("/api/chat", { method: "POST", body: JSON.stringify({ messages: [...messages, userMsg] }) });
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let assistantMsg = { role: "assistant", content: "" };
    setMessages((m) => [...m, assistantMsg]);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop()!;
      for (const line of lines) {
        if (!line.trim()) continue;
        const event = JSON.parse(line);
        if (event.type === "text") {
          assistantMsg = { ...assistantMsg, content: assistantMsg.content + event.text };
          setMessages((m) => [...m.slice(0, -1), assistantMsg]);
        }
      }
    }
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map((m, i) => <Message key={i} message={m} />)}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); send(); }} className="p-4 border-t">
        <input value={input} onChange={(e) => setInput(e.target.value)} className="w-full" />
      </form>
    </div>
  );
}
```

**Note:** AI SDK's `useChat` hook gives you most of this for free if you stick with its protocol.
For non-AI-SDK harnesses (OpenAI Agents SDK direct, LangGraph, etc.), use the manual pattern above.

## Python pattern (OpenAI Agents SDK + FastAPI)

```
src/interface/web/
├── server/
│   ├── main.py               ← FastAPI app
│   └── chat.py               ← SSE endpoint
└── client/                   ← Vite + React (separate dir, deployed as static)
    ├── src/App.tsx
    └── ...
```

### SSE endpoint

```python
# server/chat.py
from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from agents import Runner
import json

router = APIRouter()

@router.post("/api/chat")
async def chat(req: Request):
    body = await req.json()
    last_user = body["messages"][-1]["content"]

    async def event_stream():
        try:
            async for event in Runner.run_streamed(agent, last_user):
                yield f"data: {json.dumps({'type': 'text', 'text': str(event)})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
```

## Streaming UX details

- **Render tool calls.** Show "agent is using tool X" in real-time, expand on click to show
  args + output. Don't hide tool use — users want to see what the agent does.
- **Scroll behavior.** Auto-scroll to bottom on new tokens, but stop auto-scrolling if the user
  manually scrolled up (sticky-scroll pattern).
- **In-flight indicator.** Spinner or "thinking..." while the first token is en route.
- **Markdown rendering.** Use `react-markdown` (TS) or `markdown-it` for code blocks, lists,
  headers. Syntax highlight code blocks.
- **Copy button.** On every assistant message and every code block.

## Authentication

This skill does NOT scaffold auth. The README of the produced project should say:

> This is a single-user starter. Before deploying to others, add an auth layer
> (NextAuth.js / Clerk / Auth.js / Supabase) — see [docs link].

If `state.context` reveals multi-user intent, surface this in `synthesize` and recommend the
user add auth or treat this as a personal tool.

## Required env vars (web-specific, on top of harness keys)

- For Next.js: nothing extra beyond the harness keys
- For Vite + FastAPI: `VITE_API_URL=http://localhost:8000` for client; FastAPI keys for server

## What to avoid

- Don't use API routes for long-running tasks — Vercel/most hosts have timeout limits (~60s).
  For long agents, use Server Actions + background jobs OR run on a non-serverless host.
- Don't poll for streaming — use SSE or fetch streaming, not setInterval
- Don't render the entire message history on every token update — use React keys correctly
  and only update the last message
