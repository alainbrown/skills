# demo/ — Remotion asset factory

Self-contained Remotion project that renders this extension's **demo video +
GIF** and its **Chrome Web Store / YouTube assets** from React. It reuses the
extension's own UI components (via an `@ext` alias) fed mock props, so the
marketing assets stay pixel-true to the real product.

It renders **standalone out of the box** using demo-local placeholder
components, so you can see the full pipeline working before wiring anything up.

## Quick start

```bash
cd demo
npm install
npm run studio        # interactive preview at localhost:3000
npm run render:assets # render everything into ../docs (needs ffmpeg + Chromium)
```

Reproducible render (no local ffmpeg/Chromium needed — just Docker):

```bash
npm run render:docker  # builds the image, renders into ../docs
```

## Outputs (written to ../docs)

| File | Composition | Size |
| --- | --- | --- |
| `docs/demo.mp4` | `Demo` | 1280×800, 20s @ 30fps |
| `docs/demo.gif` | (ffmpeg from mp4) | ~720px wide |
| `docs/store/screenshot-1..5.png` | `Screenshot1..5` | 1280×800 |
| `docs/store/marquee.png` | `Marquee` | 1400×560 |
| `docs/store/promo-tile.png` | `PromoTile` | 440×280 |
| `docs/youtube-thumbnail.png` | `Thumbnail` | 1280×720 |

## Customizing — search for `// FORGE:`

Every place the demo should be tailored is marked `// FORGE:`. The big ones:

1. **Brand color** — `theme.ts` `DEFAULT_BRAND` (and `Root.tsx` `BRAND`).
   Threads through every asset.
2. **Copy** — `mockData.ts` `COPY` (name, tagline, blurb) and the per-scene /
   per-screenshot strings.
3. **Demo beats** — `Demo.tsx` chains scenes from `scenes/`. Add/remove/reorder
   `Sequence` blocks; keep total = 600 frames (see the frame-budget note).
4. **Reuse the real UI** — replace `ext/PlaceholderPopup` with the extension's
   actual component:
   ```ts
   // import "../chrome-shim";          // only if a transitive import touches chrome.*
   import { Popup } from "@ext/popup/Popup";
   ```
   `@ext` resolves to `../src` (configured in `remotion.config.ts` +
   `tsconfig.json`). Feed it props from `mockData.ts` shaped to match the real
   component's prop types.

## Pieces

- `components/` — reusable demo furniture: `Backdrop`, `BrandLockup`,
  `PopupFrame`, `BrowserFrame`, `Caption` (lower-third), `Cursor`.
- `scenes/` — demo beats (`SceneIntro`, `ScenePopup`, `SceneInPage`,
  `SceneOutro`).
- `store/` — still compositions for the store/YouTube assets.
- `ext/PlaceholderPopup.tsx` — stand-in for the real popup; delete once wired.
- `chrome-shim.ts` — inert `chrome.*` no-ops, in case a reused component
  transitively imports `chrome`.
- `scripts/render-all.sh` — the full render pipeline.
- `scripts/ensure-browser.mjs` — pre-downloads Remotion's Chromium (Docker).

## Notes

- Remotion + all `@remotion/*` packages are pinned to **4.0.470**.
- The Dockerfile base is `mcr.microsoft.com/playwright:v1.49.1-jammy` — verify
  the tag is still published and bump if needed (`// FORGE:` note in Dockerfile).
