"use client";

import Image from "next/image";
import { useRef } from "react";

export default function HeroParallax() {
  const ref = useRef<HTMLDivElement>(null);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const { left, top, width, height } = el.getBoundingClientRect();
    const x = ((e.clientX - left) / width - 0.5) * -20;
    const y = ((e.clientY - top) / height - 0.5) * -20;
    el.style.transform = `translate(${x}px, ${y}px) scale(1.06)`;
  }

  function handleMouseLeave() {
    const el = ref.current;
    if (!el) return;
    el.style.transform = "translate(0px, 0px) scale(1.06)";
  }

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ position: "absolute", inset: 0, overflow: "hidden", background: "var(--card)" }}
    >
      <div
        ref={ref}
        style={{
          position: "absolute",
          inset: "-3%",
          transition: "transform 0.1s ease-out",
          transform: "scale(1.06)",
          willChange: "transform",
        }}
      >
        <Image
          src="/crystalpalace-hero.webp"
          alt=""
          fill
          sizes="100vw"
          style={{ objectFit: "cover", objectPosition: "center" }}
          priority
        />
      </div>
    </div>
  );
}
