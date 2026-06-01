import type { CSSProperties } from "react";
import { interpolate } from "remotion";
import { FONT } from "../theme";

interface CaptionProps {
  frame: number;
  enterAt: number;
  exitAt: number;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: "left" | "center" | "right";
  /** Render on a dark pill so it stays legible over busy UI. */
  pill?: boolean;
  brand?: string;
  style?: CSSProperties;
}

/**
 * Animated lower-third / caption. Fades + slides in at `enterAt`, out at
 * `exitAt`. Use one per demo "beat" to narrate what's happening on screen.
 */
export const Caption = ({
  frame,
  enterAt,
  exitAt,
  eyebrow,
  title,
  subtitle,
  align = "center",
  pill = false,
  brand = "#5258d8",
  style,
}: CaptionProps) => {
  const opacity = interpolate(
    frame,
    [enterAt, enterAt + 10, exitAt - 10, exitAt],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const ty = interpolate(frame, [enterAt, enterAt + 15], [12, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const inner = (
    <>
      {eyebrow && (
        <div
          style={{
            fontFamily: FONT.mono,
            fontSize: 12,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: brand,
            marginBottom: 12,
          }}
        >
          {eyebrow}
        </div>
      )}
      <div
        style={{
          fontFamily: FONT.sans,
          fontSize: 36,
          fontWeight: 700,
          letterSpacing: "-0.03em",
          lineHeight: 1.08,
          color: "inherit",
        }}
      >
        {title}
      </div>
      {subtitle && (
        <div
          style={{
            fontFamily: FONT.sans,
            fontSize: 17,
            opacity: 0.7,
            marginTop: 12,
            lineHeight: 1.45,
            maxWidth: 520,
            ...(align === "center" ? { marginLeft: "auto", marginRight: "auto" } : {}),
          }}
        >
          {subtitle}
        </div>
      )}
    </>
  );

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${ty}px)`,
        textAlign: align,
        ...(pill
          ? {
              padding: "20px 32px",
              background: "rgba(18,18,24,0.92)",
              borderRadius: 12,
              color: "#f6f6f3",
              boxShadow: "0 10px 30px -10px rgba(0,0,0,0.5)",
            }
          : {}),
        ...style,
      }}
    >
      {inner}
    </div>
  );
};
