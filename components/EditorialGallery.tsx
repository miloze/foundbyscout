type EditorialImage = {
  src: string;
  alt?: string;
};

type EditorialGalleryProps = {
  images: EditorialImage[];
  /** Replace any slot index with arbitrary JSX (e.g. a 3-D model viewer). */
  slotOverrides?: Partial<Record<number, React.ReactNode>>;
};

/**
 * Slot order:
 *   0 → full-width (top)
 *   1 → left of 2-up row
 *   2 → right of 2-up row
 *   3 → left of square row  (model override goes here)
 *   4 → right of square row
 *   5 → full-width (mid)
 *   6 → full-width (lower)
 *   7 → full-width (bottom)
 *
 * Images display at their natural aspect ratios — no forced cropping.
 * Slot overrides (e.g. 3-D canvas) need a fixed-size container, so they
 * use aspectRatio:"1/1" on the wrapper instead.
 */
export default function EditorialGallery({ images, slotOverrides = {} }: EditorialGalleryProps) {
  const src  = (i: number) => images[i]?.src  ?? "";
  const alt  = (i: number) => images[i]?.alt  ?? "";
  const has  = (i: number) => !!slotOverrides[i] || !!images[i]?.src;

  // Slots that should be cropped to a square
  const SQUARE_SLOTS = new Set([2, 3, 4]);

  /** Image slot. Square slots crop to 1:1; others size to natural ratio. */
  const imgSlot = (i: number) => {
    const override = slotOverrides[i];
    const square   = SQUARE_SLOTS.has(i);

    if (override || square) {
      return (
        <div key={i} style={{ position: "relative", aspectRatio: "1/1", overflow: "hidden" }}>
          {override ?? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src(i)} alt={alt(i)}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
          )}
        </div>
      );
    }

    return (
      <div key={i}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src(i)} alt={alt(i)}
          style={{ display: "block", width: "100%", height: "auto" }} />
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, background: "var(--background)" }}>

      {/* Row 1 — full width */}
      {has(0) && imgSlot(0)}

      {/* Row 2 — two columns, each image at its own ratio */}
      {(has(1) || has(2)) && (
        <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 10 }}>
          {has(1) && imgSlot(1)}
          {has(2) && imgSlot(2)}
        </div>
      )}

      {/* Row 3 — two equal columns */}
      {(has(3) || has(4)) && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {has(3) && imgSlot(3)}
          {has(4) && imgSlot(4)}
        </div>
      )}

      {/* Row 4 — full width */}
      {has(5) && imgSlot(5)}

      {/* Row 5 — full width */}
      {has(6) && imgSlot(6)}

      {/* Row 6 — full width */}
      {has(7) && imgSlot(7)}

    </div>
  );
}
