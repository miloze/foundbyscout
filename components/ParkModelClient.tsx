"use client";

import dynamic from "next/dynamic";

const ParkModel = dynamic(() => import("./ParkModel"), { ssr: false });

export default function ParkModelClient({ modelFile, cameraPos, cameraTarget, modelRotation, pingPong, debug }: { modelFile: string; cameraPos?: [number, number, number]; cameraTarget?: [number, number, number]; modelRotation?: [number, number, number]; pingPong?: [[number,number,number],[number,number,number]]; debug?: boolean }) {
  return <ParkModel modelFile={modelFile} cameraPos={cameraPos} cameraTarget={cameraTarget} modelRotation={modelRotation} pingPong={pingPong} debug={debug} />;
}
