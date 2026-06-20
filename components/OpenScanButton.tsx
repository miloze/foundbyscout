"use client";
import { useState } from "react";
import ParkViewerModal from "./ParkViewerModal";

type Props = {
  modelFile: string;
  modelFileMobile?: string;
  parkName: string;
  cameraPos?: [number, number, number];
  cameraTarget?: [number, number, number];
  modelRotation?: [number, number, number];
  pingPong?: [[number, number, number], [number, number, number]];
  autoRotate?: boolean;
  ambientIntensity?: number;
  directionalIntensity?: number;
  environmentPreset?: string;
  environmentIntensity?: number;
};

export default function OpenScanButton({ parkName, ...viewerProps }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          display: "inline-block", padding: "11px 28px",
          fontSize: 12, fontWeight: "bold", textTransform: "uppercase",
          letterSpacing: "0.12em", background: "var(--accent)", color: "#fff",
          border: "none", cursor: "pointer", pointerEvents: "auto",
        }}
      >
        View scan →
      </button>
      {open && (
        <ParkViewerModal
          parkName={parkName}
          onClose={() => setOpen(false)}
          {...viewerProps}
        />
      )}
    </>
  );
}
