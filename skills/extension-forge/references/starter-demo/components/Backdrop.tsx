import type { ReactNode } from "react";
import { AbsoluteFill } from "remotion";
import { FONT, shade } from "../theme";

interface BackdropProps {
  children: ReactNode;
  brand: string;
  variant?: "dark" | "light";
}

/**
 * Branded full-frame background with a subtle dot grid and a brand-tinted
 * radial glow. The single visual surface every scene/asset sits on so the
 * whole asset family reads as one identity.
 */
export const Backdrop = ({ children, brand, variant = "dark" }: BackdropProps) => {
  if (variant === "light") {
    return (
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 70% 50% at 100% 0%, ${brand}14, transparent 60%), linear-gradient(180deg, #f7f8fb 0%, #eceef4 100%)`,
          color: "#14141a",
          fontFamily: FONT.sans,
        }}
      >
        <DotGrid color="#14141a" opacity={0.06} />
        {children}
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse 60% 50% at 50% 0%, ${brand}26, transparent 60%), linear-gradient(180deg, ${shade(brand, -120)} 0%, #0e0f14 100%)`,
        color: "#f6f6f3",
        fontFamily: FONT.sans,
      }}
    >
      <DotGrid color="#ffffff" opacity={0.05} />
      {children}
    </AbsoluteFill>
  );
};

const DotGrid = ({ color, opacity }: { color: string; opacity: number }) => (
  <AbsoluteFill
    style={{
      backgroundImage: `radial-gradient(${color} 0.6px, transparent 0.6px)`,
      backgroundSize: "24px 24px",
      opacity,
      pointerEvents: "none",
    }}
  />
);
