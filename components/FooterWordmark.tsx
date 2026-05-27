"use client";

import { useEffect, useRef } from "react";

export default function FooterWordmark() {
  const textRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = textRef.current;
    if (!el) return;

    function update() {
      const spacer = document.getElementById("footer-spacer");
      if (!spacer || !el) return;
      const rect = spacer.getBoundingClientRect();
      const vh = window.innerHeight;
      // progress: 0 when spacer just enters viewport from below, 1 when fully visible
      const progress = Math.min(1, Math.max(0, (vh - rect.top) / spacer.offsetHeight));
      // Text rises from 80px below up to resting position
      el.style.transform = `translateY(${Math.round(80 * (1 - progress))}px)`;
    }

    window.addEventListener("scroll", update, { passive: true });
    update(); // set initial state
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    // overflow:hidden clips the text while it rises, giving the "emerge from below" feel
    <div style={{ overflow: "hidden", paddingLeft: "clamp(10px, 1.5vw, 24px)" }}>
      <p
        ref={textRef}
        style={{
          fontFamily: "var(--font-heading)",
          fontSize: "clamp(100px, 30vw, 460px)",
          fontWeight: 300,
          textTransform: "uppercase",
          letterSpacing: "-0.03em",
          color: "var(--muted)",
          lineHeight: 0.82,
          margin: 0,
          userSelect: "none",
          whiteSpace: "nowrap",
          willChange: "transform",
          transform: "translateY(80px)", // start hidden below
        }}
      >
        Scout
      </p>
    </div>
  );
}
