"use client";

import { useState } from "react";

export default function GalleryColorToggle({ children }: { children: React.ReactNode }) {
  const [bw, setBw] = useState(true);

  return (
    <div style={{ position: "relative" }}>

      {/* Gallery with filter applied */}
      <div style={{ filter: bw ? "grayscale(1)" : "none", transition: "filter 0.6s ease" }}>
        {children}
      </div>

      {/* B&W / CLR toggle */}
      <button
        onClick={() => setBw(b => !b)}
        style={{
          position: "absolute", top: 12, right: 12,
          fontFamily: "var(--font-mono)", fontSize: 11,
          letterSpacing: "0.15em", textTransform: "uppercase",
          color: "#fff", background: "rgba(0,0,0,0.55)",
          border: "1px solid rgba(255,255,255,0.3)",
          padding: "5px 10px", cursor: "pointer",
          backdropFilter: "blur(4px)", zIndex: 10,
        }}
      >
        {bw ? "CLR" : "B&W"}
      </button>

    </div>
  );
}
