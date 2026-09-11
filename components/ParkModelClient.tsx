"use client";

import dynamic from "next/dynamic";
import ViewerErrorBoundary from "./ViewerErrorBoundary";
import type { CameraBounds } from "@/lib/heroCamera";

const ParkModel = dynamic(() => import("./ParkModel"), { ssr: false });

export default function ParkModelClient({
  modelFile, preloadImage, onLoad, cameraPos, cameraTarget, modelRotation,
  autoRotate, debug, onZoomChange, loadingBackground, spinning, allowRotate, allowZoom, showLoadingNote, onInteract, onDrag, stopOnInteract, cameraBounds,
  ambientIntensity, directionalIntensity, environmentPreset, environmentIntensity,
  grayscale, onFailed,
}: {
  modelFile: string;
  preloadImage?: string;
  onLoad?: () => void;
  onFailed?: () => void;
  cameraPos?: [number, number, number];
  cameraTarget?: [number, number, number];
  modelRotation?: [number, number, number];
  autoRotate?: boolean;
  debug?: boolean;
  ambientIntensity?: number;
  directionalIntensity?: number;
  environmentPreset?: string;
  environmentIntensity?: number;
  grayscale?: boolean;
  onZoomChange?: (pct: number) => void;
  loadingBackground?: string;
  spinning?: boolean;
  allowRotate?: boolean;
  allowZoom?: boolean;
  showLoadingNote?: boolean;
  onInteract?: () => void;
  onDrag?: () => void;
  stopOnInteract?: boolean;
  /** Per-park orbit window for an ENCLOSED park — see CameraBounds in
   *  lib/heroCamera. Undefined outdoors, where it changes nothing. */
  cameraBounds?: CameraBounds | null;
}) {
  // If the model can't render, the hero keeps the preload image it was already
  // showing — the still frame the viewer fades out of. The page loses the
  // interaction and nothing else.
  const fallback = (
    // --background, not --card: the fallback is what a reader actually sees
    // when a scan fails, and --card is a step lighter than the page ground, so a
    // failed viewer used to read as a deliberately paler panel.
    <div style={{ position: "absolute", inset: 0, background: "var(--background)" }}>
      {preloadImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preloadImage}
          alt=""
          style={{
            position: "absolute", inset: 0, width: "100%", height: "100%",
            objectFit: "cover", filter: grayscale ? "grayscale(1)" : "none",
          }}
        />
      )}
    </div>
  );


  return (
    <ViewerErrorBoundary fallback={fallback} resetKey={modelFile} onFailed={onFailed}>
      <ParkModel
        modelFile={modelFile} preloadImage={preloadImage} onLoad={onLoad}
        cameraPos={cameraPos} cameraTarget={cameraTarget} modelRotation={modelRotation}
        autoRotate={autoRotate} debug={debug}
        ambientIntensity={ambientIntensity} directionalIntensity={directionalIntensity}
        environmentPreset={environmentPreset} environmentIntensity={environmentIntensity}
        grayscale={grayscale} onZoomChange={onZoomChange}
        loadingBackground={loadingBackground}
        spinning={spinning} allowRotate={allowRotate} allowZoom={allowZoom}
        showLoadingNote={showLoadingNote}
        onInteract={onInteract}
        onDrag={onDrag}
        stopOnInteract={stopOnInteract}
        cameraBounds={cameraBounds}
      />
    </ViewerErrorBoundary>
  );
}
