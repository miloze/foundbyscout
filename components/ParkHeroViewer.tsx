"use client";

import { useState, useEffect } from "react";
import ContourModelClient from "./ContourModelClient";
import ParkModelClient from "./ParkModelClient";

type Props = {
  modelFile: string;
  heroImage?: string;
  useContourModel?: boolean;
  cameraPos?: [number, number, number];
  cameraTarget?: [number, number, number];
  modelRotation?: [number, number, number];
  pingPong?: [[number, number, number], [number, number, number]];
  autoRotate?: boolean;
  debug?: boolean;
};

export default function ParkHeroViewer({
  modelFile, heroImage, useContourModel,
  cameraPos, cameraTarget, modelRotation, pingPong, autoRotate, debug,
}: Props) {
  const [isMobile, setIsMobile] = useState(false);

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
        {heroImage ? (
          <img
            src={heroImage}
            alt=""
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div style={{ position: "absolute", inset: 0, background: "#111" }} />
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
        <ContourModelClient modelFile={modelFile} cameraPos={cameraPos} cameraTarget={cameraTarget} modelRotation={modelRotation} />
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
          pingPong={pingPong}
          autoRotate={autoRotate}
          debug={debug}
        />
      </div>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, var(--background) 0%, transparent 55%)", pointerEvents: "none" }} />
    </>
  );
}
