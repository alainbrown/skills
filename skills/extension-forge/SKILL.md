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
  Release on version bump + passing tests. Works on a fresh idea (scaffold), wraps an existing
  extension (add what's missing), OR conforms an existing, already-equipped extension to a
  consistent canonical layout + workflows (reorganize assets into docs/, retarget the build to
  dist/, unify the test/release/package pipeline). Use when the user says "create a chrome
  extension", "build a browser extension", "publish to the chrome web store", "make a chrome
  extension with a demo video", "set up CWS assets", "package my extension for the store", "ship
  my extension", "add a demo + release pipeline to my extension", "standardize/normalize my
  extension(s)", "make my extensions consistent", "put the assets in a consistent spot", or
  "fix/standardize my test and release workflow".
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

Schema in `references/state-schema.md`. Key fields: `phase`, `mode`, `scope` (new | wrap | conform),
`project` (path, name, packageManager), `extension` (oneLiner, coreFeature, surfaces, permissions,
hostPermissions), `context` (audience, tone, brandColor, demoBeats), `options` (iconAutoGen,
macosRunner, marketingPage, voiceOver), `cws` (justificationsDone, privacyDone), `demo` (rendered, narrated, assets),
`repo` (workflowsDone, badges), `conform` (branch, plan, moves), `decisions`.
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
| `references/conventions.md` | The canonical layout / version / workflow / packaging standard a repo is normalized to (keeptidy is the reference) + the conformance-table shape | `conform_assess`, `conform_apply` |

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
├── demo/                       Remotion project (Dockerfile, docker-compose.yml, compositions, render-all.sh, narration.json)
├── docs/                       rendered assets: demo.mp4 (narrated if voiceOver), demo.gif, store/*, youtube-thumbnail.png
├── marketing/                  optional GH Pages landing page
├── .github/workflows/          test.yml (push+PR) · release.yml (version-bump gate) · deploy.yml?
├── PRIVACY.md · store-assets/cws-justifications.md
├── README.md (badges) · LICENSE · .gitignore
```

<process>

<step name="route">
**Confirm intent, detect scope, set up state.**

Read `.forge-state.json` if it exists (resuming). Otherwise create it.

**Detect scope** — three paths:
- A fresh idea / empty dir → `scope: new`. The skill scaffolds the extension too.
- An existing extension that is MISSING launch pieces (no demo / CWS docs / CI / assets) → `scope: wrap`. Read the manifest and code; pre-fill `state.extension`. The skill ADDS what's missing and never overwrites working code.
- An existing, already-equipped extension the user wants STANDARDIZED — assets in a consistent spot, build dir / version source / workflows unified to the canonical convention → `scope: conform`. The user says things like "make my extensions consistent", "normalize the layout", "fix my release workflow". This path reorganizes structure (it does not add features).

If ambiguous, ask which of the three. Tell the user plainly: `wrap` adds missing pieces without touching code; `conform` moves files and rewrites workflows to a standard (on a branch). Confirm `state.project.path` (default `<cwd>/<name>/` for new; the existing dir otherwise).

**Mode** (if not already set): `interactive` (pause + confirm each step) or `auto` (recommended defaults, one batch confirm). Store in state.

▶ Next: `identify` (new / wrap) or `conform_assess` (conform)
</step>

<step name="conform_assess">
**(`scope: conform` only) Diff the existing repo against the canonical conventions and produce a migration plan. Read-only — no changes yet.**

Read `references/conventions.md` (the canonical standard) and `references/asset-spec.md`. Then inventory the actual repo:
- Where marketing assets currently live (vs `docs/` + `docs/store/`).
- The build output dir (vs `dist/`).
- The version source of truth — `package.json` vs `manifest.json` (vs `package.json`).
- The workflow files and their **trigger patterns** (e.g. `workflow_run` chaining vs the canonical reusable `workflow_call` gate); whether release detects a version bump and is gated on tests.
- Whether packaging exists (`scripts/package-extension.sh`) and what it zips.
- README badges and asset links that will need repointing.

Also run the **permission audit** (`references/permissions-reference.md` § "Permission audit") — "tests/releases/packages as expected" includes a clean permission set.

Produce the **conformance table** (`aspect | current | canonical | action | risk` where action ∈ move / retarget / replace / add / prune / ok). **Classify each action's risk:**
- **mechanical** — a safe file move / rename / reference update / workflow swap with a contained blast radius (relocating assets, version-naming the zip, moving test dirs, replacing a `workflow_run` trigger with the reusable gate). Apply these freely.
- **structural** — changes the build philosophy or version-source model (relocating the *build output dir* when the repo uses a static-manifest layout; inverting which file is the version source of truth). Present these as **explicit opt-in**, each with its blast radius spelled out — never bundle a build-system migration into a "tidy up the layout" request.

A request like "put the assets in a consistent spot" or "fix my workflows" means the **mechanical** set; offer the structural items separately. **PRESERVE** repo-specific and intentional divergences rather than dropping them (e.g. a macOS WebGPU runner, a `check:marketing` asset-ref check, COOP/COEP headers, or a deliberately-enabled CWS auto-publish even though canonical is GitHub-Release-only). Present the full plan and get explicit approval before any change (in `auto` mode, apply the mechanical set and present the structural set). Save to `state.conform.plan`.

▶ Next: `conform_apply`
</step>

<step name="conform_apply">
**(`scope: conform` only) Apply the plan on a branch, preserving history, updating every reference. Move files and swap workflows — never rewrite feature code.**

Apply the **mechanical** actions from the approved plan. Apply a **structural** action (build-dir relocation, version-source inversion) ONLY if the user explicitly opted into it; otherwise leave it in the summary as a recommended follow-up. Skip `preserve` items entirely.

1. **Branch first.** `git switch -c chore/conform-layout` (or similar). NEVER reorganize on the main branch. Record the branch in `state.conform.branch`.
2. **Move with history.** Use `git mv` for every relocation (assets → `docs/` + `docs/store/`, tests → `tests/`, etc.) so blame/history survive.
3. **Retarget references** for each move: the build tool's output dir → `dist/` (vite/crxjs config + `.gitignore`), manifest icon paths, README asset links + badge URLs, marketing `<video>`/poster `src`, any `import`/path that pointed at an old location.
4. **Unify version source** if needed: make `package.json` the source of truth; the manifest reads it. Update release detection to diff `package.json`.
5. **Swap workflows** to the canonical `references/workflows/` (reusable `workflow_call` test gate + version-bump release), adapting to the repo's package manager + build command. **Preserve** the repo-specific steps flagged in `conform_assess`.
6. **Add packaging** (`scripts/package-extension.sh`) if missing; ensure it zips `dist/`.
7. **Apply permission-audit prunes** from `conform_assess`.

Do file moves + reference updates + workflow swaps ONLY. Do not refactor feature logic or change architecture. After each batch of moves, sanity-check that imports/refs still resolve.

Update `state.conform.moves`. ▶ Next: `verify`
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
7. **Voice-over?** (optional, default no) — should the demo video have an AI voice-over narrating each beat? If yes, set `options.voiceOver = true`; the `demo` step will draft a narration script for the user to approve and render it with a self-hosted Kokoro TTS (Docker required). On-screen captions stay regardless — voice layers on top.

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

3. **Voice-over** (only if `options.voiceOver`): draft a narration script and edit `demo/narration.json` — one `text` line per scene, worded to match each scene's on-screen `Caption` (keep voice + captions aligned). Pick a `voice` from the Kokoro list mapped to `state.context.tone`. **Show the draft to the user and let them edit before rendering** — the script is the biggest lever on whether the demo sounds good. The narrated render is audio-driven: each scene auto-sizes to its line, so don't hand-time durations.
4. **Render in Docker** (reproducible):
   - Silent (default): `npm run render:docker` (builds the image off `mcr.microsoft.com/playwright`, pre-ensures Chromium, runs `render-all.sh`, writes to `docs/`).
   - Narrated (if `options.voiceOver`): `npm run render:voice` — brings up the off-the-shelf Kokoro TTS container (the `voice` compose profile), synthesizes the voice, mixes it into `demo.mp4`, tears down. Weights are baked into the image (ready in seconds, no download); CPU-only on Mac, so synthesis is slower there but still works. The **GIF stays silent** regardless. Set `state.demo.narrated = true` on success.
   - If Docker isn't available, stage everything and tell the user the exact command to run later — DON'T fail the whole flow. Record `state.demo.rendered = false` (and, if voice was requested, `state.demo.narrated = false`) and continue. Voice-over NEVER blocks the build — if the TTS container or render fails, fall back to the silent render.
5. **Verify assets** exist at the right dimensions; the GIF is palette-optimized and reasonably sized for a README hero. If narrated, confirm `demo.mp4` has an audio track.

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

**For `scope: conform`:** the bar is *nothing broke*. Confirm the build still outputs to the canonical `dist/`, every moved asset resolves at its new path (no dead README/marketing links), the swapped workflows are valid YAML with the version-bump→test-gate→release wiring intact, `package-extension.sh` zips `dist/`, and tests still pass. Diff against the pre-conform state to confirm only files moved + references/workflows changed — no feature code was rewritten.

Report a one-screen summary: build ✓/✗, unit/e2e pass-skip-fail, assets present, permission audit clean (no unused/undeclared), anything flagged `// TODO: verify`. If the build fails, diagnose and fix before `done` — never hand over an extension that doesn't build.

▶ Next: `done`
</step>

<step name="done">
**Wrap up.**

**For `scope: new` / `wrap`:**
- Print final summary: surfaces, permissions, where the repo lives, how to load it unpacked, how to render assets (if not already), how to publish (zip → CWS dashboard).
- List the manual follow-ups CWS requires: create the listing, upload the zip + assets, paste the justifications, set the privacy-policy URL, then fill the README's CWS badge id.
- Delete `.forge-state.json` from the user's project.

**For `scope: conform`:**
- Print the conformance summary: what moved where, what workflows changed, what was pruned, and the branch name.
- Leave the work on its branch for review — show the user how to inspect the diff (`git diff main...HEAD --stat`) and suggest opening a PR. Keep `.forge-state.json` until the user merges or says done (so a multi-repo conform run can resume).

- Offer to commit only if the user asks — it's their repo. (For conform, the moves are already on a branch; still don't commit/push unless asked.)
</step>

</process>

<guardrails>
- NEVER overwrite working code in `scope: wrap` — only add what's missing.
- In `scope: conform`, NEVER reorganize on the main branch — always work on a branch, use `git mv` to preserve history, and re-verify build + tests after the moves. Conform ONLY moves files, updates references, and swaps workflows/packaging to the canonical standard — it NEVER rewrites feature logic or changes architecture. Preserve repo-specific workflow steps (e.g. a macOS WebGPU runner, an asset-ref check) rather than dropping them.
- NEVER request permissions or host permissions the extension doesn't actually use — over-broad requests get CWS-rejected. Run the permission audit (grep the code per `permissions-reference.md`) and PRUNE anything unused; narrow `<all_urls>` to observed origins or switch to `activeTab`. Justify only the audited set.
- NEVER put `chrome.*` calls inside presentational components — they must stay props-only so the demo can reuse them. Wire Chrome APIs in container components / the service worker.
- NEVER write @crxjs / Remotion / MV3 boilerplate from memory when uncertain — the starters are authoritative; flag novel bits with `// TODO: verify` and suggest a docs lookup.
- NEVER require MCP/docs tools to function — optional enhancement only.
- NEVER auto-publish to the Chrome Web Store — release is a GitHub Release with a zip for manual upload (this build excludes CWS auto-publish wiring).
- NEVER fail the whole flow if Docker is unavailable — stage the render and give the exact command.
- Voice-over is OPTIONAL and additive — it requires Docker (the TTS server is a container). If `options.voiceOver` is off, or Docker/the TTS service is unavailable or fails, render the demo SILENT exactly as before; never block the build on it. On-screen captions always render either way.
- NEVER ship an extension that doesn't build — `verify` is mandatory.
- Delete `.forge-state.json` from the user's project at the end.
- If the user's request doesn't fit (e.g., a Firefox-only extension, or a non-extension web app), say what the skill handles rather than force-fitting.
</guardrails>

<success_criteria>
- [ ] `.forge-state.json` created and updated after each step
- [ ] Scope detected (new / wrap / conform); existing code never overwritten (wrap) or rewritten (conform)
- [ ] (conform) Conformance assessed against `references/conventions.md`; migration plan approved; applied on a branch with `git mv`; build + tests still pass; only files moved + workflows/refs changed
- [ ] Identity captured: name, one-liner, core feature, surfaces, permissions + host permissions, brand, demo beats
- [ ] Extension scaffolded (or wrapped) with MV3 manifest, picked surfaces, pure components, branded tokens, icons
- [ ] Permission audit run: declared manifest reconciled against actual code use; unused permissions pruned, broad host patterns narrowed; audited set recorded
- [ ] CWS paperwork generated: per-permission PRIVACY.md + cws-justifications.md (single purpose, store-listing copy, per-permission, host, data-usage + data-type table, remote-code) + packaging script
- [ ] Demo project copied; compositions reuse live components; demo.mp4 + demo.gif + all store assets rendered (or render command staged if no Docker)
- [ ] (if voiceOver) narration script drafted, user-approved, and rendered into demo.mp4 via the Kokoro `voice` profile — or silent fallback if Docker/TTS unavailable
- [ ] README with badge block, test.yml (push+PR), release.yml (version-bump → reusable test gate → GitHub Release), .gitignore, LICENSE
- [ ] Marketing landing page scaffolded (option enabled)
- [ ] Build verified: install + build + tests pass; unpacked load confirmed; assets present
- [ ] Final summary + CWS manual follow-ups listed
- [ ] `.forge-state.json` deleted from the user's project (build scopes) / conform branch left for review
</success_criteria>
