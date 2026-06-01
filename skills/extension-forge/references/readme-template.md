# README Template

Fill the `{{PLACEHOLDERS}}`. Keep the CWS badge id as `{{CWS_EXTENSION_ID}}` until published, then
the `done` step reminds the user to fill it.

````markdown
# {{NAME}}

[![Test](https://github.com/{{OWNER}}/{{REPO}}/actions/workflows/test.yml/badge.svg)](https://github.com/{{OWNER}}/{{REPO}}/actions/workflows/test.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/{{CWS_EXTENSION_ID}}?logo=googlechrome&logoColor=white&label=Chrome%20Web%20Store)](https://chromewebstore.google.com/detail/{{CWS_EXTENSION_ID}})

> {{ONE_LINER}}

![{{NAME}} demo](docs/demo.gif)

## What it does

{{CORE_FEATURE_PARAGRAPH}}

## Quick start

```bash
npm install
npm run build      # type-check + build the extension
```

Then load it unpacked:
1. Open `chrome://extensions`
2. Enable **Developer mode**
3. **Load unpacked** → select the build output directory (`dist/`)

Dev with HMR: `npm run dev`.

## Stack

- **Extension:** Manifest V3, React 19 + TypeScript 6, Vite 8 + `@crxjs/vite-plugin`
- **Tests:** Vitest (unit) + Playwright (e2e, loads the unpacked extension)
- **Demo & store assets:** Remotion rendered in Docker → `docs/`

## Permissions

| Permission | Why |
|---|---|
{{PERMISSIONS_TABLE}}

See [PRIVACY.md](PRIVACY.md) — {{PRIVACY_ONE_LINER}}.

## Demo & marketing assets

All assets are generated from the live UI components (no drift):

```bash
npm run render:docker   # builds demo.mp4, demo.gif, store screenshots, marquee, promo tile, thumbnail → docs/
```

See [demo/](demo/) and [store-assets/cws-justifications.md](store-assets/cws-justifications.md).

## Development

```bash
npm run dev        # HMR dev server
npm run build      # production build
npm test           # unit + e2e
npm run icons      # rasterize design/logo.svg → public/icons/*  (if enabled)
```

## License

MIT © {{YEAR}} {{HOLDER}}
````

## Badge notes

- **Test badge** — points at `test.yml`; green once CI passes on the default branch.
- **Chrome Web Store badge** — `shields.io/chrome-web-store/v/<id>` shows the live published version.
  Inactive (broken image) until the extension is published and `{{CWS_EXTENSION_ID}}` is filled.
- Add tech-stack badges (React, TypeScript, Vite, Manifest V3) if the user wants them — e.g.
  `![Chrome Manifest V3](https://img.shields.io/badge/Chrome-Manifest%20V3-5258d8?logo=googlechrome&logoColor=white)`.
