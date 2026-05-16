# Query Workflow

Detailed procedure for the `query` operation. The goal is an answer that is both useful right
now AND a candidate to file back into the wiki so future-you doesn't re-derive it.

## Step 0 — Read the schema

Read the wiki's schema file before answering. The schema's query rules (citation style,
file-back convention, log format) override anything in this document.

## Step 1 — Read `index.md` first

Do not grep blindly across `wiki/`. The index exists so the LLM can navigate semantically.
Read `wiki/index.md` in full. From there:

- Identify candidate pages whose titles or one-line descriptions match the question
- Note adjacent categories — a question about "scaling laws" may have hits in Concepts AND
  Sources AND Comparisons

If `index.md` is genuinely too thin to help (e.g. wiki is brand new with one source), fall back
to listing files in `wiki/` and reading the most likely matches.

## Step 2 — Read the candidate pages fully

For each candidate page, read it. Note:

- Direct claims that bear on the question
- Citations to source pages (you may want to drill into those for primary evidence)
- Cross-references to other pages (you may want to follow them)
- The page's `updated:` date (older pages may be superseded)

Pull in source pages or follow-on pages as needed. Don't be stingy — a query that touches 5-10
pages is normal.

## Step 3 — Synthesize the answer

Write the answer with:

- **Inline citations as markdown links** to wiki pages (and through them, to source pages).
  Example: "Sparse attention reduces compute from O(n²) to O(n log n)
  ([concepts/sparse-attention.md](../concepts/sparse-attention.md))."
- **Explicit gaps**: if the wiki doesn't have what the question needs, say so. Do not pad with
  generic knowledge — the wiki is the answer surface for this question. Example: "The wiki has
  no source on <X> yet. Want me to suggest external sources to ingest?"
- **Contradictions surfaced**: if two pages disagree, present both and call it out. Do not
  silently pick one.
- **Honest confidence**: if the wiki has partial evidence, say "partial answer based on
  [page-A] and [page-B]; the missing piece is <Y>."

## Step 4 — Pick the output form

Different questions deserve different outputs:

| Question shape | Output |
|----------------|--------|
| "What is X?" or "How does Y work?" | Paragraph or short list, inline citations |
| "Compare X and Y" | Markdown table or two-column comparison |
| "What's the timeline of X" | Chronological list with dates |
| "Summarize the landscape of X" | Structured page with headings |
| "What does the wiki think about X?" (meta) | Bulleted synthesis with citations |
| "Make me a deck for X" | Marp markdown, save under `wiki/decks/<slug>.md` |
| "Show me the connections between A and B" | Path-through-the-wiki narrative |

For long-form outputs (comparison, landscape, deck), proactively offer to file back (next step).

## Step 5 — File-back decision

This is the part baseline LLMs skip. Karpathy's key insight: "good answers can be filed back
into the wiki as new pages." Otherwise the work disappears into chat history.

**File the answer back if any of these are true:**

- The answer is a synthesis across 3+ wiki pages
- The answer is a comparison, table, or analysis
- The answer reveals a connection not previously documented
- The user asked for a "summary", "overview", "map", "landscape", or "the state of"
- The user spent multiple turns building this answer

**Don't file back when:**

- The answer is a direct factual lookup already on an existing page
- The question is meta or procedural ("how many sources do I have?")
- The user explicitly said "just answer, don't save"

When filing back, explicitly offer:

> This answer is wiki-worthy. Save as `wiki/<suggested-path>.md` and add to index?

Suggested paths by output type:

- Comparison → `wiki/comparisons/<a>-vs-<b>.md`
- Landscape/synthesis → `wiki/synthesis/<topic>.md` or update existing `wiki/synthesis.md`
- Analysis → `wiki/analyses/<slug>.md`
- Deck → `wiki/decks/<slug>.md`

Frontmatter for filed-back answers:

```yaml
---
type: comparison | analysis | synthesis | deck
title: <Question-derived title>
created: YYYY-MM-DD
sources: [<wiki page slugs that contributed>]
prompted_by: "<original user question>"
tags: [<freeform>]
---
```

After filing, update `wiki/index.md` with the new entry under the right category.

## Step 6 — Log the query

Append to `wiki/log.md`:

```markdown
## [YYYY-MM-DD] query | <one-line question>
- Pages consulted: `concepts/a.md`, `concepts/b.md`, `sources/c.md`
- Output form: comparison table
- Filed back: `wiki/comparisons/a-vs-b.md` (yes / no)
```

## Edge cases

- **Wiki has no relevant pages.** Tell the user explicitly. Suggest what to ingest. Do NOT
  answer from general knowledge as if it came from the wiki.
- **Question is about the wiki itself** ("what's in here?", "how big is the wiki?", "what
  haven't I ingested yet?"). Read `index.md` and `log.md`. Optionally run a quick scan of
  `wiki/`. This is allowed — it's a meta-query.
- **Question requires reading sources, not just wiki pages.** If wiki pages have shallow
  summaries and the question needs primary-source detail, drill into `raw/`. Surface this:
  "Wiki summary was too shallow; I read raw/<source>.<ext> directly for the detail. Want me
  to deepen the wiki page?"
- **User asks for a deck or visualization.** Marp is the default for decks. For charts, write
  the data + a one-line description and offer to generate a matplotlib script.
- **Multi-turn refinement.** If the user is iterating ("now compare them by X", "now group
  by Y"), build up the answer. File the final version, not each intermediate.
- **The answer is "the wiki contradicts itself."** Treat this as a lint finding too — surface
  it AND suggest running a lint pass to resolve.
