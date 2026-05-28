<!--
Mock transcripts for the CLI interface starter.

This file is the design artifact for Stage 5.5 (`mock-iterate`). The skill
substitutes the following placeholders before showing it to the user:

  {{AGENT_NAME}}     — short bin/command name (default below: field-notes)
  {{AGENT_DESC}}     — one-line description shown under the banner
  {{DOMAIN_PHRASE}}  — short phrase describing what the agent helps with

Scenarios present (uncomment which apply for your design):
  [x] Welcome / empty session       (always required)
  [x] Default conversation          (always required)
  [x] Streaming behavior            (state.ux.streaming !== 'none')
  [x] Approval pause                (any HITL tool present)
  [x] Error handling                (always required)
  [x] Multi-turn / persistence      (state.ux.persistence !== 'none')

Example agent used for the starter content below:
  name: field-notes
  description: A CLI journaling assistant for capturing field observations,
               daily notes, and reflections.
  tools: bash, file_read, file_write, grep, file_edit
  persistence: sqlite (journal index + thread memory, single-user, local)
  errorPolicy: retry-with-backoff for LLM, fail-fast for tools
  HITL: file_edit (modifying past entries) and export_to_external require approval
-->

# {{AGENT_NAME}} — example transcripts

These are example terminal sessions for what {{AGENT_NAME}} will feel like
to use once it is built. Read top to bottom; each scenario is independent.

---

## Scenario: Welcome / empty session

*What the user sees the first time they run `pnpm dev` in the agent's
project directory. The banner prints once, the input bar is empty, and the
status line is idle.*

```text
$ pnpm dev

> field-notes@0.1.0 dev
> tsx src/index.tsx

{{AGENT_NAME}} — {{AGENT_DESC}}
type /exit to quit, Ctrl-C to interrupt, Ctrl-D to exit

Try one of these to get started:
  •  capture today's observations from the south meadow visit
  •  find every entry where I mentioned the kingfisher and summarize
  •  what patterns have I noticed about the willow grove over the last month?
  •  draft an entry from these raw notes: "07:14, fog burning off, 3 deer"

agent> type a message█
idle · /help · Ctrl-C interrupt · Ctrl-D exit
```

---

## Scenario: Default conversation

*One complete turn. The user asks the agent to pull patterns from past
entries. The agent reads a couple of files, greps across the journal, and
distills what it found into a draft observation. This is what the user
will see scrolled back in history after the turn completes. (Streaming
animation is covered in the next scenario.)*

```text
you> i keep noticing the kingfisher at the bend near the old footbridge.
     have i written about it before? if so, what time of day?

assistant>
  ┌─ Active tools ───────────────────────────────────────────────────────┐
  │ ✓ grep(pattern="kingfisher", path="~/.field-notes/entries") → 4 hits │
  │ ✓ file_read(path="~/.field-notes/entries/2026-04-12.md") → "07:20 — "│
  │ ✓ file_read(path="~/.field-notes/entries/2026-05-03.md") → "06:55 — "│
  └──────────────────────────────────────────────────────────────────────┘

  Short answer: yes — four entries mention the kingfisher, all of them in
  the early morning, all of them at or near the footbridge bend. You have
  a pattern, not a coincidence.

  Here are the sightings, ordered by date:

    2026-04-12  07:20   "perched on the low alder, then dove twice"
    2026-04-27  06:48   "calling from upstream, didn't see it land"
    2026-05-03  06:55   "same alder branch as before — same bird?"
    2026-05-18  07:05   "fishing the shallow side this time"

  All four are between 06:48 and 07:20. Three of four name the same alder
  branch on the upstream side of the bend. Worth knowing: you only ever
  visit that spot in the morning, so the time-of-day clustering is partly
  selection bias — but the perch-tree consistency is real.

  Two next steps, ordered by what I'd try first:

    1. Add a tag `#kingfisher` to those four entries so the pattern is
       queryable, not just searchable. I'll need approval since it edits
       past entries.
    2. Visit the bend in the late afternoon at least once to test whether
       the bird is there outside your usual window.

idle · /help · Ctrl-C interrupt · Ctrl-D exit
```

---

## Scenario: Streaming behavior

*Same kind of turn, but captured mid-flight. Tokens are arriving from the
LLM; one tool call is still running. The Active tools pane updates in
place; the assistant buffer shows a `▌` caret where the cursor is. The
input bar is disabled and shows "(streaming — Ctrl-C to interrupt)".*

Snapshot 1 — first tool fires, no text yet:
*(tokens stream in over ~2s)*

```text
you> what have i noticed about the willow grove over the last month?

assistant>

  ┌─ Active tools ───────────────────────────────────────────────────────┐
  │ … grep(pattern="willow", path="~/.field-notes/entries")              │
  └──────────────────────────────────────────────────────────────────────┘

