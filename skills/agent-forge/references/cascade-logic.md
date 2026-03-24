# Cascade Logic

When a user changes a completed decision, evaluate downstream impact using the dependency graph. The key insight: the agent core (purpose, tools, model) is decoupled from the interface layer (interface, state, deployment). Most changes don't cascade across this boundary.

## Dependency Graph

```
Stage 1: Purpose
  ↓
  ├── Stage 2: Interface (depends on: purpose)
  ├── Stage 3: Tools (depends on: purpose)
  ├── Stage 4: Model (depends on: purpose, tools)
  │
  Stage 5: Durability (depends on: purpose, interface)
  │
  ├── Stage 6: State (depends on: interface, durability)
  └── Stage 7: Deployment (depends on: interface, durability)
```

Two clusters:
- **Agent core:** Purpose → Tools, Model (what the agent does)
- **Infrastructure:** Interface → State, Deployment (how the agent runs)

Durability bridges both — it depends on purpose (long-running tasks need durability) and interface (some interfaces affect durability needs).

## Cascade Rules

### Purpose changes significantly

| Invalidates | Doesn't invalidate |
|------------|-------------------|
| Tools (different purpose → different capabilities) | Interface (usually) |
| Model (different complexity → different model) | State |
| System prompt (must be rewritten) | Deployment |

**When purpose changes don't cascade:** Minor refinements to the system prompt (tone, formatting) don't invalidate tools or model. Only cascade when the fundamental nature of the agent changes (e.g., "code reviewer" → "data analyst").

### Primary interface changes

| Invalidates | Doesn't invalidate |
|------------|-------------------|
| State (different interface → different state needs) | Tools |
| Deployment (different interface → different hosting) | Model |
| | Durability (usually) |

**Key transitions:**
- Any → CLI-only: State simplifies (in-memory), Deployment may be skipped
- CLI → Chat SDK: State needs Redis, Deployment needs hosting
- Web chat → Chat SDK: State likely unchanged if already Redis, Deployment may change
- Any → Web chat: Deployment needs Next.js host (Vercel recommended)

### Add/remove CLI add-on

**Cascades to nothing.** CLI is a thin wrapper — adding or removing it has zero downstream impact.

### Add/remove API add-on

| May invalidate | Doesn't invalidate |
|---------------|-------------------|
| Deployment (may now need hosting) | Everything else |

Only cascades if the agent was previously CLI-only and didn't need deployment.

### Durability: Ephemeral → Durable

| Invalidates | Doesn't invalidate |
|------------|-------------------|
| State (Postgres needed for WDK) | Interface |
| | Tools |
| | Model |

### Durability: Durable → Ephemeral

| Invalidates | Doesn't invalidate |
|------------|-------------------|
| State (Postgres no longer required — may simplify) | Everything else |

### Tools: significant change

| May invalidate | Doesn't invalidate |
|---------------|-------------------|
| Model (more complex tools → may need stronger model) | Interface |
| | State |
| | Deployment |

**When tool changes cascade to model:** Adding code execution, complex reasoning tools, or multi-step workflows may warrant upgrading the model. Removing tools or adding simple tools doesn't cascade.

### Model changes

**Cascades to nothing downstream.** Model is a leaf node in the dependency graph (nothing depends on it).

### State changes

**Cascades to nothing downstream.** State is a leaf node.

### Deployment changes

**Cascades to nothing downstream.** Deployment is a leaf node.

## Algorithm

When a user changes stage N:

1. Read the dependency graph from state
2. Find all stages that list N in their dependencies (direct dependents)
3. For each dependent stage that is `completed`:
   a. Check whether the **rationale** for its current decision referenced the thing that changed
   b. If yes → set to `invalidated`, tell user why
   c. If no → leave as `completed`
4. Transitively repeat for stages that depend on any newly invalidated stage
5. Present all invalidations to the user with recommendations
6. Walk through each invalidated stage to re-decide

**The rationale test is critical.** If the rationale for Vercel deployment was "Zero-config for Next.js" and the interface changed from web chat to CLI, that rationale is invalidated. But if the rationale was "Team already uses Vercel" and the interface changed from web chat to Chat SDK (still needs hosting), the rationale may still hold.

## Guardrails

- Never invalidate stages that the changed stage depends on (upstream). Only cascade downstream.
- Only invalidate if the downstream decision genuinely depended on the old value.
- Add/remove of CLI add-on never cascades.
- Model and State are leaf nodes — changing them never cascades.
- When in doubt, ask: "[Stage X] was based on [old decision]. Does this still make sense with [new decision], or should we revisit?"
