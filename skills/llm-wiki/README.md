# llm-wiki

Implements Andrej Karpathy's [LLM Wiki pattern](https://llm-wiki.md) — bootstrap, maintain, and query a persistent, interlinked markdown knowledge base that compounds across sessions instead of re-deriving on every query.

## Usage

```
Initialize an LLM wiki for my research on transformer inference
Set up a knowledge base for my book — building a wiki as I read
Ingest this article into my wiki
Add this PDF to my knowledge base
Query my wiki: what does it say about attention sinks?
Compare X and Y in my wiki
Lint my wiki — find contradictions and orphans
```

## What it does

Karpathy's gist describes the pattern in the abstract; this skill makes it concrete. Three layers (immutable `raw/` source documents, LLM-written `wiki/` pages, and a schema file the agent writes into the wiki repo on init), four operations (init, ingest, query, lint), with each operation's discipline enforced via dedicated reference workflows.

The skill's central design choice: **the schema file is the durable contract**. Once the skill writes `WIKI.md` into a new wiki, every future session — even those without the skill loaded — reads that schema and follows it. The skill's main leverage is in init, where the schema is written; downstream operations work even when the skill isn't available.

1. **Route** — detect intent (init / ingest / query / lint) from the user's words and any wiki state in cwd
2. **Locate wiki** — walk up looking for `WIKI.md`/`CLAUDE.md`/`AGENTS.md` with the `<!-- llm-wiki-schema -->` marker, or a `.llm-wiki` marker file; read the schema in full before any operation
3. **Init** — interview for domain (personal / research / book / business / custom), write a self-describing schema with detection marker + bootstrap instructions for fresh sessions, seed `index.md` and `log.md`; **no stub pages**
4. **Ingest** — copy source verbatim to `raw/`, read it fully, write summary page, update every entity/concept page touched, flag contradictions inline with `> ⚠ Contradiction` blocks, update index, append to log; a meaningful ingest touches 5–15 pages
5. **Query** — read index first, cite real wiki page links, surface gaps honestly, offer to file synthesis-shaped answers back as new wiki pages, log the query
6. **Lint** — run 9 categorized checks (contradictions, stale claims, orphans, hubs, missing-page candidates, missing cross-refs, index drift, thin pages, gaps), produce a `wiki/lint-YYYY-MM-DD.md` report with severity + proposed action per finding, offer fixes one category at a time

## Features

- **Self-describing schema** — the wiki repo gets a `WIKI.md` (or `CLAUDE.md`/`AGENTS.md`) with detection marker, three-layer architecture, four operation rules, page taxonomy, frontmatter contract, link convention, log format, and a "Bootstrapping a fresh session" section so cold sessions can pick up where the skill left off
- **Domain-tuned taxonomy** — `personal`, `research`, `book`, `business`, or `custom` domains shape the page taxonomy defaults (people/places/themes for books; entities/concepts/timelines/comparisons for research; people/teams/decisions/projects for business)
- **No eager stubs** — pages exist only because an ingest justified them. Empty stubs add maintenance overhead (orphans, lint findings) without informational value
- **Cross-reference discipline on ingest** — every entity/concept page the source touches gets updated, not just a summary page; contradictions get explicit inline blocks rather than silent overwrites
- **Bracket-prefix log** — all entries start `## [YYYY-MM-DD] op | title` so `grep "^## \[" log.md | tail -10` shows recent activity
- **File-back on synthesis** — query answers that synthesize/compare/analyze get offered back as wiki pages with a suggested path; direct factual lookups don't
- **Categorized lint** — severity (high/medium/low) per finding, proposed action per finding, fixes offered one category at a time
- **Honest gaps** — when the wiki has no information on a topic, the agent says so explicitly rather than padding with parametric knowledge

## Safety

- **`raw/` is immutable** — the skill never writes to source documents
- **No fabricated citations** — every claim that depends on a source links to a real wiki page or source; when the wiki lacks information, the agent surfaces the gap
- **Schema overrides skill defaults** — if the user edits the schema, the skill respects the edits across sessions; never silently violates the schema
- **Preserves human edits** — when updating an existing page, the skill appends or refactors carefully rather than overwriting wholesale

## Scope

| In scope | Out of scope |
|----------|--------------|
| LLM-maintained markdown wiki on local filesystem | Vector search, embeddings, traditional RAG |
| Init / ingest / query / lint operations | Real-time collaborative editing |
| Schema-as-contract for cross-session discipline | Web UI or hosted wiki service |
| Obsidian-style linking optional | Database-backed knowledge bases |
| Personal / research / book / business / custom domains | Multi-language sources without explicit translation step |

## Test scenarios

