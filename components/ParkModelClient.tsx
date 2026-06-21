"use client";

import dynamic from "next/dynamic";

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
  return (
    <ParkModel
      modelFile={modelFile} preloadImage={preloadImage} onLoad={onLoad}
      cameraPos={cameraPos} cameraTarget={cameraTarget} modelRotation={modelRotation}
      pingPong={pingPong} autoRotate={autoRotate} debug={debug}
      ambientIntensity={ambientIntensity} directionalIntensity={directionalIntensity}
      environmentPreset={environmentPreset} environmentIntensity={environmentIntensity}
      grayscale={grayscale}
    />
  );
}
