"use client";

import { useRef } from "react";
import GalleryModelSlotClient from "@/components/GalleryModelSlotClient";

export type SlotType = "image" | "glb" | "video" | "gif";

export type GallerySlot = {
  slot: number;
  ratio: string;
  type: SlotType;
  glbFile?: string;
  /** Image callout — a short label and one sentence that adds meaning.
   *  Both optional; slots without them render exactly as before. */
  label?: string;
  caption?: string;
};

export type GalleryColumn = { slots: GallerySlot[] };

// Backwards-compatible: a row item is either a flat slot (old) or a column (new)
export type GalleryRow = (GallerySlot | GalleryColumn)[];

type Props = {
  rows: GalleryRow[];
  images: { src: string; alt?: string }[];
  modelFile?: string | null;
  debug?: boolean;
};

function toAbsPath(p: string) {
  return p.startsWith("/") || p.startsWith("http") ? p : `/${p}`;
}

function aspectToPercent(ratio: string): string {
  const [w, h] = ratio.split("/").map(Number);
  if (!w || !h) return "56.25%";
  return `${(h / w) * 100}%`;
}

function SlotContent({ slot, src, alt, modelFile, debug }: {
  slot: GallerySlot;
  src: string;
  alt: string;
  modelFile?: string | null;
  debug?: boolean;
}) {
  const hasCallout = Boolean(slot.label || slot.caption);

  return (
    <figure style={{ margin: 0 }}>
      <div style={{ position: "relative", overflow: "hidden", background: "var(--card)" }}>
        <div style={{ paddingBottom: aspectToPercent(slot.ratio), position: "relative" }}>
          <div style={{ position: "absolute", inset: 0 }}>
            {slot.type === "glb" && (slot.glbFile || modelFile) ? (
              <GalleryModelSlotClient modelFile={toAbsPath(slot.glbFile || modelFile!)} debug={debug} fallbackSrc={src} />
            ) : slot.type === "video" && src ? (
              <video autoPlay loop muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} src={src} />
            ) : src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={src} alt={alt || slot.caption || ""} loading="lazy" decoding="async" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{ width: "100%", height: "100%", background: "var(--card)" }} />
            )}
          </div>
        </div>
      </div>

      {hasCallout && (
        <figcaption style={{ display: "flex", gap: 10, alignItems: "baseline", paddingTop: 10 }}>
          {slot.label && (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--accent)", flexShrink: 0 }}>
              {slot.label}
            </span>
          )}
          {slot.caption && (
            <span style={{ fontSize: 12.5, lineHeight: 1.55, color: "var(--muted)" }}>
              {slot.caption}
            </span>
          )}
        </figcaption>
      )}
    </figure>
  );
}

export default function EditorialGallery({ rows, images, modelFile, debug }: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {rows.map((row, rowIdx) => (
        <div key={rowIdx} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          {row.map((item, itemIdx) => {
            // Normalise: flat slot (old format) → single-slot column
            const slots: GallerySlot[] = "slots" in item ? item.slots : [item];
            return (
              <div key={itemIdx} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
                {slots.map((slot, slotIdx) => (
                  <SlotContent
                    key={slotIdx}
                    slot={slot}
                    src={images[slot.slot]?.src ?? ""}
                    alt={images[slot.slot]?.alt ?? ""}
                    modelFile={modelFile}
                    debug={debug}
                  />
                ))}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