| Scenario | Prompt | Description |
|---|---|---|
| eval-1-init | "Initialize an LLM wiki for my research on efficient LLM inference. Set everything up so a future session could maintain it consistently." | Tests schema completeness, detection marker, cold-start bootstrap, no-eager-stubs discipline |
| eval-2-ingest | "Ingest this paper about chunked prefill into my wiki" (source contains a deliberate contradiction with the existing 24× throughput claim) | Tests cross-reference discipline, contradiction flagging on both sides, opportunistic cleanup of pre-existing orphans, index/log update |
| eval-3-query | "Compare PagedAttention and speculative decoding — can they be combined?" (wiki has no source on combining them) | Tests index-first lookup, real citations, honest gap-surfacing on the combination sub-question, file-back of synthesis answers |
| eval-4-lint | "Lint my wiki — fixture has 5 seeded issues across 5 categories" | Tests categorized report with severity + proposed action, all 9 categories covered, fixes offered per category |

## Eval results

Graded 7 criterion × eval comparisons against a no-skill baseline (each baseline run was briefed on the Karpathy gist but had no skill loaded). Iteration 2 results below — iteration 1 had two gaps that the baseline schema closed (cold-start bootstrap section, no explicit no-stubs rule); both were folded into the skill and re-verified.

| Eval | Criterion | Skill | Baseline |
|------|-----------|-------|----------|
| eval-1-init | schema-completeness | **win** | partial (no detection marker, no contradiction convention, created 31 eager stubs) |
| eval-2-ingest | ingest-discipline | **win** | strong (skill won on backfilling contradiction onto the original source + fixing pre-existing orphan + alphabetized index) |
| eval-2-ingest | honest-citations | tie | tie |
| eval-3-query | query-file-back | tie | tie |
| eval-3-query | honest-citations | tie | tie |
| eval-4-lint | lint-categorization | **win** (22 findings, 11 categories, severity summary table) | partial (16 findings, no summary table, missed frontmatter-contract + hub-page categories) |
| eval-4-lint | honest-citations | tie | tie |
| **Total** | | **3 wins, 4 ties, 0 losses** | |

### Where the skill adds value

- **Init: writes a contract, not just a readme.** Baseline produced a thoughtful WIKI.md but missed the detection marker and the contradiction convention, and created 31 stub pages eagerly (which then become orphans waiting to be flagged by lint). Skill writes a marker-tagged, contradiction-aware schema with a "Bootstrapping a fresh session" section so future cold sessions can pick up consistently; creates zero stubs.
- **Ingest: opportunistic discipline.** Both agents touched ~10 pages for the test source. Skill alone fixed a pre-existing orphan (`prefix-caching.md` had no inbound links — skill added a citation, a See also, and an open-question note), backfilled the contradiction onto the *original* source page (so the contradiction is visible from both sides), and alphabetized the index within categories.
- **Lint: structured and exhaustive.** Skill found 22 categorized findings vs baseline's 16, included a severity-at-a-glance summary table, and surfaced categories the baseline missed (frontmatter-contract violations across all source pages, hub-page detection with quantified inbound ratio, unsourced-claims section). Every finding has a proposed action.

### Where the baseline holds up

- **Operations against a well-written schema.** Once the schema exists and is detailed, the baseline follows it. On eval-3 (query) and the honest-citations criterion across all evals, the baseline read the schema's rules ("never fabricate", "file synthesis answers back", "log entries in this format") and followed them. This is *exactly* Karpathy's design working as intended — the schema carries discipline forward.
- **Page coverage on ingest.** Baseline touched 9 pages vs skill's 10 on eval-2; both flagged the contradiction. The schema's "5–15 pages" rule did most of the work.

This pattern is informative: **the skill's leverage concentrates in init**, where the durable schema gets written. After init, the schema does most of the maintenance work, and the skill's edge shrinks. That's the right shape — the skill should not be required to maintain a wiki it bootstrapped.

## Design decisions

- **No state file.** The wiki itself IS the durable state. Each operation is short enough not to need resume-on-compaction. The schema file inside the wiki is the cross-session contract, not a hidden forge-state file.
- **Schema-as-contract.** The skill writes a self-describing `WIKI.md` (or `CLAUDE.md`/`AGENTS.md`) into the wiki repo. Future sessions read it whether or not the skill is loaded. This means the skill's value compounds even when the skill isn't around.
- **No eager stubs.** Karpathy's pattern is that pages exist because a source justified them. Pre-creating stub pages adds maintenance burden (each stub becomes an orphan, a frontmatter-contract surface, a lint finding) without informational value. The skill's init creates `index.md`, `log.md`, `README.md`, and empty category directories with `.gitkeep` — nothing else.
- **One question at a time.** The init interview asks domain, schema filename, layout, and link style in sequence rather than as a single survey — easier to interrupt and adjust.
- **Bracket-prefix log format is non-negotiable.** Every operation logs with `## [YYYY-MM-DD] op | title` so `grep "^## \["` is a documented affordance. Other formats break the audit trail.
- **Reference files split by operation.** `schema-template.md`, `ingest-workflow.md`, `query-workflow.md`, `lint-workflow.md` — each loaded on demand when the corresponding operation routes. Keeps the SKILL.md under 350 lines.
