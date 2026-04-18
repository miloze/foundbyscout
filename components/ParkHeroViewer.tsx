"use client";

import { useState, useEffect } from "react";
import ContourModelClient from "./ContourModelClient";
import ParkModelClient from "./ParkModelClient";

type OrbitLimits = { minPolar: number; maxPolar: number; minAzimuth: number; maxAzimuth: number };

type Props = {
  modelFile: string;
  heroImage?: string;
  useContourModel?: boolean;
  cameraPos?: [number, number, number];
  cameraTarget?: [number, number, number];
  modelRotation?: [number, number, number];
  orbitLimits?: OrbitLimits;
  pingPong?: [[number, number, number], [number, number, number]];
};

export default function ParkHeroViewer({
  modelFile, heroImage, useContourModel,
  cameraPos, cameraTarget, modelRotation, orbitLimits, pingPong,
}: Props) {
  const [isMobile, setIsMobile] = useState(false);
  const [viewMode, setViewMode] = useState<"bw" | "colour">("bw");

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 900);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // ── Mobile: static image ──────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div style={{ position: "absolute", inset: 0 }}>
        {/* B&W / CLR toggle */}
        <div style={{ position: "absolute", top: 12, right: 12, zIndex: 11, display: "flex", gap: 2 }}>
          {(["bw", "colour"] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              style={{
                padding: "5px 12px", border: "none", cursor: "pointer",
                background: viewMode === mode ? "var(--accent)" : "rgba(0,0,0,0.55)",
                color: "#fff", fontFamily: "monospace", fontSize: 10,
                letterSpacing: "0.1em", borderRadius: 2,
              }}
            >
              {mode === "bw" ? "B&W" : "CLR"}
            </button>
          ))}
        </div>

        {heroImage ? (
          <img
            src={heroImage}
            alt=""
            style={{
              width: "100%", height: "100%", objectFit: "cover",
              filter: viewMode === "bw" ? "grayscale(1) contrast(1.05) brightness(0.9)" : "none",
              transition: "filter 0.4s ease",
            }}
          />
        ) : (
          <div style={{ position: "absolute", inset: 0, background: "var(--card)" }} />
        )}

        {/* Bottom gradient for text legibility */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, var(--background) 0%, transparent 55%)", pointerEvents: "none" }} />
      </div>
    );
  }

  // ── Desktop: 3D model ─────────────────────────────────────────────────────
  if (useContourModel) {
    return (
      <div style={{ position: "absolute", inset: 0 }}>
        <ContourModelClient modelFile={modelFile} cameraPos={cameraPos} modelRotation={modelRotation} />
      </div>
    );
  }

  return (
    <>
      <div style={{ position: "absolute", inset: 0 }}>
        <ParkModelClient
          modelFile={modelFile}
          cameraPos={cameraPos}
          cameraTarget={cameraTarget}
          modelRotation={modelRotation}
          orbitLimits={orbitLimits}
          pingPong={pingPong}
        />
      </div>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, var(--background) 0%, transparent 55%)", pointerEvents: "none" }} />
    </>
  );
}
