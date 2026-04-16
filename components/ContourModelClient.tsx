"use client";

import dynamic from "next/dynamic";

const ContourModel = dynamic(() => import("./ContourModel"), { ssr: false });

export default function ContourModelClient({ modelFile }: { modelFile: string }) {
  return <ContourModel modelFile={modelFile} />;
}
