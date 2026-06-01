# Known-Fragile Patterns

Version-sensitive bits the starters pin but that drift fast. If a docs tool (context7) is available,
suggest verifying the current API; otherwise flag uncertain edits with `// TODO: verify` and tell
the user. **Never require MCP** — these notes let the skill work without it.

## @crxjs/vite-plugin (manifest-as-code)

- Package is published as **beta** (`@crxjs/vite-plugin@2.0.0-beta.x`). The API and the exact beta
  tag change; pin the version the starter ships and note it may need a bump.
- `manifest.config.ts` uses `defineManifest`. `version` should come from `package.json` so the
  release workflow's version-bump detection works: `version: pkg.version`.
- Service worker MUST be `"type": "module"` for ESM imports.
- HMR for content scripts and the service worker is the flaky part across versions — if dev reload
  misbehaves, it's usually here.
- Build output dir: confirm whether it's `dist/` (default) — the release zip and the e2e fixture
  both depend on the right path.

## MV3 manifest / CSP

- WASM needs `content_security_policy.extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'"`.
- Cross-origin isolation (for SharedArrayBuffer / some ML libs) needs
  `cross_origin_embedder_policy: require-corp` + `cross_origin_opener_policy: same-origin`.
- No remotely-hosted code — everything must be bundled.

## Remotion

- Pin all `@remotion/*` packages to the **same version** (`remotion`, `@remotion/cli`,
  `@remotion/renderer`, `@remotion/transitions`, etc.). Mismatched versions fail cryptically.
- `Config.setConcurrency(1)` for determinism; raising it can cause non-deterministic frames.
- In Docker, run `ensureBrowser()` (or `npx remotion browser ensure`) at build time.
- Reusing the extension's React components inside Remotion requires a **single React instance** —
  the demo shares the repo's `node_modules` (or aligns React versions). Mismatched React → hooks errors.
- Components mounted in Remotion must be pure: no `chrome.*`, no live network, props-only. Provide
  a `chrome-shim` of inert no-ops if a component transitively imports `chrome`.

## Docker render base

- `mcr.microsoft.com/playwright:vX-jammy` ships Chromium + all shared libs (libnss/libatk/libgbm),
  which is why it's the chosen base — fewer hand-listed `apt` deps than `node:slim`.
- Bind-mount the repo so the demo's `../src` imports resolve; use an anonymous volume for the demo's
  `node_modules` so it wins over the host's.
- Pin the Playwright image tag to match the Chromium the render expects.

## Playwright e2e for extensions

- Load the unpacked build with a **persistent context** + `--load-extension=<buildDir>` +
  `--disable-extensions-except=<buildDir>`. Headless support for extensions is limited — use
  `channel: 'chromium'` and the new headless mode, or headed in CI with xvfb.
- Get the extension id from the service-worker URL via `context.serviceWorkers()`.
- Build BEFORE running e2e (`pretest:e2e` or a `test:e2e` that builds first).

## Vitest unit tests

- `chrome.*` is undefined in jsdom/node — stub it in a setup file (error-throwing stubs surface
  accidental real calls). Keep pure logic in testable modules separate from `chrome.*` wiring.
