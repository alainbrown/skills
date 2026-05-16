---
name: llm-wiki
description: >
  Implements Andrej Karpathy's LLM Wiki pattern (https://llm-wiki.md) — bootstrap, maintain, and
  query a persistent, interlinked markdown knowledge base that compounds across sessions instead
  of re-deriving on every query. Routes between four operations: init (create wiki structure +
  schema file that governs future sessions), ingest (process a new source into entity/concept
  pages with cross-references, update index and log), query (synthesize an answer from wiki
  pages with citations, file valuable answers back), and lint (find contradictions, stale
  claims, orphan pages, missing cross-references). Use whenever the user mentions LLM wiki,
  personal wiki, Memex, second brain, knowledge base that compounds, persistent notes the LLM
  maintains; or says things like "init a wiki for X", "ingest this into my wiki",
  "add this article to my knowledge base", "query my wiki about Y", "what does my wiki say
  about Z", "lint my wiki", "build a wiki for this book/paper/project". Do not trigger for
  one-shot summaries, generic note-taking, or RAG-style retrieval without persistence.
---

# LLM Wiki

<purpose>
Maintain a persistent, LLM-curated markdown wiki as a compounding knowledge artifact. The wiki
is a directory of interlinked markdown files; the LLM owns writing it, the human owns sourcing
and questions. This skill makes the maintenance disciplined: every ingest updates the right
pages and the log, every query knows whether to file the answer back, every lint produces a
concrete report. Routes between four operations and persists the conventions as a schema file
inside the wiki itself so later sessions stay consistent.
</purpose>

<core_principle>
**The wiki is the state.** No skill-side state file is needed — the wiki repo IS the durable
artifact. What persists across sessions is:

- `wiki/` — LLM-written markdown pages (you own this layer entirely; the human reads)
- `raw/` — immutable user-curated source documents (the LLM reads, never writes)
- `WIKI.md` (or `CLAUDE.md` / `AGENTS.md` if the user prefers) — the *schema*: a self-describing
  contract that tells any future LLM how this wiki is organized and what conventions to follow
- `index.md` — content catalog organized by category, updated on every ingest
- `log.md` — append-only chronological record; entries start `## [YYYY-MM-DD] op | title`
  so `grep "^## \["` works

**Read the schema before every operation.** When a wiki exists, the first thing this skill does
is read its schema file. The schema overrides any default in this skill. The skill ships defaults;
the wiki's schema is ground truth.

**Karpathy's pattern is intentionally abstract — the skill makes it concrete.** The gist describes
the *idea*. This skill ships a working default structure with sensible conventions. Users can
edit the schema to diverge; later sessions will read the divergence and respect it.

**Bias to discipline.** The reason wikis decay is that maintenance feels optional. This skill
makes maintenance the default: ingest = summary page + cross-ref pass + index + log, all four
or you didn't ingest. Same rigor for query and lint.
</core_principle>

<process>

<step name="route">
**Detect intent and route to the right operation.**

Possible operations: `init`, `ingest`, `query`, `lint`.

Routing rules:

| Signal | Route |
|--------|-------|
| User says "init", "start a wiki", "set up", "bootstrap", "create a wiki for…", "build a wiki" AND no wiki exists in cwd | `init` |
| User provides a source (URL, file path, paste, "this article", "this PDF") or says "ingest", "add to wiki", "file this", "process this" | `ingest` |
| User asks a question about the wiki's content or says "query", "ask the wiki", "what does my wiki say", "search the wiki", "find…" | `query` |
| User says "lint", "check", "audit", "health-check", "find contradictions", "find orphans" | `lint` |
| Ambiguous | Ask via AskUserQuestion |

If the user invokes the skill but the wiki doesn't exist yet AND they're trying to ingest/query/lint,
offer to init first.

Save the routed operation; proceed.

▶ Next: `locate_wiki`
</step>

<step name="locate_wiki">
**Find the wiki root or confirm the location for a new one.**

For `init`: ask where to create the wiki. Default to the current working directory unless it
looks like an existing project (presence of `package.json`, `pyproject.toml`, etc.) — in that
case suggest a subdirectory like `wiki/` or ask.

For `ingest` / `query` / `lint`: detect the wiki root by walking up from cwd looking for these
markers (in priority order):

1. A file named `WIKI.md`, `CLAUDE.md`, or `AGENTS.md` whose content matches the schema template
   (look for the marker comment `<!-- llm-wiki-schema -->` near the top)
2. A `wiki/` directory containing `index.md` AND `log.md`
3. A `.llm-wiki` marker file (created during init)

If multiple candidates exist, ask the user which. If none found, ask the user to point you at
the wiki root, or offer to init a new one.

Once located, **read the schema file in full.** The schema is the authoritative contract — its
conventions override any default in this skill (page taxonomy, naming, frontmatter, log format,
file-back rule, lint checks). Note any divergences and respect them throughout the operation.

