import path from "path";
import { Config } from "@remotion/cli/config";

// JPEG frames render faster and are plenty for an H.264 demo.
Config.setVideoImageFormat("jpeg");
// Always clobber the previous render so re-runs are idempotent.
Config.setOverwriteOutput(true);
// One concurrent frame: deterministic, low-memory, plays nice inside a
// container with a single Chromium. Bump on a beefy host if you like.
Config.setConcurrency(1);

// Make the extension's own source importable from demo compositions as
// `@ext/...` (e.g. `import { Popup } from "@ext/popup/Popup"`). This lets
// the demo reuse the LIVE React components with mock props instead of
// re-implementing the UI. `..` here is the repo root (demo/ lives at the
// repo root), so `@ext` -> ../src.
//
// FORGE: if the extension keeps its source somewhere other than ../src
// (e.g. ../app, ../source), change EXT_SRC below.
const EXT_SRC = path.join(process.cwd(), "..", "src");

Config.overrideWebpackConfig((current) => {
  return {
    ...current,
    resolve: {
      ...current.resolve,
      alias: {
        ...(current.resolve?.alias ?? {}),
        "@ext": EXT_SRC,
      },
    },
    module: {
      ...current.module,
      rules: [
        ...(current.module?.rules ?? []),
        // FORGE: some extensions import assets with a resourceQuery, e.g.
        // `import iconUrl from "./icon.svg?url"`. Remotion's webpack already
        // handles plain asset imports; this rule is here as a template if a
        // reused component needs `?raw` / `?url` query handling. Delete if
        // your components don't use resource queries.
        {
          resourceQuery: /raw/,
          type: "asset/source",
        },
      ],
    },
  };
});
