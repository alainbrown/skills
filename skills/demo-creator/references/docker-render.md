# Docker Render Reference

When to offer Docker, what the templates do, and how to wire them into the generated project.

## When to offer Docker

Offer the Docker path when **any** of these are true:

1. **Machine check found missing dependencies** — most commonly missing Chromium runtime
   libs on Linux. Less commonly, no host node.
2. **User explicitly prefers isolation** — even with all tools present, some users prefer
   not to install Chromium deps or run npm installs on their host.
3. **User on a CI-like environment** — no GUI, no homebrew, but Docker is available.

Do NOT push Docker when:
- All host tools are present AND the user hasn't asked for it. Docker adds image-pull and
  build overhead (~2 min cold) that's wasted if the host works.
- The user has no Docker installed and explicitly wants a host-only flow — fall back to
  guiding them through installing missing deps.

## Machine check commands

Run these in the `prerequisites` step and record results in `.demo-state.json.machineCheck`:

```bash
# Always check
node --version 2>/dev/null && echo OK || echo MISSING
docker --version 2>/dev/null && echo OK || echo MISSING
docker compose version 2>/dev/null && echo OK || echo MISSING

# Linux only — Chromium runtime libs
uname -s | grep -q Linux && {
  ldconfig -p 2>/dev/null | grep -q libnss3 && echo OK || echo MISSING
}

# Informational only — Remotion bundles ffmpeg, so this is for post-processing only
ffmpeg -version 2>/dev/null | head -1 || echo "system ffmpeg not present (Remotion bundles its own)"
```

Surface the results as a short table to the user:

```
Machine check:
  node           ✓ v22.10.0
  docker         ✓ 27.3.1
  docker compose ✓ v2.29.7
  chromium deps  ✗ missing (Linux)
  ffmpeg         — not present (Remotion bundles its own, OK for basic render)

Without chromium deps installed, Remotion render will fail on this host.
Docker container avoids this — recommended.
```

## Hard-block rule

If the user picked an output format that requires rendering AND:
- node is missing AND no Docker, OR
- on Linux: Chromium deps missing AND no Docker

…then stop. Do not scaffold a Remotion project the user can't run. Tell them what's
missing and offer:
1. Install the missing deps (give the exact `apt`/`brew` command)
2. Install Docker, then re-run with the container path
3. Abort

This is intentional — generating a project the user cannot render is worse than telling
them up front.

## Docker mode options

When offering Docker, present three choices:

| Mode | When | What runs in Docker |
|------|------|---------------------|
| **render-only** (recommended) | User has node + can run `npm install` on host | `docker compose run render` produces the file; preview still uses host `npx remotion studio` |
| **full** | No host node, or user wants full isolation | Both `docker compose up studio` (preview at :3000) and `docker compose run render` |
| **skip** | All host tools present and verified | No Docker; use `npx remotion studio` / `render` directly |

In `render-only` mode, you still copy the Dockerfile and compose into the project — only
the `studio` service goes unused.

## Copying templates into the generated project

Both templates live in this skill's `references/docker/`. After scaffolding the Remotion
project, copy them to the project root:

```bash
SKILL_REFS="<path-to-this-skill>/references/docker"
PROJECT_DIR="<generated-remotion-project>"

cp "$SKILL_REFS/Dockerfile" "$PROJECT_DIR/Dockerfile"
cp "$SKILL_REFS/docker-compose.yml" "$PROJECT_DIR/docker-compose.yml"
mkdir -p "$PROJECT_DIR/out"
```

The compose file assumes the Dockerfile is at the project root — do not move it.

## Customizing the render command per output format

The compose `render` service has an MP4 default command. For other formats, override at
invocation time rather than editing the compose file:

```bash
# Default — MP4 with audio
docker compose run --rm render

# GIF
docker compose run --rm render \
  npx remotion render Demo out/demo.gif --codec=gif --every-nth-frame=3

# MP4, no audio (silent)
docker compose run --rm render \
  npx remotion render Demo out/demo.mp4 --mute
```

Write these into the project's `README.md` (the one the skill generates inside the
Remotion project, not the skill's own README) so the user has copy-paste commands.

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `studio` shows blank page | `--host=0.0.0.0` flag missing | Already in the template; verify compose was copied unmodified |
| Render hangs on "Bundling" | First-run bundle cache; or missing memory | Allocate ≥4GB to Docker; subsequent runs are faster |
| `npx remotion browser ensure` fails at build | Network blocked | Build with `--network=host` or pre-populate the Chrome cache |
| GIF output is huge (>20MB) | Default frame rate or unbounded duration | Add `--every-nth-frame=3` and keep total under 20s — see `gif-output.md` |
| Permission errors on `./out` | Container writes as root, host user owns dir | Pre-create `out/` with `mkdir -p out && chmod 777 out` (dev) or set `user:` in compose |
