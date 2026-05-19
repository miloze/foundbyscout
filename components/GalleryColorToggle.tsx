"use client";

import { useState } from "react";

type Grade = {
  grayscale:  number; // 0–100
  brightness: number; // 0–200
  contrast:   number; // 0–200
  saturate:   number; // 0–200
};

const DEFAULTS: Grade = { grayscale: 100, brightness: 100, contrast: 100, saturate: 100 };
const COLOR:    Grade = { grayscale: 0,   brightness: 100, contrast: 100, saturate: 100 };

function gradeFilter(g: Grade) {
  return `grayscale(${g.grayscale}%) brightness(${g.brightness}%) contrast(${g.contrast}%) saturate(${g.saturate}%)`;
}

const SLIDER: React.CSSProperties = { width: 100, accentColor: "#ff5841" };
const LABEL:  React.CSSProperties = { width: 76, color: "#aaa" };
const VALUE:  React.CSSProperties = { width: 38, color: "#fff", textAlign: "right" };
const ROW:    React.CSSProperties = { display: "flex", alignItems: "center", gap: 8 };

export default function GalleryColorToggle({ children }: { children: React.ReactNode }) {
  const [grade,      setGrade]      = useState<Grade>(DEFAULTS);
  const [panelOpen,  setPanelOpen]  = useState(false);

  const isColor = grade.grayscale === 0;

  function set(key: keyof Grade, val: number) {
    setGrade(g => ({ ...g, [key]: val }));
  }

  return (
    <div style={{ position: "relative" }}>

      {/* Gallery with grade applied */}
      <div style={{ filter: gradeFilter(grade), transition: "filter 0.6s ease" }}>
        {children}
      </div>

      {/* CLR / B&W quick toggle */}
      <button
        onClick={() => setGrade(isColor ? DEFAULTS : COLOR)}
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
        {isColor ? "B&W" : "CLR"}
      </button>

      {/* Grade panel toggle */}
      <button
        onClick={() => setPanelOpen(o => !o)}
        style={{
          position: "absolute", top: 12, right: 70,
          fontFamily: "var(--font-mono)", fontSize: 11,
          letterSpacing: "0.15em", textTransform: "uppercase",
          color: "#fff", background: "rgba(0,0,0,0.55)",
          border: "1px solid rgba(255,255,255,0.3)",
          padding: "5px 10px", cursor: "pointer",
          backdropFilter: "blur(4px)", zIndex: 10,
        }}
      >
        GRADE
      </button>

      {/* Sliders panel */}
      {panelOpen && (
        <div style={{
          position: "absolute", bottom: 12, left: 12,
          background: "rgba(0,0,0,0.75)", color: "#fff",
          fontFamily: "monospace", fontSize: 10,
          padding: "10px 14px", display: "flex", flexDirection: "column", gap: 6,
          backdropFilter: "blur(4px)", zIndex: 10,
        }}>

          <label style={ROW}>
            <span style={LABEL}>Grayscale</span>
            <input type="range" min={0} max={100} value={grade.grayscale}
              onChange={e => set("grayscale", +e.target.value)} style={SLIDER} />
            <span style={VALUE}>{grade.grayscale}%</span>
          </label>

          <label style={ROW}>
            <span style={LABEL}>Brightness</span>
            <input type="range" min={0} max={200} value={grade.brightness}
              onChange={e => set("brightness", +e.target.value)} style={SLIDER} />
            <span style={VALUE}>{grade.brightness}%</span>
          </label>

          <label style={ROW}>
            <span style={LABEL}>Contrast</span>
            <input type="range" min={0} max={200} value={grade.contrast}
              onChange={e => set("contrast", +e.target.value)} style={SLIDER} />
            <span style={VALUE}>{grade.contrast}%</span>
          </label>

          <label style={ROW}>
            <span style={LABEL}>Saturation</span>
            <input type="range" min={0} max={200} value={grade.saturate}
              onChange={e => set("saturate", +e.target.value)} style={SLIDER} />
            <span style={VALUE}>{grade.saturate}%</span>
          </label>

          <button
            onClick={() => setGrade(DEFAULTS)}
            style={{
              marginTop: 4, fontFamily: "monospace", fontSize: 10,
              letterSpacing: "0.1em", color: "#aaa", background: "none",
              border: "1px solid #444", padding: "3px 8px", cursor: "pointer",
              alignSelf: "flex-start",
            }}
          >
            RESET
          </button>

        </div>
      )}
    </div>
  );
}
