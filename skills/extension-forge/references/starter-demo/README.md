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
npm run render:docker  # builds the image, renders into ../docs (silent)
```

### Narrated render (optional voice-over)

```bash
npm run render:voice   # +AI voice-over, then demo.mp4 carries the narration
```

This starts an off-the-shelf [Kokoro-FastAPI](https://github.com/remsky/Kokoro-FastAPI)
TTS container (the `voice` profile in `docker-compose.yml`), synthesizes one
clip per scene from `narration.json`, sizes each scene to its line, mixes the
voice into `demo.mp4`, and tears the container down. The Kokoro weights (~310MB)
are baked into the image, so the container is ready within seconds — no first-run
download. We author no inference code — the server is a standalone image we call
over its OpenAI-compatible API.

- **Edit the script:** `narration.json` (one line per scene; pick a `voice`
  from Kokoro's list).
- **No Docker / no voice wanted?** `render:docker` and `render:assets` render
  silent exactly as before — voice-over is purely additive.
- The **GIF stays silent** (GIFs can't carry audio); only `demo.mp4` is narrated.

## Outputs (written to ../docs)

| File | Composition | Size |
| --- | --- | --- |
| `docs/demo.mp4` | `Demo` | 1280×800, 20s @ 30fps (longer if narrated) |
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
- `narration.json` — the voice-over script (one line per scene).
- `narration.ts` — scene order + the audio-driven vs fixed timing math.
- `docker-compose.yml` — the optional `voice` profile (Kokoro TTS + renderer).
- `scripts/render-all.sh` — the full render pipeline.
- `scripts/narrate.mjs` — calls the TTS server, writes `public/narration/`.
- `scripts/ensure-browser.mjs` — pre-downloads Remotion's Chromium (Docker).

## Notes

- Remotion + all `@remotion/*` packages are pinned to **4.0.470**.
- The Dockerfile base is `mcr.microsoft.com/playwright:v1.49.1-jammy` — verify
  the tag is still published and bump if needed (`// FORGE:` note in Dockerfile).
