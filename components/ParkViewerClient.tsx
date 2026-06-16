"use client";

import dynamic from "next/dynamic";

const ParkViewer = dynamic(() => import("./ParkViewer"), { ssr: false });

export default function ParkViewerClient({
  modelFile, cameraPos, cameraTarget, modelRotation,
  ambientIntensity, directionalIntensity, environmentPreset, environmentIntensity,
}: {
  modelFile: string;
  cameraPos?: [number, number, number];
  cameraTarget?: [number, number, number];
  modelRotation?: [number, number, number];
  ambientIntensity?: number;
  directionalIntensity?: number;
  environmentPreset?: string;
  environmentIntensity?: number;
}) {
  return (
    <ParkViewer
      modelFile={modelFile} cameraPos={cameraPos} cameraTarget={cameraTarget} modelRotation={modelRotation}
      ambientIntensity={ambientIntensity} directionalIntensity={directionalIntensity}
      environmentPreset={environmentPreset} environmentIntensity={environmentIntensity}
    />
  );
}
