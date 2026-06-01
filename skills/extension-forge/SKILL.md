---
name: extension-forge
description: >
  Build and launch a complete Chrome (Manifest V3) browser extension by copying two vendored
  starters — a @crxjs + React + TypeScript extension skeleton and a Remotion-in-Docker demo
  project — then customizing them for the user's idea. Handles the parts an LLM fumbles: Chrome
  Web Store setup (manifest justifications, per-permission privacy policy, packaged zip), a
  reproducible demo video (demo.mp4 + palette-optimized GIF) plus all CWS marketing assets
  (icons, 1280×800 screenshots, 1400×560 marquee, 440×280 promo tile, 1280×720 YouTube
  thumbnail), a badged README, and GitHub Actions that test on every change and cut a GitHub
  Release on version bump + passing tests. Works on a fresh idea OR wraps an existing extension
  directory. Use when the user says "create a chrome extension", "build a browser extension",
  "publish to the chrome web store", "make a chrome extension with a demo video", "set up CWS
  assets", "package my extension for the store", "ship my extension", or "add a demo + release
  pipeline to my extension".
---

# Extension Forge

<purpose>
Take a Chrome extension from idea (or half-built code) to launch-ready. The LLM can usually write
the extension logic; what it fumbles is the productionization — CWS manifest justifications,
per-permission privacy policy, a reproducible demo video, the exact-dimension store assets, and a
test/release pipeline. This skill makes those parts rigid by copying two complete, bootable
starters and customizing them, rather than generating fragile boilerplate from memory.
</purpose>

<core_principle>
**Durable state via `.forge-state.json`.** Survives context compression; single source of truth for
the build. Written at the user's repo root (NOT the skills repo).

- **Write after every step decision.** Update before moving on.
- **Read before each step.** Refresh context, especially after compression.
- **Clean up when the produced extension boots + assets render.** Delete `.forge-state.json` at the end.

Schema in `references/state-schema.md`. Key fields: `phase`, `mode`, `scope` (new | wrap),
`project` (path, name, packageManager), `extension` (oneLiner, coreFeature, surfaces, permissions,
hostPermissions), `context` (audience, tone, brandColor, demoBeats), `options` (iconAutoGen,
macosRunner, marketingPage), `cws` (justificationsDone, privacyDone), `demo` (rendered, assets),
`repo` (workflowsDone, badges), `decisions`.
</core_principle>

## Two starters (the copy-customize model)

```
starter-extension/  →  the shippable MV3 extension          starter-demo/  →  asset factory
──────────────────────────────────────────────────         ───────────────────────────────────
@crxjs/vite-plugin + React 19 + TypeScript 6                Remotion in Docker (Playwright base
manifest.config.ts (version synced from package.json)       + ffmpeg). Reuses the extension's
src/{popup,options,background,components}                    PURE presentational components with
  components are PROPS-ONLY (no chrome.* inside)  ◄──────────  mock props — single source of truth,
tests/{unit: vitest+chrome-stubs, e2e: playwright}          no UI drift between product and demo.
                                                            Emits demo.mp4 + demo.gif + all CWS
                                                            store assets at exact dimensions.
```

The skill **copies the entire starter directory**, then customizes manifest, surfaces, the actual
feature logic, demo scenes, and marketing copy. Stable knowledge (Dockerfile, workflows, configs,
CWS templates) lives as real files — never re-derived from memory.

## References

