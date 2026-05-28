# LangGraph

## Identity
- Repo: https://github.com/langchain-ai/langgraph (Python) and https://github.com/langchain-ai/langgraphjs (TypeScript)
- Language: Python (primary) + TypeScript (first-class)
- License: MIT
- Track: A
- Latest stable: Python `langgraph` 1.2.1 / npm `@langchain/langgraph` 1.3.2 as of 2026-05-25

## Install
- Python: `uv add langgraph langchain-anthropic langchain-openai`
  - For checkpointers: `uv add langgraph-checkpoint-sqlite` or `langgraph-checkpoint-postgres`
  - For MCP: `uv add langchain-mcp-adapters` (latest 0.2.2)
- TS: `pnpm add @langchain/langgraph @langchain/anthropic @langchain/openai @langchain/core zod`
  - For checkpointers: `pnpm add @langchain/langgraph-checkpoint-sqlite` or `@langchain/langgraph-checkpoint-postgres`
  - For MCP: `pnpm add @langchain/mcp-adapters` (latest 1.1.3)
- Required env: provider keys (`ANTHROPIC_API_KEY` / `OPENAI_API_KEY`)

## Minimum working agent (Python — ReAct style)
```python
# VERIFIED FROM: https://github.com/langchain-ai/langgraph/blob/main/libs/prebuilt/README.md
from langchain_anthropic import ChatAnthropic
from langgraph.prebuilt import create_react_agent

def search(query: str) -> str:
    """Search the web."""
    if "sf" in query.lower():
        return "It's 60 degrees and foggy."
    return "It's 90 degrees and sunny."

agent = create_react_agent(
    model=ChatAnthropic(model="claude-sonnet-4-6"),
    tools=[search],
    # `prompt` is the system instruction (replaces deprecated `state_modifier`)
    prompt="You are a helpful weather assistant.",
)

# Sync invoke
result = agent.invoke({"messages": [{"role": "user", "content": "weather in sf?"}]})
print(result["messages"][-1].content)

# Stream tokens (async)
# async for chunk in agent.astream(
#     {"messages": [{"role": "user", "content": "weather in sf?"}]},
#     stream_mode="messages",
# ):
#     msg, metadata = chunk
#     print(msg.content, end="", flush=True)
```

## Minimum working agent (TS)
```typescript
// VERIFIED FROM: https://docs.langchain.com/oss/javascript/langgraph/quickstart
import { ChatAnthropic } from "@langchain/anthropic";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { tool } from "@langchain/core/tools";
import * as z from "zod";

const search = tool(
  async ({ query }) =>
    query.toLowerCase().includes("sf") ? "60F and foggy." : "90F and sunny.",
  {
    name: "search",
    description: "Search the web",
    schema: z.object({ query: z.string() }),
  },
);

const agent = createReactAgent({
  llm: new ChatAnthropic({ model: "claude-sonnet-4-6" }),
  tools: [search],
});

const result = await agent.invoke({
  messages: [{ role: "user", content: "weather in sf?" }],
});
console.log(result.messages.at(-1)?.content);
```

## Custom graph (when prebuilt isn't enough)
```python
# VERIFIED FROM: https://docs.langchain.com/oss/python/langgraph/use-graph-api
from typing import Literal
from typing_extensions import TypedDict
from langgraph.graph import StateGraph, MessagesState, START, END

def llm_call(state: MessagesState):
    return {"messages": [model_with_tools.invoke(state["messages"])]}

def tool_node(state: MessagesState):
    # execute tool calls from last AI message
    ...

def should_continue(state: MessagesState) -> Literal["tool_node", END]:
    return "tool_node" if state["messages"][-1].tool_calls else END

builder = StateGraph(MessagesState)
builder.add_node("llm_call", llm_call)
builder.add_node("tool_node", tool_node)
builder.add_edge(START, "llm_call")
builder.add_conditional_edges("llm_call", should_continue, ["tool_node", END])
builder.add_edge("tool_node", "llm_call")
graph = builder.compile()
```

## Tool registration
- Decorator: `from langchain_core.tools import tool` then `@tool` on a function with type hints + docstring (Python); `tool(fn, { name, description, schema: z.object({...}) })` in TS.
- Bind to model: `model.bind_tools([t1, t2])` (Python) / `model.bindTools([t1, t2])` (TS).
- `create_react_agent` accepts the raw tool list and binds internally.

## MCP support
- Depth: **deep** (first-class, separate adapter package).
- Python package: `langchain-mcp-adapters` (0.2.2). Example:
```python
# VERIFIED FROM: https://pypi.org/project/langchain-mcp-adapters/
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from langchain_mcp_adapters.tools import load_mcp_tools
from langgraph.prebuilt import create_react_agent

params = StdioServerParameters(command="python", args=["math_server.py"])
async with stdio_client(params) as (read, write):
    async with ClientSession(read, write) as session:
        await session.initialize()
        tools = await load_mcp_tools(session)
        agent = create_react_agent("anthropic:claude-sonnet-4-6", tools)
```
- TS package: `@langchain/mcp-adapters` (1.1.3) — `MultiServerMCPClient` for multi-server. TODO: verify exact TS API surface from package README.

