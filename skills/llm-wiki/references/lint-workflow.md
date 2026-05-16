# Lint Workflow

Detailed procedure for the `lint` operation. The goal is a categorized, actionable report and
guided fixes — not a wall of nitpicks.

## Step 0 — Read the schema

The schema's lint rules override defaults. Some users customize lint to skip certain checks
(e.g. a personal wiki may not care about orphan pages).

## Step 1 — Inventory

Walk `wiki/`. For each file, capture:

- Path
- Type (from frontmatter)
- Title
- Created / updated dates
- Source citations (from `sources:` frontmatter and inline links)
- Outbound links (other wiki pages it references)
- Inbound links (build this by inverting the outbound graph)
- Line count

Use bash for the heavy lifting:

```bash
# All pages
find wiki -name "*.md" -not -name "log.md" -not -name "index.md"

# Quick inbound-link count for one page
grep -r "concepts/sparse-attention.md" wiki/ | wc -l
```

For larger wikis (100+ pages), suggest writing a small `lint.sh` script that produces a JSON
graph — see the optional CLI tools section below.

## Step 2 — Run the checks

Each check produces zero or more findings. A finding has:

```yaml
category: contradictions | stale | orphans | hubs | missing-pages | missing-refs | index-drift | thin | gaps
severity: high | medium | low
page: wiki/path/to/affected.md
description: <one line>
proposed_action: <one line — what would fix it>
```

### Check 1: Contradictions

Look for `> ⚠ Contradiction:` blocks left unresolved. Also check pages where two consecutive
claims, both citing different sources, are about the same property with different values.

- **High** if both claims are about a core entity property
- **Medium** if it's a peripheral detail
- **Low** if the contradiction is already flagged with a clear resolution path

### Check 2: Stale claims

A claim is stale if a newer source on the same page or a linked page contradicts or supersedes
it. Heuristic: page citations span >12 months AND the newest source on a topic disagrees with
the page's main summary. Surface as: "page X's main summary cites [old-source, 2024], but [new-
source, 2026] on the same page says Y."

### Check 3: Orphan pages

Pages with zero inbound links (except from `index.md`, which doesn't count).

- **High** if the page is substantive (>20 lines)
- **Medium** otherwise

Proposed action: identify candidate pages that *should* link to it (semantic similarity by
title and tags), or recommend deletion/merge.

### Check 4: Hub pages

Pages with inbound links > 3× the average page's inbound count. May indicate the page is
overloaded and should be split.

- **Medium** by default; **high** if the page is also long (>200 lines)

Proposed action: "Page <X> is a hub (28 inbound links). Consider splitting into <suggested
sub-pages>."

### Check 5: Missing-page candidates

Concepts or entities mentioned in 3+ pages but lacking their own dedicated page. Heuristic:
identify capitalized noun phrases that appear in 3+ pages and are not the title of any existing
page.

Proposed action: "Promote `<term>` to its own page at `wiki/concepts/<slug>.md` — extract
mentions from <page-list>."

### Check 6: Missing cross-references

Page A mentions concept on page B but doesn't link to it. Heuristic: if page A contains the
exact title of page B (case-insensitive) but doesn't contain a link to page B, flag.

- **Medium** for entity/concept mentions
- **Low** for narrative pages where the link would be stylistically awkward

Proposed action: "Add link to `concepts/foo.md` from `entities/bar.md` line N."

### Check 7: Index drift

- Pages exist in `wiki/` but missing from `index.md`
- Index entries point to nonexistent files
- Index has duplicate entries

All **high** — the index is the navigation root. Drift breaks the query workflow.

Proposed action: enumerate the diff between disk and index; offer to regenerate the affected
index sections.

### Check 8: Thin pages

Pages with fewer than ~5 lines of substantive content (excluding frontmatter, headers, `See
also`).

- **Low** by default
- **Medium** if the page is also old (created >3 months ago and never updated)

Proposed action: "Thin page `<X>` — either flesh out from existing sources, merge into a parent
page, or delete."

### Check 9: Gaps and open questions

Pages where the text says "TODO", "unclear", "needs more research", or where the synthesis
explicitly notes a missing source. Also pages that pose questions in their text but never answer
them.

- **Low** unless the user has been actively ingesting around this topic

Proposed action: "Gap noted on `<X>`: <question>. Suggested external sources: <if you can name
any>."

## Step 3 — Produce the report

Write `wiki/lint-<YYYY-MM-DD>.md`:

```markdown
---
type: lint
title: Lint report YYYY-MM-DD
created: YYYY-MM-DD
---

# Lint report — YYYY-MM-DD

**Wiki size:** N pages, M sources
**Total findings:** K (X high, Y medium, Z low)

## High severity (X)

### Contradictions (n)

- **`concepts/foo.md`** — unresolved contradiction between [source-a] and [source-b] on
  the question of <X>.
  - Proposed action: review the two sources; pick a winner or split into "consensus" vs
    "minority view" sections.

### Index drift (n)

- ...

## Medium severity (Y)

...

## Low severity (Z)

...

## Suggested investigations

- <Open questions and gaps surfaced — these are seeds for future ingest work>
```

## Step 4 — Offer to apply fixes

Present the report to the user, then offer fixes ONE CATEGORY AT A TIME. Do not bulk-apply.

For each category:

> Found N <category> findings. Want me to:
> 1. Walk through them one by one (you decide each)
> 2. Auto-apply the safe ones (additions, link insertions) and walk through the rest
> 3. Skip this category for now

Safe fixes that can be auto-applied with one confirmation:

- Add missing cross-references (just inserts a link)
- Regenerate `index.md` sections that have drifted (rebuild from disk)
- Promote a concept to its own page (extracts mentions, leaves linked stubs)

Fixes that always need per-finding confirmation:

- Resolving contradictions (which source wins?)
- Deleting orphan or thin pages
- Splitting hub pages
- Marking a claim as stale

## Step 5 — Log the lint pass

```markdown
## [YYYY-MM-DD] lint | found K findings, fixed M
- Report: `wiki/lint-YYYY-MM-DD.md`
- High: X, Medium: Y, Low: Z
- Fixes applied: <category breakdown>
- Deferred: <category breakdown>
```

## Optional: a lint helper script

For wikis with 100+ pages, the inbound-link inversion gets slow with bash. Offer to write a
small Python or Deno script the user can run to produce a JSON graph:

```python
# Pseudocode
pages = walk(wiki_dir)
graph = {p.path: {"outbound": extract_links(p), "frontmatter": yaml.load(p.frontmatter)} for p in pages}
for p, data in graph.items():
    data["inbound"] = [q for q, qdata in graph.items() if p in qdata["outbound"]]
write_json(graph, "wiki/.lint-cache.json")
```

Then the skill reads the cache instead of recomputing. Add `.lint-cache.json` to `.gitignore`.

This is optional — only suggest if the user complains about lint speed or the wiki is genuinely
large.
