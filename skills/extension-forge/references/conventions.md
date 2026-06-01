# Canonical Conventions (the `conform` target)

The standard an extension repo is normalized to in `scope: conform`. **keeptidy is the reference
implementation** — when in doubt, match it. The point is that every extension puts the same things
in the same place and tests/releases/packages the same way.

`conform` only ever **moves files, updates references, and swaps workflows/packaging** to match this
spec. It NEVER rewrites feature code or changes architecture.

## Layout

| Thing | Canonical location |
|---|---|
| Build output | `dist/` |
| Demo video | `docs/demo.mp4` |
| README GIF | `docs/demo.gif` (palette-optimized) |
| YouTube thumbnail | `docs/youtube-thumbnail.png` |
| CWS screenshots | `docs/store/screenshot-{1..5}.png` |
| CWS marquee | `docs/store/marquee.png` |
| CWS small promo tile | `docs/store/promo-tile.png` |
| Demo project (Remotion) | `demo/` (Dockerfile, `scripts/render-all.sh`, compositions) |
| Privacy policy | `PRIVACY.md` (repo root) |
| CWS justifications | `store-assets/cws-justifications.md` |
| Icons | `public/icons/{16,32,48,128}.png` (source `design/logo.svg` + `scripts/render-icons.mjs`) |
| Marketing site (optional) | `marketing/{index.html,privacy.html}` |
| Unit tests | `tests/unit/` |
| E2E tests | `tests/e2e/` |

Asset dimensions are fixed by `references/asset-spec.md` — conform does not re-render assets (that's
`demo` scope), only relocates them. If assets are missing entirely, note it and point the user at
the `demo` step.

## Version — single source of truth

`package.json` `version`. The manifest reads it (manifest-as-code) or is kept in lockstep. Release
detection diffs `package.json` version against `HEAD~1`. Repos that use `manifest.json` as the
source (e.g. catm) are migrated to `package.json` as the source, with the manifest reading it.

## Workflows (`.github/workflows/`)

- **`test.yml`** — triggers: `push`, `pull_request`, **and `workflow_call`** (reusable). Steps:
  install → typecheck → unit → install Playwright Chromium → e2e. Runner `ubuntu-latest` (or
  `macos-14` if the extension needs WebGPU — preserve that if the repo already uses it).
- **`release.yml`** — trigger: `push` to main. Jobs: `detect` (version vs `HEAD~1`) → `check-tag`
  (skip if `v$VERSION` exists) → `test` (`uses: ./.github/workflows/test.yml` — the gate) →
  `release` (build, zip `dist/` → `<name>-v$VERSION.zip`, `gh release create v$VERSION
  --generate-notes`). **GitHub Release only**; the zip is for manual CWS upload.
- **`deploy.yml`** (optional) — GH Pages deploy of `marketing/` on `marketing/**` changes.

Replace divergent triggers (e.g. `workflow_run` chaining) with this reusable-`workflow_call` gate.
**Preserve repo-specific steps** that aren't about structure — e.g. catm's `check:marketing`
asset-ref check, a macOS runner for WebGPU — and call them out in the plan rather than dropping them.

## Packaging

`scripts/package-extension.sh` — `npm run build` then zip the canonical build dir (`dist/`) to
`<name>-v<version>.zip`. POSIX `sh`, `set -euo pipefail`.

## Naming

- Release tag: `v<version>`.
- Release zip: `<name>-v<version>.zip`.

## Conformance table (what `conform_assess` produces)

| Aspect | Current (observed) | Canonical | Action |
|---|---|---|---|
| build output dir | `extension/app/` | `dist/` | retarget vite + .gitignore + workflows |
| assets | `docs/cws/`, `docs/youtube/` | `docs/`, `docs/store/` | `git mv` + fix README/marketing refs |
| version source | `manifest.json` | `package.json` | move source, manifest reads it |
| release trigger | `workflow_run` | reusable `workflow_call` gate | replace `release.yml` |
| packaging | inline zip step | `scripts/package-extension.sh` | add script, call from workflow |
| permissions | (audit) | only-used set | prune per permission audit |

Every row gets `move`/`retarget`/`replace`/`add`/`ok`. Rows marked `ok` are already conformant.
