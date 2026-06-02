// Demo timing, shared by Root.tsx (composition duration) and Demo.tsx (scene
// durations + audio). With a narration manifest, scenes size to their spoken
// line; without one, they use FIXED_FRAMES and render silent.
//
// FORGE: when adding/removing/reordering beats, keep SCENE_ORDER here and the
// COMPONENTS map in Demo.tsx listing the same scene names.

export const FPS = 30;
/** Cross-fade length between scenes (frames). Mirrors Demo.tsx TRANSITION. */
export const TRANSITION = 15;

/** Demo beats, in order. Must match COMPONENTS in Demo.tsx. */
export const SCENE_ORDER = [
  "SceneIntro",
  "ScenePopup",
  "SceneInPage",
  "SceneOutro",
] as const;

export type SceneName = (typeof SCENE_ORDER)[number];

/** Silent-mode durations (frames). Sum - 3*TRANSITION = 600 = 20s @ 30fps. */
export const FIXED_FRAMES: Record<SceneName, number> = {
  SceneIntro: 150,
  ScenePopup: 210,
  SceneInPage: 195,
  SceneOutro: 90,
};

const TAIL_FRAMES = 18; // held after a line ends (~0.6s)
const MIN_FRAMES = 60; // per-scene floor (~2s)

/** Written by scripts/narrate.mjs to public/narration/manifest.json. */
export interface NarrationManifest {
  voice?: string;
  scenes: Partial<Record<SceneName, { seconds: number; file: string }>>;
}

export interface SceneTiming {
  name: SceneName;
  durationInFrames: number;
  /** staticFile path to this scene's voice clip, if narrated. */
  audio?: string;
}

/** Per-scene timings — audio-driven when a manifest is present, else fixed. */
export function sceneTimings(n: NarrationManifest | null | undefined): SceneTiming[] {
  return SCENE_ORDER.map((name) => {
    const entry = n?.scenes?.[name];
    if (entry) {
      return {
        name,
        durationInFrames: Math.max(MIN_FRAMES, Math.ceil(entry.seconds * FPS) + TAIL_FRAMES),
        audio: entry.file,
      };
    }
    return { name, durationInFrames: FIXED_FRAMES[name] };
  });
}

/** Total composition length, accounting for overlapping cross-fades. */
export function totalFrames(timings: SceneTiming[]): number {
  const sum = timings.reduce((acc, t) => acc + t.durationInFrames, 0);
  return sum - (timings.length - 1) * TRANSITION;
}