▶ Next: `init`, `ingest`, `query`, or `lint` (whichever was routed)
</step>

<step name="init">
**Bootstrap a new wiki: structure, schema, starter index and log.**

Skip this step if the route is not `init`.

### Interview

Ask one question at a time. Defaults shown in brackets are recommendations, not requirements.

1. **Domain.** What kind of wiki is this?
   - `personal` — self-improvement, journaling, goals, health
   - `research` — academic or professional deep-dive on a topic
   - `book` — companion wiki for reading one book or a series
   - `business` — team/internal knowledge base
   - `custom` — describe it

   Domain shapes the page taxonomy defaults (see `references/schema-template.md` for the
   domain-specific templates).

2. **Schema filename.** `WIKI.md` (recommended for portability) or `CLAUDE.md` / `AGENTS.md`
   (recommended if the user is locked into one agent platform)?

3. **Wiki directory layout.** Two-level (`wiki/` and `raw/` as siblings of the schema file) or
   flat (everything at the root)? Default: two-level.

4. **Optional integrations.** Will the user use Obsidian? (affects link style: `[[wikilinks]]`
   vs standard markdown). Default: standard markdown, since it works everywhere.

### Bootstrap

Create the directory structure and starter files. See `references/schema-template.md` for the
full schema content tuned by domain. The structure:

```
<wiki-root>/
├── WIKI.md           (or CLAUDE.md / AGENTS.md — the schema)
├── .llm-wiki         (empty marker file so later sessions can locate the root)
├── raw/              (user drops source documents here; LLM never writes here)
│   └── .gitkeep
├── wiki/             (LLM-written pages)
│   ├── index.md      (content catalog)
│   ├── log.md        (chronological record)
│   └── README.md     (one-paragraph: what this wiki is, who maintains it, how to read it)
└── .gitignore        (ignores OS junk, attachment cache, etc.)
```

Write `index.md` with empty category sections (Entities, Concepts, Sources, Comparisons,
Open Questions). Write `log.md` with one entry: `## [<today>] init | Wiki initialized for <domain>`.

**Do NOT create stub pages on init.** In Karpathy's pattern, pages exist because an ingested
source justified them. Empty stubs add maintenance overhead (orphans, frontmatter that has
to be kept current, lint findings) without informational value. The wiki starts empty inside
`wiki/`; the first ingest creates the first pages. The schema's topic taxonomy is a *guide*
for what pages will eventually exist, not a checklist to pre-create.

The only files written under `wiki/` on init are: `index.md`, `log.md`, and a one-paragraph
`README.md` (what this wiki is, who maintains it, how to read it). Category subdirectories
(`entities/`, `concepts/`, etc.) can be created empty with `.gitkeep` so they're versioned,
or omitted entirely until the first ingest needs them.

### Confirm and explain

Show the user the created structure and tell them:
- Where to drop sources (`raw/`)
- How to invoke ingest next time ("ingest <path>" or "add this to my wiki")
- That the schema is editable — they should evolve it as they figure out what works

Append a log entry, save, done.

▶ Next: end of process (the user will invoke ingest/query/lint separately)
</step>

<step name="ingest">
**Process a new source into the wiki.**

Skip this step if the route is not `ingest`.

Follow `references/ingest-workflow.md` in detail. High level:

1. **Receive the source.** URL, file path, paste, or "this thing we just discussed." For URLs,
   fetch and convert to readable text. For PDFs, extract text. For pasted content, use as-is.
   For local files, save a copy to `raw/` with a slugified filename so the source is preserved
   immutably. Never modify files in `raw/`.

2. **Read the source fully.** No skimming. If it's long, summarize section by section internally
   before writing anything.

