"use client";

import dynamic from "next/dynamic";

const ParkModel = dynamic(() => import("./ParkModel"), { ssr: false });

type OrbitLimits = { minPolar: number; maxPolar: number; minAzimuth: number; maxAzimuth: number };
export default function ParkModelClient({ modelFile, cameraPos, cameraTarget, modelRotation, orbitLimits, pingPong }: { modelFile: string; cameraPos?: [number, number, number]; cameraTarget?: [number, number, number]; modelRotation?: [number, number, number]; orbitLimits?: OrbitLimits; pingPong?: [[number,number,number],[number,number,number]] }) {
  return <ParkModel modelFile={modelFile} cameraPos={cameraPos} cameraTarget={cameraTarget} modelRotation={modelRotation} orbitLimits={orbitLimits} pingPong={pingPong} />;
}
