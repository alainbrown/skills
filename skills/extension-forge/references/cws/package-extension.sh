#!/usr/bin/env sh
# Build a Chrome Web Store upload artifact.
# Runs the production build, then zips the build output dir into ./{{NAME}}.zip
# at the repo root, with manifest.json at the zip's root.
set -euo pipefail

# Resolve repo root relative to this script (scripts/package-extension.sh).
cd "$(dirname "$0")/.."

# FORGE: `dist` is the Vite build output dir. Change `build_dir` if your build
# emits somewhere else.
build_dir="dist"
out="$(pwd)/{{NAME}}.zip"

npm run build

rm -f "$out"

# -X drops extra attributes / macOS junk (.DS_Store, AppleDouble) that some
# CWS reviewers flag.
(cd "$build_dir" && zip -r -X "$out" . -x '.*' -x '*/.*' -x '*.DS_Store') >/dev/null

echo "wrote $out"
ls -lh "$out"
echo
echo "contents:"
unzip -l "$out"