| File | Purpose | Loaded when |
|------|---------|-------------|
| `references/state-schema.md` | `.forge-state.json` fields + example | After `route` |
| `references/starter-extension/` | COMPLETE bootable MV3 extension — copied wholesale, then customized | `scaffold_extension` |
| `references/starter-demo/` | COMPLETE Remotion-in-Docker project — copied wholesale, then customized | `demo` |
| `references/workflows/` | `test.yml` + `release.yml` (reusable-workflow release gate) + optional `deploy.yml` | `repo_setup` |
| `references/cws/` | `PRIVACY.md` + `cws-justifications.md` templates, `package-extension.sh` | `cws_setup` |
| `references/permissions-reference.md` | Per-permission: what it's for, the CWS justification text, the privacy-policy line, **and the § "Permission audit" grep-map for reconciling the manifest against actual code use.** The LLM's weak spot — make this authoritative. | `identify`, `audit_permissions`, `cws_setup`, `verify` |
| `references/asset-spec.md` | Dimensions table + which Remotion composition emits which asset | `demo` |
| `references/readme-template.md` | README skeleton + badge block | `repo_setup` |
| `references/marketing/` | Optional static landing page + `deploy.yml` (only if `options.marketingPage`) | `repo_setup` |
| `references/fragile-patterns.md` | Known-fragile @crxjs / Remotion / MV3 bits → suggest docs lookup, flag `// TODO: verify` | `scaffold_extension`, `demo` |

## Architecture (the produced extension repo)

```
<project>/
├── manifest.config.ts          @crxjs manifest-as-code; version ← package.json
├── vite.config.ts · tsconfig*.json · package.json
├── src/
│   ├── popup/ · options/ · background/   surfaces the user picked
│   ├── components/             PURE presentational (props-only) — reused by demo
│   └── styles/tokens.css       brand tokens (color, type)
├── public/icons/{16,32,48,128}.png   (auto-gen from logo.svg if enabled)
├── tests/{unit,e2e}            vitest (chrome stubs) + playwright (loads unpacked)
├── demo/                       Remotion project (Dockerfile, compositions, render-all.sh)
├── docs/                       rendered assets: demo.mp4, demo.gif, store/*, youtube-thumbnail.png
├── marketing/                  optional GH Pages landing page
├── .github/workflows/          test.yml (push+PR) · release.yml (version-bump gate) · deploy.yml?
├── PRIVACY.md · store-assets/cws-justifications.md
├── README.md (badges) · LICENSE · .gitignore
```

<process>

<step name="route">
**Confirm intent, detect scope, set up state.**

Read `.forge-state.json` if it exists (resuming). Otherwise create it.

**Detect scope** — is the user pointing at an existing extension or starting fresh?
- An existing `manifest.json` / `manifest.config.ts` / `src/` with extension code in the target dir → `scope: wrap`. Read the manifest and code; pre-fill `state.extension` from it. The skill ADDS what's missing (CWS docs, demo, assets, workflows, README) and never overwrites working code.
- A fresh idea / empty dir → `scope: new`. The skill scaffolds the extension too.

If ambiguous, ask. Confirm `state.project.path` (default `<cwd>/<name>/` for new; the existing dir for wrap).

**Mode** (if not already set): `interactive` (pause + confirm each step) or `auto` (recommended defaults, one batch confirm). Store in state.

▶ Next: `identify`
</step>

<step name="identify">
**Establish the extension's identity and surface. This drives the manifest, demo scenes, and CWS docs.**

For `scope: wrap`, extract as much as possible from the existing manifest/code first, then confirm gaps. For `scope: new`, ask (one batch, plain follow-ups where open-ended):

