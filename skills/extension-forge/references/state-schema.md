# `.forge-state.json` Schema

Written at the **user's project root** (never the skills repo). Created in `route`, updated after
every step, deleted in `done`.

```json
{
  "phase": "identify",
  "mode": "interactive",
  "scope": "new",
  "project": {
    "path": "/Users/x/my-extension",
    "name": "my-extension",
    "packageManager": "npm"
  },
  "extension": {
    "oneLiner": "Read any selected text aloud in a side panel.",
    "coreFeature": "Right-click selected text → side panel reads it with on-device TTS.",
    "surfaces": ["sidePanel", "contextMenu", "options"],
    "permissions": ["contextMenus", "storage", "sidePanel"],
    "hostPermissions": [],
    "manifestPath": "manifest.config.ts"
  },
  "context": {
    "audience": "readers, accessibility users",
    "tone": "calm, utilitarian",
    "brandColor": "#5258d8",
    "logoSvg": "design/logo.svg",
    "demoBeats": [
      "select text on a page",
      "click Read aloud in context menu",
      "side panel opens and streams audio",
      "switch voice in settings"
    ]
  },
  "options": {
    "iconAutoGen": true,
    "macosRunner": true,
    "marketingPage": true,
    "cwsAutoPublish": false
  },
  "cws": { "privacyDone": false, "justificationsDone": false },
  "demo": { "rendered": false, "assets": [] },
  "repo": { "workflowsDone": false, "badges": false, "gitInit": false },
  "conform": {
    "branch": "chore/conform-layout",
    "plan": [
      { "aspect": "build output", "current": "extension/app/", "canonical": "dist/", "action": "retarget" },
      { "aspect": "assets", "current": "docs/cws/", "canonical": "docs/store/", "action": "move" },
      { "aspect": "version source", "current": "manifest.json", "canonical": "package.json", "action": "move" },
      { "aspect": "release trigger", "current": "workflow_run", "canonical": "reusable workflow_call gate", "action": "replace" }
    ],
    "preserve": ["check:marketing asset-ref step"],
    "moves": []
  },
  "decisions": {}
}
```

## Field notes

- `scope`: `"new"` (scaffold extension + launch kit), `"wrap"` (existing extension; add only what's missing), or `"conform"` (existing, already-equipped extension; normalize layout/workflows to `references/conventions.md` — moves files + swaps workflows on a branch, never rewrites code).
- `conform`: only present for `scope: conform`. `branch` (the working branch), `plan` (the conformance table from `conform_assess`), `preserve` (repo-specific steps to keep), `moves` (applied relocations). Survives so a multi-repo conform run can resume.
- `extension.surfaces`: any of `popup`, `sidePanel`, `options`, `contentScript`, `newTab`, `contextMenu`. Each maps to a manifest key + a starter sub-directory.
- `extension.permissions` / `hostPermissions`: every entry must trace to a feature AND have a matching block in `references/permissions-reference.md`. Over-broad → CWS rejection.
- `context.demoBeats`: 3-6 moments → become Remotion scenes in the demo.
- `options.cwsAutoPublish`: `false` in this build — release is GitHub-Release-only.
- `demo.rendered`: `false` when Docker was unavailable and the render was staged for the user to run.

This is a subagent contract: any field a generation subagent needs must live here, because the state
file is the only context those subagents receive.
