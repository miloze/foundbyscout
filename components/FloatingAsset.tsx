type Animation = "float" | "drift" | "sway" | "blink";
type Position = "fixed" | "absolute";

type Props = {
  src: string;
  width?: number;
  top?: number | string;
  right?: number | string;
  bottom?: number | string;
  left?: number | string;
  animation?: Animation;
  duration?: number;
  opacity?: number;
  rotate?: number;
  position?: Position;
  zIndex?: number;
  delay?: number;
};

export default function FloatingAsset({
  src,
  width = 80,
  top,
  right,
  bottom,
  left,
  animation = "float",
  duration = 6,
  opacity = 0.6,
  rotate = 0,
  position = "fixed",
  zIndex = 0,
  delay = 0,
}: Props) {
  return (
    <img
      src={src}
      alt=""
      aria-hidden
      className={`fbs-${animation}`}
      style={{
        position,
        top,
        right,
        bottom,
        left,
        width,
        height: "auto",
        opacity,
        pointerEvents: "none",
        userSelect: "none",
        zIndex,
        "--fbs-dur": `${duration}s`,
        "--fbs-rotate": `${rotate}deg`,
        animationDelay: delay ? `${delay}s` : undefined,
      } as React.CSSProperties}
    />
  );
}
