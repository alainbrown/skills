import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Backdrop } from "../components/Backdrop";
import { BrandLockup } from "../components/BrandLockup";
import { COPY } from "../mockData";

interface SceneProps {
  brand: string;
}

// FORGE: opening beat — brand + tagline. Replace copy via mockData.COPY.
export const SceneIntro = ({ brand }: SceneProps) => {
  const frame = useCurrentFrame();
  const rise = interpolate(frame, [0, 18], [16, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fade = interpolate(frame, [0, 14], [0, 1], { extrapolateRight: "clamp" });

  return (
    <Backdrop brand={brand}>
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          opacity: fade,
          transform: `translateY(${rise}px)`,
        }}
      >
        <BrandLockup brand={brand} size={84} subtitle={COPY.eyebrow} style={{ alignItems: "center" }} />
        <div
          style={{
            marginTop: 36,
            fontSize: 26,
            fontWeight: 300,
            opacity: 0.8,
            maxWidth: 720,
            textAlign: "center",
          }}
        >
          {COPY.tagline}
        </div>
      </AbsoluteFill>
    </Backdrop>
  );
};