agent> (streaming — Ctrl-C to interrupt)
⠋ streaming  ·  claude-sonnet-4-5  ·  482 in / 0 out
```

Snapshot 2 — tool completes, agent starts emitting prose, second tool fires:
*(continues streaming)*

```text
you> what have i noticed about the willow grove over the last month?

assistant>

  ┌─ Active tools ───────────────────────────────────────────────────────┐
  │ ✓ grep(pattern="willow", path="~/.field-notes/entries") → 7 matches  │
  │ … file_read(path="~/.field-notes/entries/2026-05-09.md")             │
  └──────────────────────────────────────────────────────────────────────┘

  assistant>
    Reading through your willow-grove entries from the last 30 days. Seven
    mentions across five visits. Let me pull the most recent one to see the▌

agent> (streaming — Ctrl-C to interrupt)
⠙ streaming  ·  claude-sonnet-4-5  ·  482 in / 67 out
```

Snapshot 3 — turn complete, status flips to idle, input bar re-enabled:

```text
you> what have i noticed about the willow grove over the last month?

assistant>

  ┌─ Active tools ───────────────────────────────────────────────────────┐
  │ ✓ grep(pattern="willow", path="~/.field-notes/entries") → 7 matches  │
  │ ✓ file_read(path="~/.field-notes/entries/2026-05-09.md") → "rain, …" │
  └──────────────────────────────────────────────────────────────────────┘

  Reading through your willow-grove entries from the last 30 days. Three
  observations show up more than once:

    1. The leaves are unfurling later this year than last — you flagged it
       on Apr 18 and again on May 02 with photos.
    2. You keep hearing warblers in the canopy but only seeing them once.
       Worth bringing the binoculars next time.
    3. The waterline is noticeably lower at the grove's edge — mentioned
       on May 09 and again on May 19.

  Worth knowing: items (1) and (3) might be the same story. A late spring
  and low water can both follow a dry early-April. You haven't tied them
  together in any entry yet — could be the seed for a synthesis note.

agent> type a message█
idle · /help · Ctrl-C interrupt · Ctrl-D exit  ·  claude-sonnet-4-5
```

---

## Scenario: Approval pause

*The agent has proposed a `file_edit` call against a past entry. Because
file_edit is marked HITL, the stream pauses and `ApprovalPanel` renders
inline above the input bar. The user presses `d` to expand the diff, then
`y` to approve. The agent resumes and confirms the edit.*

```text
you> ok, add the #kingfisher tag to all four entries

assistant>
  I'll add a `#kingfisher` tag to the front-matter of each of the four
  entries. Showing the first edit; the other three are identical in shape.

  ╭─ Approval required: file_edit ───────────────────────────────────────╮
  │                                                                      │
  │ Add #kingfisher tag to entry 2026-04-12.md (1 of 4).                 │
  │                                                                      │
  │ {                                                                    │
  │   "path": "~/.field-notes/entries/2026-04-12.md",                    │
  │   "find": "tags: [morning, footbridge]",                             │
  │   "replace": "tags: [morning, footbridge, kingfisher]"               │
  │   … (3 more files queued)                                            │
  │ }                                                                    │
  │                                                                      │
  │ [y] approve   [n] reject   [d] details                               │
  ╰──────────────────────────────────────────────────────────────────────╯

agent> (awaiting approval)
idle · approval required · [y]es [n]o [d]etails
```

User presses `d`:

```text
  ╭─ Approval required: file_edit ───────────────────────────────────────╮
  │                                                                      │
  │ Add #kingfisher tag to entry 2026-04-12.md (1 of 4).                 │
  │                                                                      │
  │ ~/.field-notes/entries/2026-04-12.md                                 │
  │ @@ -1,6 +1,6 @@                                                      │
  │     ---                                                              │
  │     date: 2026-04-12                                                 │
  │     place: south meadow, footbridge bend                             │
  │ -   tags: [morning, footbridge]                                      │
  │ +   tags: [morning, footbridge, kingfisher]                          │
  │     weather: clear, 9C, light north wind                             │
  │     ---                                                              │
  │                                                                      │
  │ The remaining 3 edits apply the same one-line change to:             │
  │   2026-04-27.md, 2026-05-03.md, 2026-05-18.md                        │
  │                                                                      │
  │ [y] approve   [n] reject   [d] collapse                              │
  ╰──────────────────────────────────────────────────────────────────────╯
```

User presses `y`:

```text
  ┌─ Active tools ───────────────────────────────────────────────────────┐
  │ ✓ file_edit(path="~/.field-notes/entries/2026-04-12.md") → "+1/-1"   │
  │ ✓ file_edit(path="~/.field-notes/entries/2026-04-27.md") → "+1/-1"   │
  │ ✓ file_edit(path="~/.field-notes/entries/2026-05-03.md") → "+1/-1"   │
  │ ✓ file_edit(path="~/.field-notes/entries/2026-05-18.md") → "+1/-1"   │
  └──────────────────────────────────────────────────────────────────────┘

  Done. All four entries now carry the `#kingfisher` tag. You can pull
  them as a group with `/tag kingfisher` or by asking me to "show all
  kingfisher entries". The journal index has been refreshed.

  Want me to do the same kind of tag pass for the willow-grove entries?
  Same approval flow — I'll show you the diff before each batch.

