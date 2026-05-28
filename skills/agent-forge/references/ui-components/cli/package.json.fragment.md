# Dependencies for `ui-components/cli/`

When the skill vendors any of these CLI components into a generated project,
merge the following into the project's `package.json`. The host project (e.g.,
the `cli-ts` interface starter) already provides `react`, `typescript`, and
`vitest` — only add what's missing.

## Production deps

```json
{
  "dependencies": {
    "ink": "^7.0.4",
    "react": "^19.0.0",
    "diff": "^9.0.0"
  }
}
```

| Package | Used by                | Why |
| ------- | ---------------------- | --- |
| `ink`   | All components         | React renderer for terminal (`<Box>`, `<Text>`, `useInput`). |
| `react` | All components         | Peer of `ink`. |
| `diff`  | `DiffView.tsx`         | `structuredPatch` for unified diff hunks. ~30KB unpacked. |

If the project also vendors **`ApprovalPanel`** with a tool-name-typed input
field (it doesn't by default — `useInput` handles the y/n/d hotkeys), add:

```json
{
  "dependencies": {
    "ink-text-input": "^6.0.0"
  }
}
```

For the cli-ts interface starter itself (which uses Ink for its REPL input
bar and a spinner during streaming), also add:

```json
{
  "dependencies": {
    "ink-text-input": "^6.0.0",
    "ink-spinner": "^5.0.0"
  }
}
```

## Dev deps

```json
{
  "devDependencies": {
    "@types/react": "^19.0.0",
    "ink-testing-library": "^4.0.0"
  }
}
```

| Package                | Why |
| ---------------------- | --- |
| `@types/react`         | React types (peer of `ink`). |
| `ink-testing-library`  | `render()` returns a frame buffer for snapshot/contains assertions. Required for the component tests. |

## tsconfig.json additions

The components are `.tsx` files. Ensure:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "react"
  },
  "include": ["src/**/*.ts", "src/**/*.tsx", "tests/**/*.ts", "tests/**/*.tsx"]
}
```

## Notes on versions

- Ink **7.x** is the current major (as of the time these components were
  authored). Major versions of Ink have historically been ESM-only and the
  hooks/components surface evolves; if you pin an older Ink, expect to adjust
  `useInput`'s key/`isActive` option shape and `<Box>`'s `borderStyle` values.
- `diff@9` is ESM-first. If your project is CJS, downgrade to `diff@5` —
  `structuredPatch` exists in both, the export shape is the same.
- `react@19` is what Ink 7 peers against. Use `react@18` only if you also
  pin `ink@5`.
