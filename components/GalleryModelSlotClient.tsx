"use client";

import dynamic from "next/dynamic";

const GalleryModelSlot = dynamic(() => import("./GalleryModelSlot"), { ssr: false });

type Props = {
  modelFile: string;
  background?: string;
  debug?: boolean;
};

export default function GalleryModelSlotClient({ modelFile, background, debug }: Props) {
  return <GalleryModelSlot modelFile={modelFile} background={background} debug={debug} />;
}
