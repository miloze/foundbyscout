"use client";
import { useState } from "react";
import Image from "next/image";
import ParkViewerModal from "./ParkViewerModal";

type Props = {
  heroImage?: string | null;
  parkName: string;
  modelFile: string;
  modelFileMobile?: string;
  cameraPos?: number[];
  cameraTarget?: number[];
  modelRotation?: number[];
  pingPong?: [[number, number, number], [number, number, number]];
  autoRotate?: boolean;
  ambientIntensity?: number;
  directionalIntensity?: number;
  environmentPreset?: string;
  environmentIntensity?: number;
};

export default function ParkHeroMobile({
  heroImage, parkName, modelFile, modelFileMobile, ...viewerProps
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        {heroImage ? (
          <Image
            src={heroImage}
            alt={parkName}
            fill
            style={{ objectFit: "cover" }}
            priority
          />
        ) : (
          <div style={{ position: "absolute", inset: 0, background: "var(--card)" }} />
        )}

        <button
          onClick={() => setOpen(true)}
          style={{
            position: "absolute",
            bottom: 80,
            right: 16,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 14px",
            background: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,0.18)",
            color: "#fff",
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            cursor: "pointer",
            zIndex: 4,
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>view_in_ar</span>
          Explore in 3D
        </button>
      </div>

      {open && (
        <ParkViewerModal
          modelFile={modelFile}
          modelFileMobile={modelFileMobile}
          parkName={parkName}
          onClose={() => setOpen(false)}
          {...viewerProps}
        />
      )}
    </>
  );
}
