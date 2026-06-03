"use client";

import dynamic from "next/dynamic";

const ParkModel = dynamic(() => import("./ParkModel"), { ssr: false });

export default function ParkModelClient({ modelFile, preloadImage, cameraPos, cameraTarget, modelRotation, pingPong, autoRotate, debug }: { modelFile: string; preloadImage?: string; cameraPos?: [number, number, number]; cameraTarget?: [number, number, number]; modelRotation?: [number, number, number]; pingPong?: [[number,number,number],[number,number,number]]; autoRotate?: boolean; debug?: boolean }) {
  return <ParkModel modelFile={modelFile} preloadImage={preloadImage} cameraPos={cameraPos} cameraTarget={cameraTarget} modelRotation={modelRotation} pingPong={pingPong} autoRotate={autoRotate} debug={debug} />;
}
