# OpenAI Agents SDK

## Identity
- Repo: https://github.com/openai/openai-agents-python (Python) | https://github.com/openai/openai-agents-js (TS)
- Language: Python (primary) + TypeScript (first-party)
- License: MIT
- Track: A (library import)
- Latest stable: Python `0.17.3` (2026-05-19), TS `0.11.5` (2026-05-22) as of 2026-05-25

## Install
- Python: `uv add openai-agents` (extras: `openai-agents[voice]`, `openai-agents[litellm]`, `openai-agents[redis]`)
- TS: `pnpm add @openai/agents zod`
- Required env: `OPENAI_API_KEY` (skip with `set_tracing_disabled(True)` + custom model provider)

## Minimum working agent (Python)
```python
# VERIFIED FROM: openai.github.io/openai-agents-python/quickstart/
import asyncio
from agents import Agent, Runner, function_tool

@function_tool
def get_weather(city: str) -> str:
    """Get the weather for a city."""
    return f"Sunny in {city}."

agent = Agent(
    name="Assistant",
    instructions="You are a helpful assistant.",
    tools=[get_weather],
)

# Sync
result = Runner.run_sync(agent, "What's the weather in Tokyo?")
print(result.final_output)

# Async
async def main():
    result = await Runner.run(agent, "What's the weather in Paris?")
    print(result.final_output)

asyncio.run(main())
```

## Minimum working agent (TS)
```typescript
// VERIFIED FROM: github.com/openai/openai-agents-js README
import { Agent, run, tool } from '@openai/agents';
import { z } from 'zod';

const getWeather = tool({
  name: 'get_weather',
  description: 'Get the weather for a city',
  parameters: z.object({ city: z.string() }),
  execute: async ({ city }) => `Sunny in ${city}.`,
});

const agent = new Agent({
  name: 'Assistant',
  instructions: 'You are a helpful assistant',
  tools: [getWeather],
});

const result = await run(agent, 'What is the weather in Tokyo?');
console.log(result.finalOutput);
```

