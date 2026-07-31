"use client";

import dynamic from "next/dynamic";
import ViewerErrorBoundary from "./ViewerErrorBoundary";

const ParkModel = dynamic(() => import("./ParkModel"), { ssr: false });

export default function ParkModelClient({
  modelFile, preloadImage, onLoad, cameraPos, cameraTarget, modelRotation,
  pingPong, autoRotate, debug,
  ambientIntensity, directionalIntensity, environmentPreset, environmentIntensity,
  grayscale,
}: {
  modelFile: string;
  preloadImage?: string;
  onLoad?: () => void;
  cameraPos?: [number, number, number];
  cameraTarget?: [number, number, number];
  modelRotation?: [number, number, number];
  pingPong?: [[number,number,number],[number,number,number]];
  autoRotate?: boolean;
  debug?: boolean;
  ambientIntensity?: number;
  directionalIntensity?: number;
  environmentPreset?: string;
  environmentIntensity?: number;
  grayscale?: boolean;
}) {
  // If the model can't render, the hero keeps the preload image it was already
  // showing — the still frame the viewer fades out of. The page loses the
  // interaction and nothing else.
  const fallback = (
    <div style={{ position: "absolute", inset: 0, background: "var(--card)" }}>
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
    <ViewerErrorBoundary fallback={fallback} resetKey={modelFile}>
      <ParkModel
        modelFile={modelFile} preloadImage={preloadImage} onLoad={onLoad}
        cameraPos={cameraPos} cameraTarget={cameraTarget} modelRotation={modelRotation}
        pingPong={pingPong} autoRotate={autoRotate} debug={debug}
        ambientIntensity={ambientIntensity} directionalIntensity={directionalIntensity}
        environmentPreset={environmentPreset} environmentIntensity={environmentIntensity}
        grayscale={grayscale}
      />
    </ViewerErrorBoundary>
  );
}
