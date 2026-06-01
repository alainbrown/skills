import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Backdrop } from "../components/Backdrop";
import { BrandLockup } from "../components/BrandLockup";
import { COPY } from "../mockData";
import { FONT, shade } from "../theme";

interface SceneProps {
  brand: string;
}

// FORGE: closing beat — brand + call to action ("Add to Chrome").
export const SceneOutro = ({ brand }: SceneProps) => {
  const frame = useCurrentFrame();
  const fade = interpolate(frame, [0, 16], [0, 1], { extrapolateRight: "clamp" });
  const rise = interpolate(frame, [0, 18], [14, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

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
        <BrandLockup brand={brand} size={88} style={{ alignItems: "center" }} />
        <div style={{ marginTop: 24, fontSize: 22, opacity: 0.75, maxWidth: 680, textAlign: "center" }}>
          {COPY.tagline}
        </div>
        <div
          style={{
            marginTop: 40,
            padding: "16px 32px",
            borderRadius: 12,
            fontFamily: FONT.sans,
            fontSize: 19,
            fontWeight: 700,
            color: "white",
            background: `linear-gradient(135deg, ${brand}, ${shade(brand, 40)})`,
            boxShadow: `0 10px 30px ${brand}55`,
          }}
        >
          {/* FORGE: store CTA */}
          Add to Chrome — it's free
        </div>
      </AbsoluteFill>
    </Backdrop>
  );
};