agent> type a message█
idle · /help · Ctrl-C interrupt · Ctrl-D exit
```

---

## Scenario: Error handling

*The agent tries to run a tool that fails. UX policy here is fail-fast for
tools, retry-with-backoff for LLM calls. The transcript shows both — first
a tool failure (no retry, error surfaces immediately), then an LLM API
failure (retries automatically with a visible "Retrying… attempt 2/3" line).*

Tool failure — fail-fast:

```text
you> export the last 30 days of entries to ~/exports/may.md

assistant>
  ┌─ Active tools ───────────────────────────────────────────────────────┐
  │ ✗ file_write(path="~/exports/may.md") → EACCES: permission denied    │
  └──────────────────────────────────────────────────────────────────────┘

[error] file_write failed: EACCES — cannot write to ~/exports/
        the directory exists but the agent process can't write to it

I tried to write the export bundle to `~/exports/may.md` but the directory
is not writable by this process. Two options:

  1. `chmod u+w ~/exports` and re-run the same request
  2. Pick a different destination — `~/Documents/exports/` or anywhere
     under your home that the journal already writes to

Want me to try again at `~/.field-notes/exports/may.md` instead? That
directory is already writable. Tell me and I'll re-run.

agent> type a message█
idle · /help · Ctrl-C interrupt · Ctrl-D exit
```

LLM API failure — retry-with-backoff:

```text
you> what themes have come up most often in last week's entries?

[retry] LLM API returned 429 (rate limited). Retrying in 2s… attempt 2/3
[retry] LLM API returned 429 (rate limited). Retrying in 4s… attempt 3/3
[retry] LLM API recovered.

assistant>
  ┌─ Active tools ───────────────────────────────────────────────────────┐
  │ ✓ bash(cmd="ls -1 ~/.field-notes/entries | tail -7") → "2026-05-19…" │
  │ ✓ grep(pattern="^- ", path="~/.field-notes/entries", limit=200)      │
  └──────────────────────────────────────────────────────────────────────┘

  Three themes dominate the last seven entries. By count of bullet lines:

    weather/light       17  (fog, low cloud, golden-hour notes)
    water and waterline 11  (creek level, pond edge, footbridge bend)
    birds — kingfisher   8  (already tagged) plus warblers in the willows

  The water theme is new this week — it didn't show up in the prior 30
  days. Worth a synthesis entry while it's fresh.

agent> type a message█
idle · /help · Ctrl-C interrupt · Ctrl-D exit
```

---

## Scenario: Multi-turn / persistence

*The user exits the agent (Ctrl-D), then starts it again later. Because
persistence is enabled (sqlite, single-user, local), the agent remembers
the last conversation and resumes context on the next launch. The user
asks a follow-up that refers to "that synthesis we drafted yesterday" —
the agent correctly resolves it from history.*

First session ends:

```text
you> /exit

bye — session saved to .{{AGENT_NAME}}/history.sqlite
$
```

Next morning, second invocation:

```text
$ pnpm dev

> field-notes@0.1.0 dev
> tsx src/index.tsx

{{AGENT_NAME}} — {{AGENT_DESC}}
type /exit to quit, Ctrl-C to interrupt, Ctrl-D to exit

Resuming from .{{AGENT_NAME}}/history.sqlite — last session: 14 turns,
ended 8h ago. Type /forget to clear.

agent> type a message█
idle · /help · Ctrl-C interrupt · Ctrl-D exit

you> did that synthesis we drafted yesterday end up in the index? i can't
     tell if i actually saved it or just talked about it.

assistant>
  ┌─ Active tools ───────────────────────────────────────────────────────┐
  │ ✓ bash(cmd="ls -lt ~/.field-notes/syntheses | head -3") → "2026-05-…"│
  │ ✓ grep(pattern="late-spring-low-water", path="~/.field-notes/index") │
  └──────────────────────────────────────────────────────────────────────┘

  Yes, you saved it. The file is `~/.field-notes/syntheses/late-spring-
  low-water.md`, written yesterday at 19:42, and it's listed in the
  journal index. Cross-references look right too:

    linked from   3 entries  (Apr 18, May 02, May 09)
    links out to  2 entries  (May 09, May 19)

  Looks like a real synthesis, not a stray draft. The recent entries that
  mention low water now point at it, so future searches will surface it.

agent> type a message█
idle · /help · Ctrl-C interrupt · Ctrl-D exit
```
