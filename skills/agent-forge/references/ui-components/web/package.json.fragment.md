# UI components — deps to add to your project

The `web/` components target React 19 + Tailwind v4. The web-ts and electron-ts
starters already ship those + the testing toolchain. The only dep these
components add on top of what the starters provide is `react-diff-viewer-continued`
(used by `DiffView.tsx`).

## Runtime deps

```bash
pnpm add react-diff-viewer-continued
```

| Dep                          | Version  | Used by         |
| ---------------------------- | -------- | --------------- |
| `react-diff-viewer-continued` | ^4.0.0   | DiffView (and ApprovalPanel when you wire DiffView as the preview) |

## React 19 peer-dep gotcha

`react-diff-viewer-continued` historically declares its React peer range as
`^16 || ^17 || ^18`. Under React 19 you will likely see a peer-warning during
install, or an outright error with strict peers. Mitigations, in order of
preference:

**Option A — pnpm overrides** (cleanest, scoped per-project):

```jsonc
// package.json
{
  "pnpm": {
    "overrides": {
      "react-diff-viewer-continued>react": "$react",
      "react-diff-viewer-continued>react-dom": "$react-dom"
    }
  }
}
```

`$react` reuses the project's existing `react` version (React 19 from both
starters).

**Option B — relax strict peers at install** (faster, less precise):

```bash
pnpm install --no-strict-peer-dependencies
```

**Option C — upgrade if the maintainer ships a React 19-compatible release**.
Check `npm view react-diff-viewer-continued peerDependencies` before going with
A/B; if the package already lists React 19 in its peers, none of this applies.

If the diff viewer doesn't render or crashes at runtime under React 19, fall
back to a different lib (e.g. `diff2html` + a CSS theme) or hand-roll a unified
diff with `diff` + a small renderer.

## Dev deps

None beyond what the starters already include. The components consume:

- `react`, `react-dom` — from starter
- `vitest`, `@testing-library/react`, `@testing-library/jest-dom`,
  `@vitejs/plugin-react`, `jsdom` — from starter

## Tailwind v4 tokens used

Components reference these utility classes that map to v4 `@theme` tokens. If
your host project's `globals.css` doesn't define them, the rules silently
fall back to no-op:

```
bg-card  bg-card/40  bg-card/60  bg-card/70  bg-card/95
bg-muted/20  bg-muted/30  bg-muted/40
bg-popover  text-popover-foreground
text-muted-foreground
border-border  border-border/40  border-border/60
```

Both starters' `globals.css` define these via the shadcn-style v4 theme block,
so no extra wiring is needed.

## Tests

```bash
pnpm exec vitest run tests/
```

Each component has 7-9 tests covering: empty state, happy path, prop callbacks,
className passthrough, and one or two component-specific behaviours (counts,
strikethrough, citation parsing, etc.).
