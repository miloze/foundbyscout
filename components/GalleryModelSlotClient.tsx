"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { isPhone, isMobileViewport } from "@/lib/device";

const GalleryModelSlot = dynamic(() => import("./GalleryModelSlot"), { ssr: false });

type Props = {
  modelFile: string;
  background?: string;
  debug?: boolean;
  /** Shown instead of the model on phones — normally the slot's own image. */
  fallbackSrc?: string;
};

export default function GalleryModelSlotClient({ modelFile, background, debug, fallbackSrc }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  // Resolved after mount: the server has no user agent, and rendering a
  // different tree on the first client pass would be a hydration mismatch.
  const [phone, setPhone] = useState<boolean | null>(null);

  // Same rule the hero viewer uses (viewport < 768), plus a UA check so a
  // phone held in landscape still counts. Sniffing alone would miss devices;
  // width alone would keep WebGL on a narrow desktop window, which is exactly
  // where it is cheapest to skip anyway.
  useEffect(() => {
    const check = () => setPhone(isMobileViewport() || isPhone());
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (phone !== false) return;          // never observe if we won't mount WebGL
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { rootMargin: "200px" },   // start loading 200px before it enters viewport
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [phone]);

  // ── Phones: no WebGL ──────────────────────────────────────────────────────
  // Gallery slots mount a full WebGL context each, on top of whatever the hero
  // and the expand-to-3D modal already hold. Bloblands' slot alone is a 4.9MB
  // GLB, which is what was crashing Chrome and Safari on phones. Tablets and
  // desktop are unaffected — isPhone() treats iPads as desktop.
  if (phone) {
    return (
      <div style={{ position: "absolute", inset: 0, background: background ?? "var(--card)" }}>
        {fallbackSrc && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={fallbackSrc}
            alt=""
            loading="lazy"
            decoding="async"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        )}
      </div>
    );
  }

  return (
    <div ref={ref} style={{ position: "absolute", inset: 0 }}>
      {visible && (
        <GalleryModelSlot modelFile={modelFile} background={background} debug={debug} />
      )}
    </div>
  );
}