1. **Name + one-liner** — store name and a single sentence (becomes manifest `description`, README tagline, CWS summary).
2. **Core feature** — what it does, in 2-3 sentences. The load-bearing user flow.
3. **Surfaces** (multi-select): popup · side panel · options page · content script · new-tab override · context-menu entry. Each maps to a manifest key and a starter sub-directory.
4. **Permissions** — what Chrome APIs it needs. For each, read `references/permissions-reference.md` and record the matching justification + privacy line. Also capture **host permissions** (which origins, and why — this is the #1 CWS rejection reason).
5. **Brand** — primary color + a logo (svg path if they have one; otherwise note to generate a placeholder). Drives `tokens.css`, icons, and demo styling.
6. **Demo beats** — 3-6 moments the demo video should show (e.g., "open side panel → select text → result streams in → settings"). These become Remotion scenes.

Write everything to `state.extension` and `state.context`. Keep components PURE from the start — the demo will mount them with mock props, so no `chrome.*` calls inside presentational components (wire those in `*Container` wrappers). State this constraint explicitly to the user; it's load-bearing.

▶ Next: `scaffold_extension`
</step>

<step name="scaffold_extension">
**Produce the extension by copying the starter and customizing — almost never write from scratch.**

**`scope: new`:**
1. `cp -r references/starter-extension/ <project>/` (entire directory).
2. **Customize the manifest** (`manifest.config.ts`): name, description, the surface keys for each picked surface (`action.default_popup`, `side_panel`, `options_page`, `background.service_worker`, `content_scripts`, `contextMenus`), `permissions`, `host_permissions`, icon paths.
3. **Wire the feature.** Implement the core feature in the relevant surface. Keep presentational components props-only; put `chrome.*` calls in container components / the service worker. Look for `// FORGE: …` markers in the starter for insertion points.
4. **Brand the tokens** (`src/styles/tokens.css`) from `state.context.brandColor`.
5. **Icons.** If `options.iconAutoGen`, drop the user's `logo.svg` into `design/` and run `node scripts/render-icons.mjs` to produce `public/icons/{16,32,48,128}.png`. Otherwise place provided PNGs.

**`scope: wrap`:** do NOT copy the starter over existing code. Instead graft only missing scaffolding (tests harness, configs) and adapt — match the existing build tool even if it isn't @crxjs. If the existing components are not pure/props-only, tell the user the demo step will need light refactoring (or mock wrappers) and let them choose. Existing manifests often carry crufty leftover permissions — the next step prunes them.

**Fragile patterns.** @crxjs config, MV3 CSP, and service-worker module type are version-sensitive. Read `references/fragile-patterns.md`; if a context7/docs tool is available, suggest verifying current @crxjs API; otherwise flag uncertain bits with `// TODO: verify`. Never require MCP.

Update `state.extension` (resolved surfaces, manifest path). ▶ Next: `audit_permissions`
</step>

<step name="audit_permissions">
**Reconcile the declared manifest against what the code actually uses. Prune the difference. Over-broad permissions are the #1 CWS rejection reason.**

Declaration-time good intentions aren't enough — verify against the code. Read
`references/permissions-reference.md` § "Permission audit" and run its procedure:

1. For each `permissions` / `optional_permissions` entry, grep the codebase (and the manifest) for its API surface using the grep-map. **Zero hits → propose removing it.**
2. Grep for `chrome.<namespace>` calls with no matching declared permission → propose **adding** it (or warn the call throws at runtime).
3. For each `host_permissions` pattern, find the real `fetch`/XHR/`connect-src` origins + `declarativeNetRequest` rule domains. **Narrow `<all_urls>`/broad patterns to the origins actually contacted.** If injection only happens on user action, recommend `activeTab` instead of a host permission.
4. Present the audit table (`permission | used? | evidence file:line | action`). Apply removals/narrowing to the manifest after the user confirms (in `auto` mode, apply and report). This is especially load-bearing in `scope: wrap`, where inherited cruft accumulates.

Only permissions that survive the audit get justified in `cws_setup`. Update `state.extension.permissions` to the audited set and record the audit table in `state.decisions`.

▶ Next: `cws_setup`
</step>

<step name="cws_setup">
**Generate the Chrome Web Store paperwork — the part the LLM most often gets wrong. Be rigid here.**

Justify only the **audited** permission set from `audit_permissions` — never a permission the code doesn't use.

1. **Privacy policy** — copy `references/cws/PRIVACY.md`, then for EACH audited permission + host permission, add the matching privacy-policy line from `references/permissions-reference.md`. State plainly what is and isn't collected. Most of these extensions are local-only — say so explicitly.
2. **Store justifications** — copy `references/cws/cws-justifications.md` and fill: **single purpose** (one sentence), **store-listing copy** (name ≤75 / summary ≤132 / description ≤16k chars), **per-permission justification** (from the reference — why each is needed, tied to a concrete feature), **host-permission justification**, **data-usage disclosures** + the **data-type table** (which categories the extension touches — all unchecked for local-only; check "Website content" if it reads page text even locally), **remote-code statement** (MV3 forbids remote code; state that all JS is bundled).
3. **Packaging** — copy `references/cws/package-extension.sh` (builds, zips the build output for upload).

If a host permission is still broad (`<all_urls>`) after the audit, surface it one more time here and justify it explicitly — reviewers scrutinize it.

Update `state.cws`. ▶ Next: `demo`
</step>

<step name="demo">
**Build the Remotion-in-Docker demo and render every CWS marketing asset.**

1. `cp -r references/starter-demo/ <project>/demo/`.
2. **Compositions reuse the live components.** Point the demo's `mockData.ts` + scene files at the extension's PURE components, feeding mock props that play out the `state.context.demoBeats`. Read `references/asset-spec.md` for the composition→asset map:

   | Composition | Output | Dimensions |
   |---|---|---|
   | `Demo` | `docs/demo.mp4` + `docs/demo.gif` (ffmpeg palette) | 1280×800 (or 1280×720) |
   | `Screenshot1-5` | `docs/store/screenshot-{1..5}.png` | 1280×800 |
   | `Marquee` | `docs/store/marquee.png` | 1400×560 |
   | `PromoTile` | `docs/store/promo-tile.png` | 440×280 |
   | `Thumbnail` | `docs/youtube-thumbnail.png` | 1280×720 |

3. **Render in Docker** (reproducible): `npm run render:docker` (builds the image off `mcr.microsoft.com/playwright`, pre-ensures Chromium, runs `render-all.sh`, writes to `docs/`). 
   - If Docker isn't available, stage everything and tell the user the exact command to run later — DON'T fail the whole flow. Record `state.demo.rendered = false` and continue.
4. **Verify assets** exist at the right dimensions; the GIF is palette-optimized and reasonably sized for a README hero.

Update `state.demo.assets`. ▶ Next: `repo_setup`
</step>

<step name="repo_setup">
**Wire the repo: README with badges, the test/release pipeline, and optional landing page.**

1. **README** — from `references/readme-template.md`: title + one-liner, badge block (CI status · License MIT · Chrome Web Store version — leave the CWS extension-id as a `TODO` until published), demo GIF hero, what-it-does, quick-start (`npm install && npm run build`, load unpacked from the build dir), stack, permissions table, privacy link.
2. **Workflows** — copy `references/workflows/`:
   - `test.yml` — triggers on `push` + `pull_request`; also `workflow_call` (reusable). Steps: setup Node, install, typecheck, vitest unit, install Playwright Chromium, e2e. Runner: `ubuntu-latest`. If `options.macosRunner` AND the extension needs WebGPU/GPU, switch the runner to `macos-14` and note why.
   - `release.yml` — triggers on `push` to main. Job `detect` compares `package.json` version to `HEAD~1`; if unchanged → no-op. If bumped → `check-tag` (skip if tag exists) → calls `test.yml` via `workflow_call` (the gate: **release only proceeds on passing tests**) → `release` builds, zips, and `gh release create v$VERSION` with generated notes. **GitHub Release only** — no CWS auto-publish (the zip is attached for manual dashboard upload; a one-line comment points there).
3. **`.gitignore`** — node_modules, build output dir, `*-workspace/`, `.env`.
4. **LICENSE** — MIT (confirm holder/year) unless the user wants otherwise.
5. **Marketing page** (if `options.marketingPage`): copy `references/marketing/` (static `index.html` + `privacy.html` + `deploy.yml` for GitHub Pages), point it at the rendered `docs/` video + poster.
6. **git init** if the dir isn't a repo yet (don't commit automatically — see `done`).

