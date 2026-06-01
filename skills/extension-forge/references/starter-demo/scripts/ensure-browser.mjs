// Pre-downloads the Chromium binary Remotion uses for off-screen rendering,
// so the Docker image is ready to render at `docker run` time instead of
// paying that cost on the first render.
import { ensureBrowser } from "@remotion/renderer";

await ensureBrowser();
console.log("✓ Remotion Chromium ready");
