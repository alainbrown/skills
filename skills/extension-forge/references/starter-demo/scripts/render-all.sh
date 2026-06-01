#!/usr/bin/env bash
set -euo pipefail

# Render the demo (MP4 + GIF) and all Chrome Web Store / YouTube assets.
# Designed to run inside the Docker image (ffmpeg + Chromium deps baked in)
# for reproducibility — see Dockerfile and `npm run render:docker` — but it
# also works on a host that has ffmpeg + a Remotion-compatible Chromium.
#
# Outputs land in the repo's ../docs (relative to this demo/ dir):
#   ../docs/demo.mp4              demo video (1280x800, 20s)
#   ../docs/demo.gif              README hero GIF (~720px wide)
#   ../docs/store/screenshot-N.png   5x CWS screenshots (1280x800)
#   ../docs/store/marquee.png        CWS marquee tile (1400x560)
#   ../docs/store/promo-tile.png     CWS small promo tile (440x280)
#   ../docs/youtube-thumbnail.png    YouTube thumbnail (1280x720)

# This script lives at demo/scripts/render-all.sh. The demo dir is one level
# up; outputs go to the sibling ../docs of the demo dir (i.e. <repo>/docs).
DEMO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DEMO_DIR"

DOCS="../docs"
ENTRY="index.ts"

mkdir -p "$DOCS/store"

echo "→ Rendering Demo composition to MP4 (1280x800, ~20s)…"
npx remotion render "$ENTRY" Demo "$DOCS/demo.mp4" \
  --concurrency=1 \
  --log=warn
echo "  → $DOCS/demo.mp4"

echo "→ Encoding GIF from MP4 (two-pass palette, 15fps, ~720px wide)…"
# Pass 1: distill an optimal palette for this video's content.
ffmpeg -y -i "$DOCS/demo.mp4" \
  -vf "fps=15,scale=720:-1:flags=lanczos,palettegen=stats_mode=diff" \
  "$DOCS/.palette.png" \
  -loglevel error
# Pass 2: map frames onto it (Bayer dither keeps the file small).
ffmpeg -y -i "$DOCS/demo.mp4" -i "$DOCS/.palette.png" \
  -filter_complex "fps=15,scale=720:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle" \
  -loop 0 \
  "$DOCS/demo.gif" \
  -loglevel error
rm -f "$DOCS/.palette.png"
echo "  → $DOCS/demo.gif"

echo "→ Rendering Chrome Web Store screenshots (1280x800)…"
for i in 1 2 3 4 5; do
  npx remotion still "$ENTRY" "Screenshot$i" "$DOCS/store/screenshot-$i.png" --log=warn
  echo "  → $DOCS/store/screenshot-$i.png"
done

echo "→ Rendering marquee tile (1400x560)…"
npx remotion still "$ENTRY" Marquee "$DOCS/store/marquee.png" --log=warn
echo "  → $DOCS/store/marquee.png"

echo "→ Rendering small promo tile (440x280)…"
npx remotion still "$ENTRY" PromoTile "$DOCS/store/promo-tile.png" --log=warn
echo "  → $DOCS/store/promo-tile.png"

echo "→ Rendering YouTube thumbnail (1280x720)…"
npx remotion still "$ENTRY" Thumbnail "$DOCS/youtube-thumbnail.png" --log=warn
echo "  → $DOCS/youtube-thumbnail.png"

echo ""
echo "✓ All assets rendered into $DOCS:"
ls -lh "$DOCS/demo.mp4" "$DOCS/demo.gif" "$DOCS/youtube-thumbnail.png" "$DOCS/store/" 2>/dev/null | sed 's/^/  /'
