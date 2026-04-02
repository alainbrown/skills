# Gemini Image Generation API Notes

> **FRAGILITY WARNING:** Model IDs, parameter names, and response shapes below were accurate as of
> early 2026 but are known to change between Gemini API releases. Before using any model ID or
> response field name in production, verify against:
> https://ai.google.dev/gemini-api/docs/image-generation

---

## Model IDs

These are the image-capable models. All are under the "Nano Banana 2" branding in Gemini.

| Model ID | Use case | Notes |
|----------|----------|-------|
| `gemini-2.0-flash-exp` | Fast text-to-image | Default for auto mode — good quality, low latency |
| `imagen-3.0-generate-002` | High-quality generation | Better for photorealism and detail |
| `imagen-3.0-capability-001` | Image editing | Use when a reference image is provided |

> **TODO: verify** — confirm current model IDs at https://ai.google.dev/gemini-api/docs/models
> The IDs above may have been superseded. A 404 response means the model ID is wrong.

---

## Aspect Ratio Values

Pass as a string in `generationConfig.aspectRatio` (or equivalent field — verify in docs):

| User choice | API value |
|-------------|-----------|
| 1:1 Square | `"1:1"` |
| 16:9 Landscape | `"16:9"` |
| 9:16 Portrait | `"9:16"` |
| 3:2 Photo | `"3:2"` |

---

## Request Shape: Text-to-Image

```js
// TODO: verify — field names and nesting may differ across SDK versions
const response = await ai.models.generateContent({
  model: "gemini-2.0-flash-exp",  // TODO: verify model ID
  contents: [{ role: "user", parts: [{ text: prompt }] }],
  generationConfig: {
    responseModalities: ["IMAGE", "TEXT"],  // TODO: verify field name
  },
});
```

---

## Request Shape: Image Editing (with reference)

```js
// TODO: verify — the image editing path may use a different model and request structure
const response = await ai.models.generateContent({
  model: "imagen-3.0-capability-001",  // TODO: verify model ID
  contents: [
    {
      role: "user",
      parts: [
        { text: prompt },
        {
          inlineData: {
            mimeType: "image/jpeg",  // or image/png depending on source
            data: base64EncodedImageData,
          },
        },
      ],
    },
  ],
  generationConfig: {
    responseModalities: ["IMAGE"],  // TODO: verify field name
  },
});
```

---

## Response Shape

```js
// TODO: verify — response structure may differ by model and SDK version
for (const candidate of response.candidates) {
  for (const part of candidate.content.parts) {
    if (part.inlineData) {
      // part.inlineData.data is base64-encoded PNG
      // part.inlineData.mimeType is typically "image/png"
      const buffer = Buffer.from(part.inlineData.data, "base64");
      fs.writeFileSync(outputPath, buffer);
    }
  }
}
```

---

## Known Fragile Patterns

- **`responseModalities`** — this field name has changed across preview releases. If you get an
  unknown field error, try `response_modalities` or check the SDK changelog.
- **Model IDs with `-exp` suffix** — experimental models are removed without notice. Fall back to
  a stable model ID if the experimental one returns 404.
- **`generationConfig` vs top-level params** — some SDK versions accept aspect ratio at the top
  level, others inside `generationConfig`. Check current SDK docs.
- **Image editing model** — image editing (with reference) may require a completely separate API
  path (e.g. `editImage`) rather than `generateContent`. Verify in current docs.

---

## Auth

The SDK reads `GEMINI_API_KEY` from the environment by default:

```js
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
```

No additional auth setup needed if the env var is set.

---

## SynthID Watermark

All generated images include an invisible SynthID watermark. This is automatic and cannot be
disabled. Inform the user if they ask about image provenance.
