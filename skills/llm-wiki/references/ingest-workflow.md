# Ingest Workflow

Detailed procedure for the `ingest` operation. A meaningful ingest touches 5-15 pages. If you
only wrote a source page, you skipped the cross-reference pass and the ingest is incomplete.

## Step 0 — Read the schema

Before doing anything else, read the wiki's schema file (`WIKI.md`, `CLAUDE.md`, or `AGENTS.md`
with the `<!-- llm-wiki-schema -->` marker). The schema defines page taxonomy, frontmatter,
linking style, and any user-specific rules. Respect it. If you must deviate, ask the user
first and update the schema.

## Step 1 — Receive and preserve the source

Source types and how to handle each:

| Source type | Handling |
|-------------|----------|
| URL | WebFetch to get readable text. Save the markdown rendering to `raw/<slug>.md` with a frontmatter block containing `url:`, `fetched:`, `title:`. |
| Local file (already in `raw/`) | Use it directly. |
| Local file (elsewhere) | Copy to `raw/<slug>.<ext>`. Preserve the original. |
| PDF | Save the PDF to `raw/<slug>.pdf`. Extract text (with the Read tool or a CLI like `pdftotext`) — do not edit the PDF itself. |
| Pasted text | Save to `raw/<slug>.md` with frontmatter noting `source: pasted`, `date: YYYY-MM-DD`. |
| "This thing we just discussed" | Capture the relevant prose into `raw/<slug>-discussion.md` with frontmatter noting the date. |

**Slug rule**: lowercase, hyphens, no punctuation. Truncate to ~60 chars. If the slug collides
with an existing file in `raw/`, append a short suffix.

## Step 2 — Read the source fully

No skimming. If the source is long:

- Summarize section by section internally before writing anything to the wiki
- For a multi-chapter book or paper, treat each chapter/section as a candidate sub-ingest
- For very long sources (>50 pages), ask the user whether to ingest as one source page or
  one-page-per-chapter

## Step 3 — Discuss before writing

Unless the user explicitly said "batch mode, don't interrupt," surface to the user:

- **Main claim or thesis** — one sentence
- **Entities and concepts that appear** — list them
- **Connection to existing wiki** — which existing pages this source touches; which existing
  claims it confirms, extends, or contradicts
- **Any new entity/concept that warrants its own page**
- **Proposed scope** — what pages will be touched

Wait for confirmation or correction before writing.

## Step 4 — Plan the writes

Read `wiki/index.md` first. For each entity/concept the source mentions, check whether a page
exists.

Build a write plan:

```
Source page:    wiki/sources/<slug>.md            (new)
Entity pages:   wiki/entities/<a>.md              (update — add section on X)
                wiki/entities/<b>.md              (NEW — first time mentioned anywhere)
Concept pages:  wiki/concepts/<c>.md              (update — flag contradiction with prior claim)
Index:          wiki/index.md                     (add 3 new pages, no reclassification)
Log:            wiki/log.md                       (append ingest entry)
```

Share the plan with the user briefly. Proceed.

## Step 5 — Write the source page

Template for `wiki/sources/<slug>.md`:

```markdown
---
type: source
title: <Source title>
created: <YYYY-MM-DD ingested>
url: <URL or null>
path: raw/<slug>.<ext>
citation: <author, year, venue if applicable>
tags: [<freeform>]
---

# <Source title>

> One-sentence summary of what this source is and why it's in the wiki.

## Key claims

- <Claim 1, with page or section ref if applicable>
- <Claim 2>
- ...

## Methodology

<Only if the source is research: data, methods, limitations. Skip for opinion pieces, news,
journal entries.>

## Relevance to this wiki

<Two or three sentences: which existing concepts/entities this source affects, what synthesis
it strengthens or challenges. The CROSS-REFERENCE ANCHOR — this section tells future you why
this source mattered.>

## Open questions raised

- <Questions this source leaves open that future sources or queries might address>

## See also

- [Linked entity page](../entities/foo.md)
- [Linked concept page](../concepts/bar.md)
```

## Step 6 — Update entity/concept pages

For each affected page:

**If the page exists:**

- Locate the right section (or add a new `## <Topic>` section)
- Append a paragraph or bullet integrating the new claim
- Link back to the source page: `(per [source-title](../sources/<slug>.md))`
- **If the claim contradicts an existing claim on the page**, do NOT silently overwrite. Use
  this block:

  ```markdown
  > ⚠ **Contradiction**: [previous-source](../sources/<prev>.md) claimed X.
  > [this-source](../sources/<slug>.md) claims Y.
  > <One-line note: which seems stronger and why, OR "unresolved — flagged for human review">
  ```

- Update the page's `updated:` frontmatter date
- Append the source slug to the page's `sources:` frontmatter list

**If the page is new:**

- Create it with the standard frontmatter
- Write a short opening paragraph defining the entity/concept
- Add the source-derived content
- Add `## See also` with cross-references to related existing pages

## Step 7 — Update index.md

For every new page, add an entry under the right category in `wiki/index.md`:

```markdown
- [Page Title](sources/<slug>.md) — <one-line description>
```

If a page was reclassified (e.g. was a concept, now warrants its own entity page after a split),
update its index entry. Remove entries for any pages that were merged or deleted.

Keep `index.md` sorted alphabetically within each category — agents and humans both rely on
predictable ordering.

## Step 8 — Append to log.md

Format:

```markdown
## [YYYY-MM-DD] ingest | <Source title>
- Source: `raw/<slug>.<ext>`
- Source page: `wiki/sources/<slug>.md` (new)
- Updated: `wiki/entities/a.md`, `wiki/concepts/c.md`
- Created: `wiki/entities/b.md`
- Contradictions flagged: 1 (in `wiki/concepts/c.md`)
```

The `## [` prefix is non-negotiable — `grep "^## \[" wiki/log.md` is a documented affordance.

## Step 9 — Report to the user

Summarize:

> Ingested `<source-title>`.
> - Source page: `wiki/sources/<slug>.md`
> - Updated 2 pages: `entities/a.md`, `concepts/c.md`
> - Created 1 new page: `entities/b.md`
> - Flagged 1 contradiction in `concepts/c.md`
> - Index and log updated.
>
> Want to review any of these now?

## Edge cases

- **Source duplicates an existing one.** If a similar URL or title is already in `raw/`, flag
  it and ask the user whether to skip, replace, or treat as a complementary source (e.g. a
  revised edition).
- **Source contradicts the wiki widely.** If a single source contradicts 5+ pages, the source
  may be wrong OR the wiki may need a major revision. Surface this to the user before doing
  bulk updates.
- **Source has nothing new.** Still write the source page (for provenance and the audit trail)
  but the entity/concept updates may be minimal. Log this honestly: "Source page created; no
  existing claims updated — this source largely confirms existing synthesis."
- **Source is an image-heavy article.** Note in the source page that visuals contributed
  material and either describe them in text or (if the user opted into image handling) save
  images to `raw/assets/` and reference them in the source page.
- **Source is in a foreign language.** Translate before integrating. Note the translation in
  the source page's frontmatter.
- **Pasted snippet without citation.** Ask for citation. If genuinely unattributable, mark the
  source page's frontmatter with `citation: unknown` and flag in `See also` that claims trace
  to an unattributed source.
