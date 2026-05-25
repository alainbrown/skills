# Single image used by both `studio` and `render` services in docker-compose.yml.
# Based on the official Remotion Docker pattern (v4+).
# Source: https://www.remotion.dev/docs/docker

FROM node:22-bookworm-slim

# Chrome / Chromium dependencies required by Remotion's headless renderer.
# Keep this list in sync with https://www.remotion.dev/docs/docker — Remotion
# updates it when Chrome adds runtime requirements.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libnss3 \
    libdbus-1-3 \
    libatk1.0-0 \
    libgbm-dev \
    libasound2 \
    libxrandr2 \
    libxkbcommon-dev \
    libxfixes3 \
    libxcomposite1 \
    libxdamage1 \
    libatk-bridge2.0-0 \
    libpango-1.0-0 \
    libcairo2 \
    libcups2 \
    ffmpeg \
  && rm -rf /var/lib/apt/lists/*

# ffmpeg is included even though Remotion v4+ bundles its own — having the
# system binary lets users run post-render optimizations (e.g., palettegen
# for higher-quality GIFs).

WORKDIR /app

# Install dependencies in a separate layer so source changes don't bust the
# install cache. The dev workflow bind-mounts the project over /app at
# runtime, so the install here primes node_modules inside the image; an
# anonymous volume in docker-compose.yml preserves it past the bind mount.
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* bun.lock* ./
RUN if [ -f pnpm-lock.yaml ]; then npm i -g pnpm && pnpm install --frozen-lockfile; \
    elif [ -f yarn.lock ]; then npm i -g yarn && yarn install --frozen-lockfile; \
    elif [ -f bun.lock ]; then npm i -g bun && bun install --frozen-lockfile; \
    else npm ci || npm install; \
    fi

# Download the headless Chrome that Remotion uses at render time. Doing it at
# build time means the first `render` or `studio` run is fast.
RUN npx remotion browser ensure

# Project source — bind-mounted over this at runtime by compose, but copied
# here so the image is runnable standalone (e.g., `docker run image render`).
COPY . .

# Default command. Compose overrides per service:
#   studio  -> npx remotion studio --no-open --host=0.0.0.0
#   render  -> npx remotion render (or render gif)
CMD ["npx", "remotion", "studio", "--no-open", "--host=0.0.0.0"]
