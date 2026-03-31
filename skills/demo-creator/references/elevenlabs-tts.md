# ElevenLabs TTS for Demo Narration

Generate voiceover audio from script narration text using the ElevenLabs API.

## Authentication

The API key must be set as an environment variable:

```bash
export ELEVENLABS_API_KEY=your-key-here
```

Get a key from: https://elevenlabs.io/app/settings/api-keys (free tier: 10,000 chars/month).

Check in code:

```ts
if (!process.env.ELEVENLABS_API_KEY) {
  throw new Error("ELEVENLABS_API_KEY environment variable is required");
}
```

## TTS Generation Script

Create `generate-voiceover.ts` in the Remotion project root:

```ts
import { writeFileSync, mkdirSync, existsSync } from "fs";
import path from "path";

const API_KEY = process.env.ELEVENLABS_API_KEY!;
const VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // Rachel - default, good for demos
const MODEL = "eleven_multilingual_v2";

interface Scene {
  id: number;
  narration: string;
}

async function generateTTS(scene: Scene, outputDir: string): Promise<string> {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: scene.narration,
        model_id: MODEL,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ElevenLabs API error for scene ${scene.id}: ${response.status} - ${error}`);
  }

  const audioBuffer = await response.arrayBuffer();
  const outputPath = path.join(outputDir, `scene-${scene.id}.mp3`);
  writeFileSync(outputPath, Buffer.from(audioBuffer));
  return outputPath;
}

async function main() {
  const scenes: Scene[] = JSON.parse(process.argv[2] || "[]");
  const outputDir = path.join("public", "audio");

  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  for (const scene of scenes) {
    console.log(`Generating audio for scene ${scene.id}: "${scene.narration.slice(0, 50)}..."`);
    const outputPath = await generateTTS(scene, outputDir);
    console.log(`  Saved: ${outputPath}`);
  }

  console.log("Done! Audio files saved to public/audio/");
}

main().catch(console.error);
```

Run with:

```bash
node --strip-types generate-voiceover.ts '[{"id":1,"narration":"Welcome to..."},{"id":2,"narration":"This project..."}]'
```

## Voice Options

Common voices for demos:

| Voice ID | Name | Style |
|----------|------|-------|
| `21m00Tcm4TlvDq8ikWAM` | Rachel | Calm, professional (good default) |
| `EXAVITQu4vr4xnSDxMaL` | Bella | Warm, friendly |
| `ErXwobaYiN019PkySvjV` | Antoni | Male, professional |
| `MF3mGyEYCl7XYWbV9V6O` | Elli | Female, clear |

Users can browse all voices at: https://elevenlabs.io/voice-library

## Voice Settings

| Setting | Range | Description |
|---------|-------|-------------|
| `stability` | 0.0 - 1.0 | Higher = more consistent, lower = more expressive |
| `similarity_boost` | 0.0 - 1.0 | Higher = closer to original voice |
| `style` | 0.0 - 1.0 | Style exaggeration (0 recommended for narration) |
| `use_speaker_boost` | boolean | Enhances voice clarity |

For demo narration, `stability: 0.5` and `similarity_boost: 0.75` work well.

## Audio Duration Measurement

After generating audio, measure duration for Remotion frame calculation:

```ts
import { getAudioDurationInSeconds } from "@remotion/media/get-audio-duration-in-seconds";
import { staticFile } from "remotion";

// In calculateMetadata
const duration = await getAudioDurationInSeconds(staticFile("audio/scene-1.mp3"));
const frames = Math.ceil(duration * fps);
```

## Error Handling

Common errors:

| Status | Cause | Fix |
|--------|-------|-----|
| 401 | Invalid API key | Check ELEVENLABS_API_KEY value |
| 422 | Empty or too-long text | Keep narration under 5000 chars per request |
| 429 | Rate limited | Wait and retry, or reduce concurrent requests |

If TTS fails for a scene, log the error and offer to continue without that scene's audio
rather than failing the entire generation.

## Character Limits

- Free tier: 10,000 characters/month
- A typical 2-minute demo script is ~300 words / ~1,500 characters
- Estimate usage before generating: `scenes.reduce((sum, s) => sum + s.narration.length, 0)`
