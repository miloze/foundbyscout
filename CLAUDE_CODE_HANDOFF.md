# Scout — Gallery System Handoff

## Context
Scout is a Next.js skatepark directory. We've been building a row-based editorial gallery system controlled from an admin panel. The Supabase `parks` table has a `gallery_rows` JSONB column that stores the layout.

## What's already done
- `components/EditorialGallery.tsx` — fully rewritten, takes `rows`, `images`, `modelFile`, `debug` props
- `app/admin/parks/[slug]/page.tsx` — partially updated, has `galleryRows` state, `btnStyle`, `GalleryRowItem` type, but the gallery section (section 8) may still have old slot-based code
- Supabase has: `gallery_rows jsonb`, `slot_ratios text[]`, `slot_order integer[]`, `park_images` table

## What needs fixing

### 1. `app/parks/[slug]/page.tsx`
- Add this import at the top (replacing any existing EditorialGallery import):
  ```tsx
  import EditorialGallery, { GalleryRow } from "@/components/EditorialGallery";
  ```
- Add this after `galleryImages` is defined:
  ```tsx
  const galleryRows: GalleryRow[] = Array.isArray(park.gallery_rows) ? park.gallery_rows : [];
  ```
- Replace the entire photo gallery section with:
  ```tsx
  {galleryRows.length > 0 && (
    <section style={{ paddingBottom: 64, borderBottom: "1px solid var(--border)" }}>
      <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 16, paddingTop: 64 }}>Photos</p>
      <EditorialGallery
        rows={galleryRows}
        images={galleryImages}
        modelFile={modelFile}
        debug={isDebug}
      />
    </section>
  )}
  ```

### 2. `app/admin/parks/[slug]/page.tsx`
- Make sure these exist at the top of the file (outside the component):
  ```tsx
  type GalleryRowItem = { slot: number; ratio: string; type: "image" | "video" | "gif" | "glb" };
  
  const btnStyle: React.CSSProperties = {
    fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: "0.06em",
    padding: "3px 8px", border: "1px solid var(--border)",
    background: "var(--card)", color: "var(--muted)",
    cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap",
  };
  ```
- Make sure this state exists inside `EditParkPage`:
  ```tsx
  const [galleryRows, setGalleryRows] = useState<GalleryRowItem[][]>([]);
  ```
- Make sure the useEffect that loads park data includes:
  ```tsx
  if (Array.isArray(park.gallery_rows)) setGalleryRows(park.gallery_rows);
  ```
- Make sure `handleSubmit` body includes:
  ```tsx
  gallery_rows: galleryRows,
  ```
- Replace section 8 (the entire gallery section from `{/* 8. GALLERY */}` to its closing `</section>`) with:

