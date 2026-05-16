# Schema Template

The schema is the most important file the skill writes during init. It is a self-describing
contract that lives INSIDE the wiki repo and tells any future LLM (with or without this skill
loaded) how to maintain consistency. Karpathy's gist calls this the "schema" layer.

The skill writes this file as `WIKI.md` (default), `CLAUDE.md`, or `AGENTS.md` depending on the
user's choice. The marker comment `<!-- llm-wiki-schema -->` near the top lets the skill detect
it later.

## Universal preamble (all domains)

```markdown
<!-- llm-wiki-schema -->
# Wiki Schema

This file is the schema for an LLM-maintained wiki, following Andrej Karpathy's
[LLM Wiki pattern](https://llm-wiki.md). Any LLM working in this directory MUST read this
file in full before performing any operation on the wiki.

## Architecture

Three layers:

- **`raw/`** — Source documents. Immutable. The LLM reads from `raw/` but NEVER writes to it.
  The human curates this directory.
- **`wiki/`** — LLM-generated markdown pages. The LLM owns this layer entirely. The human reads.
- **This file** — The schema. The LLM follows it; the human edits it as conventions evolve.

## Operations

The LLM performs exactly four operations on this wiki:

- **Ingest** — process a new source into the wiki
- **Query** — answer a question, optionally file the answer back
- **Lint** — health-check the wiki and propose fixes
- **(Init was performed once, when this file was first written)**

## Page taxonomy

[DOMAIN-SPECIFIC SECTION — see below]

## Naming conventions

- All filenames are `kebab-case.md`
- Source pages live in `wiki/sources/` and use the slugified source title
- Entity pages live in `wiki/entities/` (or domain-equivalent)
- Concept pages live in `wiki/concepts/` (or domain-equivalent)
- Index lives at `wiki/index.md`
- Log lives at `wiki/log.md`

## Frontmatter conventions

Every wiki page has YAML frontmatter:

```yaml
---
type: source | entity | concept | comparison | analysis | lint
title: <human-readable>
created: YYYY-MM-DD
updated: YYYY-MM-DD
sources: [<list of source-page slugs that contributed>]
tags: [<freeform tags>]
---
```

For source pages, add `citation:` and `url:` (or `path:`) fields.

## Linking conventions

- Internal links use standard markdown: `[Display](../concepts/foo.md)`
- (Or `[[wikilinks]]` if the user opted into Obsidian-style during init.)
- Every claim that depends on a source MUST link to the source page
- Cross-references go in `## See also` at the bottom of every page

## Log format

Every operation appends an entry to `wiki/log.md` with this exact format:

```markdown
## [YYYY-MM-DD] <op> | <title>
- <bullet describing what happened>
- <pages touched, findings, etc.>
```

The bracket-prefix convention means `grep "^## \[" wiki/log.md | tail -10` shows recent activity.

## Ingest rules

When ingesting a source:

1. Copy the source to `raw/<slug>.<ext>` (preserve the original verbatim)
2. Read it fully — no skimming
3. Discuss key takeaways with the human before writing (unless the human said batch mode)
4. Write `wiki/sources/<slug>.md` with summary, key claims, methodology, relevance
5. Update every entity/concept page that the source touches
6. Flag contradictions inline with: `> ⚠ Contradiction: [previous source] said X; this source says Y`
7. Update `wiki/index.md` with new pages and reclassified pages
8. Append a log entry

A meaningful ingest touches 5-15 pages. If you touched only the source page, you skipped the
cross-reference pass.

## Query rules

When answering a question:

1. Read `wiki/index.md` first to find candidate pages
2. Read candidate pages in full
3. Cite specific pages inline with markdown links
4. If the wiki has no information on the topic, say so explicitly — never fabricate
5. If the answer is a synthesis, comparison, analysis, or new map of the territory, offer to
   file it back as a wiki page (path suggestion + index update)
6. Append a log entry

## Lint rules

When linting, check for:

- Contradictions between pages
- Stale claims newer sources have superseded
- Orphan pages (no inbound links)
- Hub pages (way more inbound links than the average — candidates for splitting)
- Concepts mentioned in 3+ pages but lacking their own page (candidates to promote)
- Missing cross-references
- Index drift (pages exist but missing from index; index entries pointing nowhere)
- Empty or thin pages (< 5 lines of substantive content)
- Gaps the wiki implies but doesn't fill — suggest new questions or sources

Produce a categorized report in `wiki/lint-YYYY-MM-DD.md`. Offer fixes one category at a time.

## What the LLM never does