## Streaming
- `stream_mode` options: `"values"` (full state snapshot), `"updates"` (only changed keys per node), `"messages"` (LLM tokens as `(message_chunk, metadata)` tuples), `"custom"` (arbitrary data via `get_stream_writer()`), `"tasks"` (node start/end events; requires checkpointer).
- Multiple modes: pass a list, e.g. `stream_mode=["updates", "messages"]`; chunks become `(mode, data)` tuples (or `StreamPart` objects with `version="v2"`).
- Async pattern: `async for chunk in agent.astream(input, stream_mode="messages"): ...`
- Sync pattern: `for chunk in agent.stream(input, stream_mode="updates"): ...`

## State and persistence
**This is LangGraph's superpower.** State persists across invocations via checkpointers, keyed by `thread_id`. Enables resume-after-crash, human-in-the-loop interrupts, and time-travel debugging.

- Built-in checkpointers:
  - `MemorySaver` — in-process, for tests (`from langgraph.checkpoint.memory import MemorySaver`)
  - `SqliteSaver` / `AsyncSqliteSaver` — file-backed (`langgraph-checkpoint-sqlite`)
  - `PostgresSaver` / `AsyncPostgresSaver` — production (`langgraph-checkpoint-postgres`)
- Sqlite example:
```python
# VERIFIED FROM: https://docs.langchain.com/oss/python/langgraph/persistence
from langgraph.checkpoint.sqlite import SqliteSaver
from langgraph.prebuilt import create_react_agent

with SqliteSaver.from_conn_string("checkpoints.db") as checkpointer:
    agent = create_react_agent(model, tools, checkpointer=checkpointer)
    config = {"configurable": {"thread_id": "user-42"}}
    agent.invoke({"messages": [("user", "hi, I'm bob")]}, config=config)
    # Next call on same thread_id remembers "bob"
    agent.invoke({"messages": [("user", "what's my name?")]}, config=config)
```
- Interrupts: `from langgraph.types import interrupt, Command` — pause inside a tool/node, resume with `graph.invoke(Command(resume={...}), config)`.

## Multi-agent
LangGraph is the strongest of the four Track A frameworks for multi-agent.
- **Subgraphs**: compile an agent and embed via `builder.add_node("sub", subgraph)` or invoke inside a node function for schema isolation.
- **Supervisor pattern**: `langgraph-supervisor` package (Python) — a parent agent routes to named worker agents.
- **Swarm pattern**: `langgraph-swarm` package — peer agents handoff to each other via tool calls.
- **Agents-as-tools**: wrap a subagent's `.invoke()` in a `@tool` so an outer agent can delegate.

## Interface compatibility
- **CLI**: easy — `agent.invoke()` in a script.
- **Web**: easy — wrap in FastAPI (Python) / Express or Hono (TS). LangGraph Platform / `langgraph-cli` ships a managed dev server (`langgraph dev`) with a built-in API for any compiled graph.
- **Electron**: medium — Python graph requires subprocess from main process; TS graph runs natively in the main process (renderer should use IPC, not import LangGraph directly).

## Known fragile patterns
- The `state_modifier` parameter of `create_react_agent` was renamed to `prompt` in 1.0 — older snippets break. Use `prompt=...`.
- `langchain.agents.create_agent` (new in langchain 1.0) and `langgraph.prebuilt.create_react_agent` are **different APIs** with overlapping purpose; pick one and stick to it. `create_react_agent` is the LangGraph-native prebuilt.
- `stream_mode="messages"` in Python yields `(AIMessageChunk, metadata)` tuples in v1; with `version="v2"` it becomes `{"type": "messages", "data": (msg, metadata)}` dicts. Pin the version you write against.
- TS `StateSchema` / `MessagesValue` API changed in `@langchain/langgraph` 1.x — older `Annotation.Root({...})` examples from 0.2.x do not compile against 1.3. Use `new StateSchema({...})`.
- Checkpointers require `thread_id` in `config.configurable` on every call — omitting it raises at runtime, not type-check time.

## Provider support
All major providers via LangChain integration packages: Anthropic (`langchain-anthropic`), OpenAI (`langchain-openai`), Google Gemini (`langchain-google-genai` / `langchain-google-vertexai`), Cohere (`langchain-cohere`), Mistral (`langchain-mistralai`), AWS Bedrock (`langchain-aws`), Groq (`langchain-groq`), Ollama / local (`langchain-ollama`), and any OpenAI-compatible endpoint.

## Common tools layer
- **Needs common-tools layer**: YES. LangGraph ships graph orchestration but no built-in tools. `langchain_community.tools.*` exists (ShellTool, BashProcess, file tools) but is opt-in and pulls a heavy dependency tree.
- **Recommended approach**: see `references/common-tools/README.md`. For Python: bespoke individual tools (wrap each with `@tool` from `langchain_core.tools` — adapter pattern in each tool's header comment). For TS: bespoke or `vercel-labs/just-bash + bash-tool`.

## Tests / runner
- Python: `pytest` — compile a fresh graph per test for isolation; use `MemorySaver` checkpointer with a unique `thread_id` per test.
- TS: `vitest` (LangGraph repo itself uses vitest).
