"use client";

import dynamic from "next/dynamic";

const ContourModel = dynamic(() => import("./ContourModel"), { ssr: false });

export default function ContourModelClient({
  modelFile,
  cameraPos,
  cameraTarget,
  modelRotation,
}: {
  modelFile: string;
  cameraPos?: [number, number, number];
  cameraTarget?: [number, number, number];
  modelRotation?: [number, number, number];
}) {
  return <ContourModel modelFile={modelFile} cameraPos={cameraPos} cameraTarget={cameraTarget} modelRotation={modelRotation} />;
}