- Modify files in `raw/`
- Skip the index/log update during ingest
- Fabricate citations
- Overwrite a page wholesale when the human may have edited it — append or refactor carefully
- Create stub pages without a corresponding ingest. Pages exist because a source justified them
- Silently violate this schema. If you need to deviate, ask the human and update this file.

## Bootstrapping a fresh session

A future LLM session — even one with no prior context and without any specialized skill
loaded — should be able to maintain this wiki consistently. On entry:

1. Read this file (the schema) end-to-end. It is the authoritative contract.
2. Read `wiki/index.md` for the current content map.
3. Skim the last ~10 entries of `wiki/log.md` (`grep "^## \[" wiki/log.md | tail -10`) for
   recent activity and pending follow-ups.
4. Then accept operations from the human.

That's it. The wiki is self-describing on purpose — this file plus the index plus the log
contain everything a fresh agent needs to keep the wiki consistent.

## Editing this schema

The human owns this file. Edit it freely as conventions evolve — add new page types, change
the taxonomy, tighten frontmatter, add domain-specific rules. The LLM reads this file before
every operation and respects whatever it finds here.
```

## Domain-specific "Page taxonomy" sections

### `personal` domain

```markdown
## Page taxonomy

- `wiki/entities/people/<slug>.md` — people (mentors, family, friends, public figures)
- `wiki/entities/places/<slug>.md` — places of personal significance
- `wiki/concepts/<slug>.md` — concepts or themes the human is exploring (e.g. "executive
  function", "stoicism", "sleep architecture")
- `wiki/journals/YYYY-MM-DD.md` — daily entries when the source is a journal
- `wiki/sources/<slug>.md` — articles, podcast notes, book chapters
- `wiki/goals/<slug>.md` — long-running goals with state and history
```

### `research` domain

```markdown
## Page taxonomy

- `wiki/entities/<slug>.md` — researchers, labs, institutions, datasets, models
- `wiki/concepts/<slug>.md` — technical concepts (e.g. "attention sinks", "speculative decoding")
- `wiki/sources/<slug>.md` — papers, articles, blog posts, talks
- `wiki/timelines/<topic>.md` — chronological summaries of how a subfield evolved
- `wiki/comparisons/<slug>.md` — head-to-head comparisons (methods, papers, models)
- `wiki/synthesis.md` — top-level evolving thesis the human is forming
```

### `book` domain

```markdown
## Page taxonomy

- `wiki/characters/<slug>.md` — character pages
- `wiki/places/<slug>.md` — settings
- `wiki/themes/<slug>.md` — themes the book develops
- `wiki/plot/<arc>.md` — plot threads
- `wiki/chapters/<NN>-<slug>.md` — one page per chapter as it's read
- `wiki/sources/<slug>.md` — outside material (essays, interviews, criticism)
- `wiki/timeline.md` — book-world chronology
```

### `business` domain

```markdown
## Page taxonomy

- `wiki/entities/people/<slug>.md` — internal people, customers, vendors
- `wiki/entities/teams/<slug>.md` — teams and orgs
- `wiki/entities/products/<slug>.md` — products and components
- `wiki/concepts/<slug>.md` — domain concepts and terms
- `wiki/decisions/<YYYY-MM-DD>-<slug>.md` — decision records (Why was X chosen?)
- `wiki/sources/<slug>.md` — meeting notes, transcripts, customer calls, Slack threads
- `wiki/projects/<slug>.md` — active and historical projects
```

### `custom` domain

Ask the user to describe their taxonomy and write it directly. Confirm before writing.

## Starter index.md

The skill writes this as `wiki/index.md` on init. Empty categories with placeholders:

```markdown
# Wiki Index

This file catalogs every page in the wiki. Updated on every ingest. Use it to navigate.

## Sources

_None yet. Sources live in `wiki/sources/`._

## Entities

_None yet._

## Concepts

_None yet._

## Comparisons & Analyses

_None yet._

## Open Questions

_None yet. Lint passes may add suggestions here._
```

For domains with custom categories (book → Characters/Places/Themes/Plot/Chapters; business →
People/Teams/Decisions/Projects), use those category names instead.

## Starter log.md

```markdown
# Wiki Log

Append-only chronological record of every operation. Entries start `## [YYYY-MM-DD] op | title`
so `grep "^## \[" log.md | tail -10` shows recent activity.

## [<TODAY>] init | Wiki initialized for <DOMAIN>
- Created structure: raw/, wiki/, schema at <SCHEMA_FILENAME>
- Domain: <DOMAIN>
- Page taxonomy: see schema
```