3. **Discuss key takeaways with the user** (unless they've explicitly said "batch ingest, no
   interruptions"). Surface: what's the main claim, what entities/concepts appear, what does this
   contradict or extend in the existing wiki. Confirm scope before writing.

4. **Identify which pages to touch.** Read `wiki/index.md` first. Then for each entity or
   concept that appears in the source, check if a page exists. Plan the writes: one summary
   page for the source itself, plus updates to N entity/concept pages, plus index, plus log.
   A meaningful ingest typically touches 5-15 pages.

5. **Write the source summary page.** `wiki/sources/<slug>.md` — see workflow doc for the
   page template. Include frontmatter, citation, key claims, methodology if applicable,
   relevance, and `## See also` with links to related pages.

6. **Update entity/concept pages.** For each one: add a section or paragraph that integrates the
   new information. Flag contradictions explicitly with `> ⚠ Contradiction: <previous source>
   said X; this source says Y` blocks. Cross-reference back to the source page.

7. **Update `index.md`.** Add the new source under Sources. Add any new entity/concept pages
   under their category. Move pages between sections if their classification changed.

8. **Append to `log.md`.** Format: `## [YYYY-MM-DD] ingest | <source title>` followed by a
   bulleted list of pages touched.

9. **Report.** Summarize for the user: source page created, N pages updated, M new pages
   created, K contradictions flagged. Offer to open any of them for review.

▶ Next: end of process
</step>

<step name="query">
**Answer a question against the wiki, with citations, and optionally file back.**

Skip this step if the route is not `query`.

Follow `references/query-workflow.md` in detail. High level:

1. **Read `index.md` first** to find candidate pages. Do NOT grep blindly — the index exists
   so the LLM can navigate semantically.

2. **Pull in candidate pages.** Read each one. Note which sources they cite (for follow-on
   verification or further reading).

3. **Synthesize an answer.** Cite specific wiki pages inline using markdown links. If the wiki
   doesn't have enough information, say so explicitly and suggest what to ingest next.

4. **Pick the output form** based on the question:
   - Direct factual question → paragraph or short list, no file
   - Comparison or analysis → a markdown page (offer to file back)
   - "Map out X" or "summarize the landscape" → a structured page (offer to file back)
   - Time series, tabular data → a table (offer to file back)
   - Presentation request → Marp markdown (offer to save under `wiki/decks/`)

5. **File-back decision.** If the answer would be valuable to future you (a synthesis,
   comparison, analysis, connection between pages, new map of the territory), explicitly
   offer: "This answer is wiki-worthy. File it as `wiki/<suggested-path>.md` and add to index?"

6. **Log the query.** Append `## [YYYY-MM-DD] query | <one-line question>` with a bullet for
   pages consulted and whether a new page was filed.

▶ Next: end of process
</step>

<step name="lint">
**Health-check the wiki and produce a categorized report.**

Skip this step if the route is not `lint`.

Follow `references/lint-workflow.md` in detail. High level:

1. **Inventory.** List every page in `wiki/`. Build a quick map of internal links.

2. **Run all checks** (see lint-workflow.md for each):
   - Contradictions across pages
   - Stale claims newer sources superseded
   - Orphan pages (no inbound links)
   - Hub pages (way more inbound links than the average — flag for possible split)
   - Concepts mentioned in 3+ pages but lacking their own page (promote candidates)
   - Missing cross-references (page A mentions concept on page B but doesn't link)
   - Index drift (pages exist but missing from `index.md`; index entries pointing nowhere)
   - Empty or thin pages (under ~5 lines of substantive content)
   - Suggested new questions to investigate (gaps the wiki implies but doesn't fill)

3. **Produce a report** as `wiki/lint-<YYYY-MM-DD>.md` (and offer to commit it). Format:
   findings grouped by category, severity (high/medium/low), and a one-line proposed action
   per finding.

4. **Offer to apply fixes**, one category at a time. The user picks which to action. Common
   fix patterns:
   - Add missing cross-references in place
   - Resolve contradictions by editing pages (after confirming with the user which source wins,
     or flagging both)
   - Promote a concept to its own page (extracts content from pages that mention it, leaves
     links behind)
   - Delete or merge thin/orphan pages

5. **Log the lint pass.** Append `## [YYYY-MM-DD] lint | found N findings, fixed M`.

▶ Next: end of process
</step>

</process>

<guardrails>
- NEVER write to `raw/` — those files are immutable source documents owned by the user
- NEVER ingest, query, or lint without first reading the wiki's schema file — it overrides skill defaults
- NEVER skip the index/log update during ingest, even for "small" sources; consistency is the whole point
- NEVER fabricate a citation; if a claim doesn't trace to a source in `raw/` or another wiki page, say so
- When updating an existing page, preserve the user's manual edits — append, refactor with care, never overwrite wholesale
- When flagging contradictions, present both sources fairly; do not silently pick one
- During init, write a self-describing schema so a future session without this skill can still maintain consistency
- One question at a time during init; do not flood the user with a multi-question survey
- For long sources, summarize section by section before writing pages; do not "ingest" without actually reading
- If the user requests something the schema forbids, ask them whether to update the schema or skip the request — never silently violate the schema
</guardrails>

<success_criteria>
- [ ] Correctly routes between init / ingest / query / lint based on intent
- [ ] On init: creates the wiki structure, writes a schema file with the marker, seeds index.md and log.md, picks the right domain template
- [ ] On ingest: source is copied to `raw/`, summary page created, all relevant entity/concept pages updated, contradictions flagged, index and log updated
- [ ] On query: index consulted first, citations are real wiki links, file-back offered when the answer is wiki-worthy, query logged
- [ ] On lint: all checks run, report grouped by category with severity and proposed actions, fixes offered one category at a time
- [ ] Schema file is the source of truth; skill respects user edits to it across sessions
- [ ] Log entries follow the format `## [YYYY-MM-DD] op | title` so `grep "^## \["` works
- [ ] No fabricated citations; missing data is surfaced rather than invented
</success_criteria>
