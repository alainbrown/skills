# Extension Forge

Build and launch a complete Chrome (Manifest V3) browser extension — and handle the parts an LLM
normally fumbles: Chrome Web Store setup, a reproducible demo video, exact-dimension store assets,
and a test/release pipeline.

## Usage

Trigger it by describing what you want to build or ship:

- "Create a Chrome extension that lets me highlight text on any page and save it to a list."
- "Build a side-panel extension that summarizes the current page, with a marketing demo video."
- "I have a working extension in this folder — get it launch-ready for the Chrome Web Store."
- "Publish my extension: set up the store assets, privacy policy, and a release pipeline."

## What it does

Extension Forge copies two complete, **smoke-tested** starters and customizes them for your idea,
rather than generating fragile boilerplate from memory:

1. **`starter-extension/`** — a bootable MV3 extension: `@crxjs/vite-plugin` + React 19 +
   TypeScript 6, version synced from `package.json`, presentational components kept **pure**
   (props-only, no `chrome.*`) so the demo can reuse them, with Vitest + Playwright test setup.
2. **`starter-demo/`** — a Remotion-in-Docker asset factory that renders `demo.mp4`, a
   palette-optimized `demo.gif`, and every Chrome Web Store asset at exact dimensions, reusing the
   extension's live components (no UI drift).

It works on a **fresh idea** (scaffolds the extension) or **wraps an existing extension** (adds
only what's missing, never overwriting working code).

## Features

- **Permission audit** — reconciles the declared manifest against what the code actually calls,
  prunes unused permissions, and narrows broad host patterns (`<all_urls>` → observed origins, or
  `activeTab`). Over-broad permissions are the #1 CWS rejection reason.
- **Chrome Web Store paperwork** — per-permission privacy policy, reviewer justifications,
  single-purpose statement, store-listing copy (with char limits), data-type disclosure table, and
  the MV3 remote-code statement.
- **Reproducible demo** — Remotion rendered in Docker (`mcr.microsoft.com/playwright` base + ffmpeg)
  → `demo.mp4` + `demo.gif`, reusing the live UI components with mock props.
- **Exact store assets** — screenshots 1280×800, marquee 1400×560, promo tile 440×280, YouTube
  thumbnail 1280×720, icons 16/32/48/128 (auto-generated from one `logo.svg`).
- **Version-gated release** — `test.yml` runs on every push + PR; `release.yml` detects a
  `package.json` version bump, runs the tests as a reusable gate, and cuts a GitHub Release with the
  packaged zip only when they pass. (CWS auto-publish intentionally excluded — GitHub Release only.)
- **Badged README + optional marketing landing page** (static GitHub Pages site).
- **Durable state** via `.forge-state.json` so long builds survive context compression.

## Safety

- Never overwrites working code in `wrap` scope — additive only.
- Never declares permissions the code doesn't use; audits and prunes.
- Never auto-publishes to the Chrome Web Store — release is a GitHub Release with a zip for manual
  upload.
- Never requires MCP/docs tools; they're an optional enhancement.
- Never ships an extension that doesn't build — the `verify` step is mandatory.

## How it was validated

Both starters were smoke-tested end-to-end before shipping: the extension `npm install` → build →
unit tests (4/4) pass with the pinned versions (@crxjs resolved to 2.4.0); the demo typechecks and
renders a real 440×280 still + a 30-frame MP4. Two fixes landed from that (a `tsconfig.node.json`
project-reference gap; Remotion composition props made optional-with-defaults).

### Eval results (iteration 1)

With-skill vs. a bare-LLM baseline across two scenarios (a new "highlight saver" extension and
wrapping an existing extension), graded on 6 criteria by reading the actual produced files:

| Eval | Skill wins | Baseline wins | Ties |
|------|-----------|--------------|------|
| highlight-saver | 4/6 | 0 | 2 |
| wrap-existing | 4/7 | 0 | 3 |
| **Total** | **8/13 (62%)** | **0** | **5** |

**Where the skill adds value:** the hard, differentiated criteria — a real reproducible
Remotion + Docker demo pipeline that reuses live components (baselines fell back to one-off CSS/SVG
mockups that drift), the full store-asset set at exact dimensions with a palette-optimized GIF, and
a genuinely bootable MV3 scaffold with a pure/container split.

**Where the baseline holds up:** a capable LLM already writes solid CWS paperwork, sets up
version-gated releases, and (usually) keeps permissions reasonable — these tied. Iteration 2
strengthened the two that matter most to the skill's purpose: it added the **permission audit**
(the baseline once declared an unused `scripting` permission — exactly what the audit catches) and
**enriched the CWS paperwork** (store-listing copy, data-type table).

## Anatomy

```
extension-forge/
├── SKILL.md                       route → identify → scaffold → audit_permissions →
│                                  cws_setup → demo → repo_setup → verify → done
└── references/
    ├── starter-extension/         bootable MV3 extension (44 files)
    ├── starter-demo/              Remotion-in-Docker asset factory (28 files)
    ├── workflows/                 test.yml · release.yml · deploy.yml
    ├── cws/                       PRIVACY.md · cws-justifications.md · package-extension.sh
    ├── marketing/                 optional GitHub Pages landing page
    ├── permissions-reference.md   per-permission justifications + privacy lines + audit grep-map
    ├── asset-spec.md · fragile-patterns.md · readme-template.md · state-schema.md
```