Update `state.repo`. ▶ Next: `verify`
</step>

<step name="verify">
**Prove it boots, tests pass, and assets exist.**

Run in the project: `npm install`, `npm run build` (typecheck + build), `npm test` (unit; e2e if Playwright is set up and the env allows). Confirm the build output dir loads as an unpacked extension (the e2e fixture does this) and that `docs/` contains the rendered assets (or that the render command is staged with a clear note if Docker was unavailable).

**Re-run the permission audit** (`references/permissions-reference.md` § "Permission audit") against the final code one last time — late-stage edits can leave a declared permission unused or call an undeclared API. The manifest's permission set must exactly match what the code uses.

Report a one-screen summary: build ✓/✗, unit/e2e pass-skip-fail, assets present, permission audit clean (no unused/undeclared), anything flagged `// TODO: verify`. If the build fails, diagnose and fix before `done` — never hand over an extension that doesn't build.

▶ Next: `done`
</step>

<step name="done">
**Wrap up.**

- Print final summary: surfaces, permissions, where the repo lives, how to load it unpacked, how to render assets (if not already), how to publish (zip → CWS dashboard).
- List the manual follow-ups CWS requires: create the listing, upload the zip + assets, paste the justifications, set the privacy-policy URL, then fill the README's CWS badge id.
- Delete `.forge-state.json` from the user's project.
- Offer to commit only if the user asks — it's their repo.
</step>

