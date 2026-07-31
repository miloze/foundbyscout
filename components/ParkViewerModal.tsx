"use client";
import { useEffect, useState } from "react";
import ParkHeroViewer from "./ParkHeroViewer";
import { BwIcon, ArExitIcon, ViewerCluster, ViewerClusterDivider, ViewerClusterButton } from "./ViewerControls";

type Props = {
  modelFile: string;
  modelFileMobile?: string;
  featureFile?: string | null;
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
  // Owned here so the modal drives the viewer's grayscale externally — that
  // suppresses ParkModel's own fallback toggle, leaving exactly one B&W
  // control on screen, in the same cluster the inline hero uses.
  const [bw, setBw] = useState(true);

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
      {/* Header — label only; the exit control lives in the bottom-right
          cluster, in the same spot the "explore in 3D" button was tapped. */}
      <div style={{
        position: "absolute",
        top: 0, left: 0, right: 0,
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
      </div>

      {/* Viewer */}
      <div style={{ position: "relative", flex: 1 }}>
        <ParkHeroViewer
          modelFile={viewerProps.modelFile}
          modelFileMobile={viewerProps.modelFileMobile}
          featureFile={viewerProps.featureFile}
          cameraPos={viewerProps.cameraPos}
          cameraTarget={viewerProps.cameraTarget}
          modelRotation={viewerProps.modelRotation}
          pingPong={viewerProps.pingPong}
          autoRotate={viewerProps.autoRotate}
          ambientIntensity={viewerProps.ambientIntensity}
          directionalIntensity={viewerProps.directionalIntensity}
          environmentPreset={viewerProps.environmentPreset}
          environmentIntensity={viewerProps.environmentIntensity}
          heroImage=""
          debug={false}
          grayscale={bw}
          forceViewer
        />
      </div>

      {/* Control cluster — same component, same corner as the inline hero */}
      <div style={{
        position: "absolute",
        bottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
        right: 12,
        zIndex: 3,
      }}>
        <ViewerCluster>
          <ViewerClusterButton
            onClick={() => setBw(b => !b)}
            title={bw ? "Show colour" : "Show B&W"}
            active={bw}
          >
            <BwIcon active={bw} />
          </ViewerClusterButton>
          <ViewerClusterDivider />
          <ViewerClusterButton onClick={onClose} title="Exit 3D view">
            <ArExitIcon />
          </ViewerClusterButton>
        </ViewerCluster>
      </div>
    </div>
  );
}
