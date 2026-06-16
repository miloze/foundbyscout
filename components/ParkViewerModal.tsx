"use client";
import { useEffect } from "react";
import ParkHeroViewer from "./ParkHeroViewer";

type Props = {
  modelFile: string;
  modelFileMobile?: string;
  parkName: string;
  onClose: () => void;
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

export default function ParkViewerModal({ parkName, onClose, ...viewerProps }: Props) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      zIndex: 9999,
      background: "var(--background)",
      display: "flex",
      flexDirection: "column",
    }}>
      {/* Header */}
      <div style={{
        position: "absolute",
        top: 0, left: 0, right: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 16px",
        zIndex: 2,
        pointerEvents: "none",
      }}>
        <span style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.5)",
        }}>
          {parkName}
        </span>

        <button
          onClick={onClose}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 12px",
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,0.15)",
            color: "#fff",
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            cursor: "pointer",
            pointerEvents: "auto",
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>close</span>
          Close
        </button>
      </div>

      {/* Viewer */}
      <div style={{ position: "relative", flex: 1 }}>
        <ParkHeroViewer
          {...viewerProps}
          heroImage=""
          debug={false}
          forceViewer
        />
      </div>

      {/* Drag hint */}
      <div style={{
        position: "absolute",
        bottom: 24,
        left: 0, right: 0,
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none",
        zIndex: 2,
        animation: "fadeOut 3s ease 2s forwards",
      }}>
        <span style={{
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.4)",
          background: "rgba(0,0,0,0.4)",
          padding: "6px 12px",
          backdropFilter: "blur(4px)",
        }}>
          Drag to explore
        </span>
      </div>

      <style>{`@keyframes fadeOut { to { opacity: 0; } }`}</style>
    </div>
  );
}