</process>

<guardrails>
- NEVER overwrite working code in `scope: wrap` — only add what's missing.
- NEVER request permissions or host permissions the extension doesn't actually use — over-broad requests get CWS-rejected. Run the permission audit (grep the code per `permissions-reference.md`) and PRUNE anything unused; narrow `<all_urls>` to observed origins or switch to `activeTab`. Justify only the audited set.
- NEVER put `chrome.*` calls inside presentational components — they must stay props-only so the demo can reuse them. Wire Chrome APIs in container components / the service worker.
- NEVER write @crxjs / Remotion / MV3 boilerplate from memory when uncertain — the starters are authoritative; flag novel bits with `// TODO: verify` and suggest a docs lookup.
- NEVER require MCP/docs tools to function — optional enhancement only.
- NEVER auto-publish to the Chrome Web Store — release is a GitHub Release with a zip for manual upload (this build excludes CWS auto-publish wiring).
- NEVER fail the whole flow if Docker is unavailable — stage the render and give the exact command.
- NEVER ship an extension that doesn't build — `verify` is mandatory.
- Delete `.forge-state.json` from the user's project at the end.
- If the user's request doesn't fit (e.g., a Firefox-only extension, or a non-extension web app), say what the skill handles rather than force-fitting.
</guardrails>

<success_criteria>
- [ ] `.forge-state.json` created and updated after each step
- [ ] Scope detected (new vs wrap); existing code never overwritten
- [ ] Identity captured: name, one-liner, core feature, surfaces, permissions + host permissions, brand, demo beats
- [ ] Extension scaffolded (or wrapped) with MV3 manifest, picked surfaces, pure components, branded tokens, icons
- [ ] Permission audit run: declared manifest reconciled against actual code use; unused permissions pruned, broad host patterns narrowed; audited set recorded
- [ ] CWS paperwork generated: per-permission PRIVACY.md + cws-justifications.md (single purpose, store-listing copy, per-permission, host, data-usage + data-type table, remote-code) + packaging script
- [ ] Demo project copied; compositions reuse live components; demo.mp4 + demo.gif + all store assets rendered (or render command staged if no Docker)
- [ ] README with badge block, test.yml (push+PR), release.yml (version-bump → reusable test gate → GitHub Release), .gitignore, LICENSE
- [ ] Marketing landing page scaffolded (option enabled)
- [ ] Build verified: install + build + tests pass; unpacked load confirmed; assets present
- [ ] Final summary + CWS manual follow-ups listed
- [ ] `.forge-state.json` deleted from the user's project
</success_criteria>
</content>
</invoke>
