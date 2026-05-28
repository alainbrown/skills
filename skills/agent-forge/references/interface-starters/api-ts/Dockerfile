# syntax=docker/dockerfile:1.7
# Multi-stage build for a Hono + Node.js agent API.
# This image is intentionally minimal — it shows *how* to package the
# starter, not *how* to deploy it. Add your own ops layer (logging,
# tracing, secrets, healthchecks, etc.) for production.

# -------- Builder --------
FROM node:22-alpine AS builder
WORKDIR /app

# `pnpm-lock.yaml*` (with the wildcard) lets the COPY succeed when no
# lockfile has been generated yet. The starter ships without a lockfile;
# you can `pnpm install` once locally to commit one, then re-build for
# reproducible deps.
COPY package.json pnpm-lock.yaml* ./
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm install

COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN pnpm build

# Prune devDependencies before copying node_modules to the runtime stage.
RUN pnpm prune --prod

# -------- Runtime --------
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/server.js"]
