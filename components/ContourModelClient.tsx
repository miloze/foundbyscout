"use client";

import dynamic from "next/dynamic";

const ContourModel = dynamic(() => import("./ContourModel"), { ssr: false });

export default function ContourModelClient({
  modelFile,
  cameraPos,
  modelRotation,
}: {
  modelFile: string;
  cameraPos?: [number, number, number];
  modelRotation?: [number, number, number];
}) {
  return <ContourModel modelFile={modelFile} cameraPos={cameraPos} modelRotation={modelRotation} />;
}
