# Pattern / Algorithm / Data-Structure Cheat-Sheet

Consulted in `recommend_patterns`. Surfaces candidates whose shape would meaningfully change
the tracer code. **Recommend zero items when nothing fits.** Most tracers do not need anything
here.

The decision rule for every entry: *would adopting this change what gets written in the tracer?*
If the answer is "no, it's a thickening concern," record as `scopeCut` instead.

## Design patterns

| Pattern | Signal in interview | Shape it forces on tracer |
|---------|--------------------|-----------------------------|
| Producer / Consumer (queue + worker) | input is fire-and-forget, async invocation, webhook | tracer has `enqueue(x)` + `drainOnce()`; no loop yet |
| State machine | input transitions entity between named states | enum of states + one transition function; one transition in tracer |
| Strategy | interview revealed N interchangeable algorithms are a *user choice* at runtime | one `Strategy` interface + one concrete; do NOT add a second |
| Pipeline | data transforms through N ordered stages, stages composable | small `pipe(...fns)` helper + 2 stages in tracer |
| Command | input is a named operation with args, needs to be queued / logged / replayed | `{ type, payload }` shape + one handler |
| Adapter | tracer must hit an external service with a stable internal shape | one adapter module; internal code never sees the external type |
| Repository | same DB table read/written from multiple entry points *already in tracer* | one module per table; avoid unless multiple call sites exist in the tracer itself |
| Observer / pubsub | multiple downstream effects on one event | `emit(event)` + one subscriber; do NOT add event bus library |

Skip if not forced: Factory, Singleton, Decorator, Visitor, Builder, Chain of Responsibility.
These usually belong in thickening, not tracers.

## Algorithms

| Situation | Candidate | When to surface |
|-----------|-----------|-----------------|
| Lookup by key, N > ~100 | hash map | always surface as "default" if user describes linear scan |
| Sorted range queries, frequent inserts | balanced BST / skip list / sorted array with insert | surface only if constraint mentions ordered output or range |
| Top-K | min-heap of size K | surface if output is "top N" |
| Shortest / cheapest path | BFS (unweighted), Dijkstra (weighted) | surface if graph language present |
| Dedup with memory cap | Bloom filter | surface only if constraint explicitly bans O(n) memory |
| Prefix search | trie / radix tree | surface only if prefix matching is in the happy path |
| Rate limiting | token bucket | surface only if constraint mentions rate |
| Pagination | keyset / cursor | surface if happy path returns a list and output shape has pagination |
| Idempotency | `(request_id, result)` cache | surface if invocation is HTTP retry-safe or at-least-once queue |
| Backpressure | bounded channel + drop or block | surface only if async + perf constraint |

Bias: a hash map + a list solves most tracers. Reach for the rest only when the interview
forces it.

## Data structures

| Need | Structure | Notes |
|------|-----------|-------|
| Append-only log | array / file | fine for tracer |
| Ordered unique set | sorted array + bsearch, or `Set` + sort on read | tracer prefers simple |
| FIFO queue | array with `shift` (small), `Deque`, or external queue | external only if `invocation` is webhook / job |
| LRU cache | `Map` (insertion-ordered) + size check on set | surface only if perf constraint mentions cache hits |
| Sparse matrix | `Map<string, value>` keyed by `"r,c"` | surface only if matrix is large & sparse in constraints |
| Graph | adjacency list as `Map<id, id[]>` | default; skip matrix unless dense |
| Time-bucketed counter | `Map<bucket, count>` with lazy eviction | surface only if time-window aggregation is in happy path |
| Event history | ring buffer | surface only if fixed-memory event log needed |

## Known fragile patterns

These often change between library versions — when the tracer uses them, prefer documentation
lookup (via `context7` or similar) over recalled syntax. If docs tools unavailable, flag with
a `TODO: verify API` comment rather than guess.

- Express 5 vs 4 middleware signatures
- Prisma client generation path
- Next.js app vs pages router API routes
- Drizzle schema + migrations
- AI SDK v4 vs v5 stream APIs
- Hono adapters per runtime (Node / Bun / Deno / edge)
- `zod` v3 vs v4 schema types
- OpenAI SDK v4 client options

## Anti-recommendations

Do not recommend, even if they seem to fit:

- **Microservices split.** Tracer is one process. Split is thickening after the shape is proven.
- **CQRS / event sourcing.** Huge commitment for a tracer. Never recommend on the first bullet.
- **Dependency injection framework.** A function parameter does the job for the tracer.
- **Custom error class hierarchy.** Tracer has no error handling. Defer.
- **Generic / type-parameterized abstractions.** One concrete is enough. Generics are thickening.
- **Config system.** Hardcode values. Config is thickening.
- **Logger library.** `console.log` / `print` / `println!` is enough for the tracer.

Recommending any of the above means the tracer has drifted into architecture — pull back.
