import { interpolate } from "remotion";

interface CursorProps {
  x: number;
  y: number;
  /** Frame to "press" (scale dip + ripple). null = no click. */
  clickAt?: number | null;
  frame?: number;
  size?: number;
  brand?: string;
}

/**
 * Synthetic mouse cursor with an optional click animation (scale dip +
 * expanding ripple). Drive x/y from interpolated paths to mime a user
 * pointing at and clicking UI in the demo.
 */
export const Cursor = ({
  x,
  y,
  clickAt = null,
  frame = 0,
  size = 30,
  brand = "#5258d8",
}: CursorProps) => {
  let scale = 1;
  let rippleScale = 0;
  let rippleOpacity = 0;
  if (clickAt != null) {
    const delta = frame - clickAt;
    if (delta >= 0 && delta < 12) {
      scale = interpolate(delta, [0, 3, 8, 12], [1, 0.78, 1.05, 1], {
        extrapolateRight: "clamp",
      });
    }
    if (delta >= 0 && delta < 24) {
      rippleScale = interpolate(delta, [0, 24], [0.3, 2.2], { extrapolateRight: "clamp" });
      rippleOpacity = interpolate(delta, [0, 6, 24], [0.6, 0.4, 0], { extrapolateRight: "clamp" });
    }
  }

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        pointerEvents: "none",
        transform: "translate(-2px, -2px)",
      }}
    >
      {rippleOpacity > 0 && (
        <div
          style={{
            position: "absolute",
            left: 4,
            top: 4,
            width: 18,
            height: 18,
            marginLeft: -9,
            marginTop: -9,
            border: `2px solid ${brand}`,
            borderRadius: "50%",
            opacity: rippleOpacity,
            transform: `scale(${rippleScale})`,
          }}
        />
      )}
      <svg
        width={size}
        height={size * 1.2}
        viewBox="0 0 22 26"
        style={{
          display: "block",
          transform: `scale(${scale})`,
          transformOrigin: "2px 2px",
          filter: "drop-shadow(0 3px 6px rgba(0,0,0,0.45))",
        }}
      >
        <path
          d="M 1.5 1.5 L 1.5 20 L 6.5 16 L 10.5 24.5 L 13.5 23 L 9.5 14.8 L 16 14.8 Z"
          fill="#14141a"
          stroke="#ffffff"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};