```tsx
{/* 8. GALLERY */}
<section>
  <SectionHead>Gallery — editorial layout</SectionHead>
  <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--muted)", letterSpacing: "0.04em", marginBottom: 20, lineHeight: 1.8 }}>
    Build rows of 1 or 2 slots. Each slot can be an image, video, GIF or 3D model.
  </p>

  <input
    ref={slotFileInputRef} type="file" accept="image/*,video/*" style={{ display: "none" }}
    onChange={e => { handleSlotUpload(slotUploadIndexRef.current, e.target.files); e.target.value = ""; }}
  />

  <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 6 }}>
    {galleryRows.map((row, rowIdx) => (
      <div key={rowIdx} style={{ border: "1px solid var(--border)", background: "var(--card)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderBottom: "1px solid var(--border)" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", flex: 1 }}>
            Row {rowIdx + 1} · {row.length === 1 ? "full width" : "2 slots"}
          </span>
          {rowIdx > 0 && (
            <button type="button" onClick={() => {
              setGalleryRows(prev => {
                const next = [...prev];
                [next[rowIdx - 1], next[rowIdx]] = [next[rowIdx], next[rowIdx - 1]];
                return next;
              });
            }} style={{ ...btnStyle }}>↑</button>
          )}
          {rowIdx < galleryRows.length - 1 && (
            <button type="button" onClick={() => {
              setGalleryRows(prev => {
                const next = [...prev];
                [next[rowIdx], next[rowIdx + 1]] = [next[rowIdx + 1], next[rowIdx]];
                return next;
              });
            }} style={{ ...btnStyle }}>↓</button>
          )}
          {row.length < 2 && (
            <button type="button" onClick={() => {
              setGalleryRows(prev => {
                const next = [...prev];
                const nextSlot = Math.max(...next.flatMap(r => r.map(s => s.slot)), -1) + 1;
                next[rowIdx] = [...next[rowIdx], { slot: nextSlot, ratio: "1/1", type: "image" as const }];
                return next;
              });
            }} style={{ ...btnStyle }}>+ slot</button>
          )}
          <button type="button" onClick={() => {
            setGalleryRows(prev => prev.filter((_, i) => i !== rowIdx));
          }} style={{ ...btnStyle, color: "var(--accent)" }}>× row</button>
        </div>

        <div style={{ display: "flex", gap: 2, padding: 10 }}>
          {row.map((slot, slotIdx) => {
            const url = form.gallery_images[slot.slot] ?? "";
            const RATIO_OPTIONS = [
              { label: "16:9", aspect: "16/9" },
              { label: "9:16", aspect: "9/16" },
              { label: "1:1",  aspect: "1/1"  },
              { label: "21:9", aspect: "21/9" },
              { label: "3:2",  aspect: "3/2"  },
            ];
            return (
              <div key={slotIdx} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                  {(["image","video","gif","glb"] as const).map(t => (
                    <button key={t} type="button"
                      onClick={() => setGalleryRows(prev => {
                        const next = prev.map(r => [...r]);
                        next[rowIdx][slotIdx] = { ...next[rowIdx][slotIdx], type: t };
                        return next;
                      })}
                      style={{ ...btnStyle, background: slot.type === t ? "var(--foreground)" : "var(--card)", color: slot.type === t ? "var(--background)" : "var(--muted)" }}
                    >{t}</button>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                  {RATIO_OPTIONS.map(r => (
                    <button key={r.label} type="button"
                      onClick={() => setGalleryRows(prev => {
                        const next = prev.map(r => [...r]);
                        next[rowIdx][slotIdx] = { ...next[rowIdx][slotIdx], ratio: r.aspect };
                        return next;
                      })}
                      style={{ ...btnStyle, background: slot.ratio === r.aspect ? "var(--foreground)" : "var(--card)", color: slot.ratio === r.aspect ? "var(--background)" : "var(--muted)" }}
                    >{r.label}</button>
                  ))}
                </div>

                <div
                  style={{ position: "relative", aspectRatio: slot.ratio, background: "var(--card)", border: "1px solid var(--border)", overflow: "hidden", cursor: slot.type !== "glb" ? "pointer" : "default" }}
                  onClick={() => {
                    if (slot.type === "glb") return;
                    slotUploadIndexRef.current = slot.slot;
                    slotFileInputRef.current?.click();
                  }}
                >
                  {slot.type === "glb"
                    ? <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>3D model slot</span></div>
                    : url
                      ? slot.type === "video"
                        ? <video src={url} autoPlay loop muted playsInline style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                        : <img src={url} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                      : <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "var(--border)", textTransform: "uppercase", letterSpacing: "0.1em" }}>click to upload</span>
                        </div>
                  }
                </div>

                {slot.type !== "glb" && (
                  <div style={{ display: "flex", gap: 2 }}>
                    <input
                      type="text"
                      value={slotUrls[slot.slot] ?? ""}
                      onChange={e => setSlotUrls(prev => { const n = [...prev]; n[slot.slot] = e.target.value; return n; })}
                      onKeyDown={e => {
                        if (e.key !== "Enter") return;
                        const u = slotUrls[slot.slot]?.trim();
                        if (u) { setSlotImage(slot.slot, u); setSlotUrls(prev => { const n = [...prev]; n[slot.slot] = ""; return n; }); }
                      }}
                      placeholder="Paste URL + Enter"
                      style={{ flex: 1, background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)", fontFamily: "var(--font-mono)", fontSize: 8, padding: "5px 7px", outline: "none" }}
                    />
                    <button type="button"
                      onClick={() => { const u = slotUrls[slot.slot]?.trim(); if (u) { setSlotImage(slot.slot, u); setSlotUrls(prev => { const n = [...prev]; n[slot.slot] = ""; return n; }); }}}
                      style={{ ...btnStyle }}>→</button>
                  </div>
                )}

                {url && slot.type !== "glb" && (
                  <div style={{ display: "flex", gap: 2 }}>
                    <button type="button"
                      onClick={() => setForm(f => ({ ...f, hero_image: url }))}
                      style={{ ...btnStyle, flex: 1 }}>set hero</button>
                    <button type="button"
                      onClick={() => setSlotImage(slot.slot, "")}
                      style={{ ...btnStyle, color: "var(--accent)" }}>×</button>
                  </div>
                )}

                {row.length > 1 && (
                  <button type="button"
                    onClick={() => setGalleryRows(prev => {
                      const next = prev.map(r => [...r]);
                      next[rowIdx] = next[rowIdx].filter((_, i) => i !== slotIdx);
                      return next;
                    })}
                    style={{ ...btnStyle, color: "var(--accent)", width: "100%" }}>× remove slot</button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    ))}
  </div>

  <button type="button"
    onClick={() => {
      const nextSlot = galleryRows.length === 0 ? 0 : Math.max(...galleryRows.flatMap(r => r.map(s => s.slot)), -1) + 1;
      setGalleryRows(prev => [...prev, [{ slot: nextSlot, ratio: "16/9", type: "image" as const }]]);
    }}
    style={{ width: "100%", padding: "9px 16px", fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--accent)", background: "none", border: "1px dashed var(--accent)", cursor: "pointer" }}
  >+ Add row</button>
</section>
```

## Gallery data structure
`gallery_rows` in Supabase is a JSONB array of rows. Each row is an array of slots:
```json
[
  [{ "slot": 0, "ratio": "16/9", "type": "image" }],
  [{ "slot": 1, "ratio": "9/16", "type": "image" }, { "slot": 2, "ratio": "9/16", "type": "image" }],
  [{ "slot": 3, "ratio": "16/9", "type": "video" }]
]
```
`gallery_images` on the park is a flat string array — `gallery_images[slot.slot]` gives the URL for that slot.

## Design system vars
- `--font-mono`, `--font-heading`, `--font-body`
- `--foreground`, `--background`, `--muted`, `--border`, `--card`, `--accent`

## Goal
After these fixes, the admin lets you build rows of 1-2 slots, assign ratios and types, upload images, and save. The park page renders exactly that layout from `gallery_rows`.
