# Docker Compose Templates

Stable patterns for local development compose files. Use these as the base and adapt to the
specific stack decisions.

## Principles

- **App service:** dev server with hot reloading via volume mounts. All env vars in the
  `environment` block — no .env files.
- **Infrastructure services:** real instances (Postgres, Redis, etc.) with healthchecks.
- **Named volumes:** for data persistence across restarts.
- **depends_on with condition:** app waits for infrastructure to be healthy.
- **No version key:** Docker Compose v2+ doesn't need it.

## Template: Next.js + Postgres

```yaml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
    volumes:
      - .:/app
      - /app/node_modules
      - /app/.next
    environment:
      DATABASE_URL: postgres://dev:dev@db:5432/${PROJECT_NAME}
      # Add all other env vars here — auth keys, payment keys, etc.
      # For third-party API keys that can't be hardcoded, use ${VAR} syntax
      # and pass via shell: CLERK_SECRET_KEY=sk_test_... docker compose up
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:17
    environment:
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: dev
      POSTGRES_DB: ${PROJECT_NAME}
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U dev -d ${PROJECT_NAME}"]
      interval: 5s
      timeout: 5s
      retries: 10

volumes:
  pgdata:
```

### Dockerfile.dev (Next.js)

```dockerfile
FROM node:20-alpine
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install
COPY . .
EXPOSE 3000
CMD ["pnpm", "dev"]
```

Adapt the package manager commands if using npm or yarn.

## Template: Vite SPA + Express API + Postgres

Two app services — the SPA and the API server.

```yaml
services:
  db:
    image: postgres:17
    environment:
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: dev
      POSTGRES_DB: ${PROJECT_NAME}
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U dev -d ${PROJECT_NAME}"]
      interval: 5s
      timeout: 5s
      retries: 10

  api:
    build:
      context: .
      dockerfile: Dockerfile.api
    environment:
      DATABASE_URL: postgres://dev:dev@db:5432/${PROJECT_NAME}
      CORS_ORIGIN: http://localhost:5173
      PORT: 3001
    ports:
      - "3001:3001"
    volumes:
      - ./server:/app/server
      - /app/node_modules
    depends_on:
      db:
        condition: service_healthy
    command: npx tsx watch server/index.ts

  app:
    build:
      context: .
      dockerfile: Dockerfile.app
    environment:
      VITE_API_URL: http://localhost:3001
    ports:
      - "5173:5173"
    volumes:
      - ./src:/app/src
      - /app/node_modules
    depends_on:
      - api
    command: pnpm dev --host

volumes:
  pgdata:
```

## Adding Redis

Add this service block when the stack includes caching or session storage:

```yaml
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 10
    volumes:
      - redisdata:/data
```

Add `REDIS_URL: redis://redis:6379` to the app service's environment.
Add `redisdata:` to the volumes section.

## Third-Party API Keys

For keys from services like Clerk, Stripe, Resend — these can't be hardcoded in the compose
file. Use `${VAR}` syntax and instruct the user to either:

1. Export them in their shell before running `docker compose up`
2. Pass inline: `CLERK_SECRET_KEY=sk_test_... docker compose up`

Do NOT suggest creating a `.env` file. The compose file's `${VAR}` syntax reads from the
shell environment directly.
