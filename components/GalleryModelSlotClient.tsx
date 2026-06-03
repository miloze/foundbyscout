"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

const GalleryModelSlot = dynamic(() => import("./GalleryModelSlot"), { ssr: false });

type Props = {
  modelFile: string;
  background?: string;
  debug?: boolean;
};

export default function GalleryModelSlotClient({ modelFile, background, debug }: Props) {
  const ref       = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { rootMargin: "200px" },   // start loading 200px before it enters viewport
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} style={{ position: "absolute", inset: 0 }}>
      {visible && (
        <GalleryModelSlot modelFile={modelFile} background={background} debug={debug} />
      )}
    </div>
  );
}