## Tool registration
- **Function tools (Python):** `@function_tool` decorator on sync or async functions; first arg may be `RunContextWrapper[Any]` for context. Options: `name_override=`, `timeout=`, `failure_error_function=`, `defer_loading=`.
- **Function tools (TS):** `tool({ name, description, parameters: z.object({...}), execute })` — parameters MUST be a zod schema.
- **Handoffs (the SDK's signature feature):** pass other agents to `handoffs=[...]`. The LLM picks which sub-agent to delegate to; control transfers and `result.last_agent` reflects who answered.

```python
# VERIFIED FROM: openai.github.io/openai-agents-python/quickstart/
history_agent = Agent(name="History", handoff_description="History questions", instructions="...")
math_agent = Agent(name="Math", handoff_description="Math questions", instructions="...")
triage = Agent(name="Triage", instructions="Route to the right specialist.", handoffs=[history_agent, math_agent])
```

## MCP support
- Depth: First-class. Three transports: `MCPServerStdio`, `MCPServerSse`, `MCPServerStreamableHttp` (plus `HostedMCPTool` for OpenAI-hosted).
- Configuration (Python):
```python
# VERIFIED FROM: openai.github.io/openai-agents-python/mcp/
from agents import Agent, Runner
from agents.mcp import MCPServerStdio, MCPServerStreamableHttp

async with MCPServerStdio(
    name="Filesystem",
    params={"command": "npx", "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"]},
) as fs:
    agent = Agent(name="Assistant", instructions="...", mcp_servers=[fs])
    result = await Runner.run(agent, "List the files.")
```
- TS MCP: exported from `@openai/agents` (e.g. `MCPServerStdio`); attach via `mcpServers: [...]` on the Agent. // TODO: verify exact TS API surface against current docs.

## Streaming
- Event types (Python): `RawResponsesStreamEvent` (raw LLM deltas), `RunItemStreamEvent` (fully-formed items: messages, tool calls, tool outputs), `AgentUpdatedStreamEvent` (fired on handoff).
- Pattern (Python):
```python
# VERIFIED FROM: openai.github.io/openai-agents-python/streaming/
result = Runner.run_streamed(agent, input="Hello")
async for event in result.stream_events():
    if event.type == "raw_response_event":
        ...
    elif event.type == "run_item_stream_event":
        ...
    elif event.type == "agent_updated_stream_event":
        ...
# Must consume the iterator to completion; the run is not finished otherwise.
```
- Pattern (TS):
```typescript
// VERIFIED FROM: openai.github.io/openai-agents-js/guides/streaming/
const stream = await run(agent, input, { stream: true });
for await (const event of stream) { /* ... */ }
const finalOutput = await stream.finalOutput();
```

## Interface compatibility
- CLI: trivial — wrap `Runner.run_sync` in a `typer`/`click` entrypoint, or `run()` in a Node CLI.
- Web: easy — FastAPI + SSE proxying `stream_events()`, or Next.js route handlers proxying the TS `stream`.
- Electron: medium — spawn Python via `child_process` and pipe JSON over stdio, or use the TS SDK directly in the main process.

## Voice / multimodal
- Voice: Yes. Two paths — (a) `VoicePipeline` + `SingleAgentVoiceWorkflow` (STT → agent → TTS), (b) `RealtimeAgent` on `gpt-realtime-2`. Install with `openai-agents[voice]`; needs `sounddevice` + `numpy` for local mic/speaker.
```python
# VERIFIED FROM: openai.github.io/openai-agents-python/voice/quickstart/
from agents.voice import AudioInput, SingleAgentVoiceWorkflow, VoicePipeline
pipeline = VoicePipeline(workflow=SingleAgentVoiceWorkflow(agent))
result = await pipeline.run(AudioInput(buffer=np_int16_buffer))
async for event in result.stream():
    if event.type == "voice_stream_event_audio":
        player.write(event.data)
```
- Vision: inherited from the underlying OpenAI model — pass image inputs in the standard Responses API format. // TODO: verify exact `input` shape for image content with current Runner.

## Tracing
- On by default; uploads to OpenAI dashboard. Three ways to disable:
  - Env: `OPENAI_AGENTS_DISABLE_TRACING=1`
  - Global: `from agents import set_tracing_disabled; set_tracing_disabled(True)`
  - Per-run: `Runner.run(agent, input, run_config=RunConfig(tracing_disabled=True))`
- Group runs: `with trace("workflow name"): ...`
- Custom exporters: `set_trace_processors([...])` (replace) or `add_trace_processor(...)` (additive).

## Known fragile patterns
- TS `connectMcpServers(agent, [...])` is mentioned in some docs but the canonical pattern attaches MCP via `mcpServers` on the Agent constructor. // TODO: verify against `@openai/agents@0.11.5`.
- `SandboxAgent` / `agents.sandbox` (filesystem-scoped agents) is newer (post-0.15) — surface area can shift; pin a version if used.
- `HostedMCPTool` requires OpenAI server-side MCP config; not interchangeable with the three transport classes above.
- Vision input shape — agents accept Responses-API multimodal content but the exact dict schema is not in the quickstart; consult `openai.github.io/openai-agents-python/running_agents/`.

## Provider support
- OpenAI is primary. Non-OpenAI providers via:
  - `openai-agents[litellm]` → `LitellmModel(model_id="claude-3-sonnet")` or string form `model="litellm/claude-3-sonnet"`. Pass `ModelSettings(include_usage=True)` if you need usage metrics.
  - OpenAI-compatible endpoints → `OpenAIChatCompletionsModel(model=..., openai_client=AsyncOpenAI(base_url=...))`. Pair with `set_tracing_disabled(True)` when you lack an OpenAI key.
- Scopes: global (`set_default_openai_client`), per-run (`ModelProvider` on `Runner.run`), per-agent (`model=` on `Agent`).

## Common tools layer
- **Needs common-tools layer**: YES. The SDK ships the harness (Agent, Runner, handoffs, voice, tracing) but no built-in bash/file/web tools. Users must write tools via `@function_tool` (Python) or `tool({...zod})` (TS).
- **Recommended approach**: see `references/common-tools/README.md`. For Python: bespoke individual tools only. For TS: bespoke or `vercel-labs/just-bash + bash-tool` framework.

## Tests / runner
- pytest (Python) — agents are plain objects; mock the model via `OpenAIChatCompletionsModel` against a fake client, or use `set_tracing_disabled(True)` in `conftest.py`.
- vitest/jest (TS) — same pattern, swap the model on the Agent.
