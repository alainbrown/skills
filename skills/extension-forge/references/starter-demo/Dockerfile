# Reproducible Remotion render environment for the extension demo GIF/MP4
# and Chrome Web Store assets. Self-contained: everything the renderer
# needs (Chromium shared libs + ffmpeg) is baked in.
#
# Build context is this demo/ directory. From the repo root:
#
#   docker build -t extension-demo-render -f demo/Dockerfile demo
#
# Run (bind-mounts the whole repo so `@ext` → ../src resolves to the live
# extension components; outputs land in the host repo's ./docs):
#
#   docker run --rm \
#     -v "$(pwd)":/work \
#     -v /work/demo/node_modules \
#     -w /work/demo \
#     extension-demo-render bash scripts/render-all.sh
#
# Or just: `npm run render:docker`.

# Playwright base ships Chromium + every libnss/libatk/libgbm shared lib
# Remotion needs on Linux, so we don't have to enumerate them by hand.
# FORGE: verify this tag is still published — `docker pull` it, or check
# https://mcr.microsoft.com/v2/playwright/tags/list . Bump to the current
# pinned Playwright release if v1.49.1-jammy has aged out.
FROM mcr.microsoft.com/playwright:v1.49.1-jammy

# ffmpeg for the MP4 -> palette-GIF pass at the end of the pipeline.
RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Dependency layer (cacheable across source changes).
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund --legacy-peer-deps \
 || npm install --no-audit --no-fund --legacy-peer-deps

# Demo source.
COPY . .

# Pre-download the Chromium Remotion uses, so `docker run` renders
# immediately instead of paying that cost on first render. (Playwright
# bundles its own Chromium; Remotion uses a separate copy.)
RUN node scripts/ensure-browser.mjs

# Default: render every asset. Overridable at `docker run` time.
CMD ["bash", "scripts/render-all.sh"]
