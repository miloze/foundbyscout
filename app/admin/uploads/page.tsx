"use client";

import { useState, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type UploadedFile = { name: string; url: string; path: string };
type LayoutImage = { url: string; path: string; name: string; ratio: "16x9" | "9x16" | "1x1"; id: string };

const RATIO_LABELS = { "16x9": "16:9", "9x16": "9:16", "1x1": "1:1" };

export default function AdminUploadsPage() {
  const [parkSlug, setParkSlug] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [uploaded, setUploaded] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [layout, setLayout] = useState<LayoutImage[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dragSrcId, setDragSrcId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const dropped = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"));
    setFiles(prev => [...prev, ...dropped]);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
  }

  function removeFile(i: number) {
    setFiles(prev => prev.filter((_, idx) => idx !== i));
  }

  async function handleUpload() {
    if (!files.length) return;
    if (!parkSlug.trim()) { setError("Enter a park slug first"); return; }
    setUploading(true);
    setError("");
    const results: UploadedFile[] = [];

    for (const file of files) {
      const path = `${parkSlug}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("park-images")
        .upload(path, file, { upsert: true });

      if (uploadError) {
        setError(`Failed to upload ${file.name}: ${uploadError.message}`);
        setUploading(false);
        return;
      }

      const { data } = supabase.storage.from("park-images").getPublicUrl(path);
      results.push({ name: file.name, url: data.publicUrl, path });
    }

    setLayout(prev => [
      ...prev,
      ...results.map(r => ({
        ...r,
        ratio: "16x9" as const,
        id: Math.random().toString(36).slice(2),
      })),
    ]);
    setUploaded(prev => [...prev, ...results]);
    setFiles([]);
    setUploading(false);
  }

  function setRatio(id: string, ratio: LayoutImage["ratio"]) {
    setLayout(prev => prev.map(img => img.id === id ? { ...img, ratio } : img));
  }

  function removeFromLayout(id: string) {
    setLayout(prev => prev.filter(img => img.id !== id));
  }

  function onDragStart(e: React.DragEvent, id: string) {
    setDragSrcId(id);
    e.dataTransfer.effectAllowed = "move";
  }
  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }
  function onDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault();
    if (!dragSrcId || dragSrcId === targetId) return;
    setLayout(prev => {
      const next = [...prev];
      const srcIdx = next.findIndex(i => i.id === dragSrcId);
      const tgtIdx = next.findIndex(i => i.id === targetId);
      const [moved] = next.splice(srcIdx, 1);
      next.splice(tgtIdx, 0, moved);
      return next;
    });
    setDragSrcId(null);
  }

  async function saveLayout() {
    if (!layout.length || !parkSlug.trim()) return;
    setSaving(true);
    setSaved(false);

    await supabase.from("park_images").delete().eq("park_slug", parkSlug);

    const rows = layout.map((img, idx) => ({
      park_slug: parkSlug,
      path: img.path,
      url: img.url,
      ratio: img.ratio,
      order_index: idx,
    }));

    const { error: saveError } = await supabase.from("park_images").insert(rows);
    setSaving(false);
    if (saveError) { setError(`Save failed: ${saveError.message}`); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  const mono: React.CSSProperties = { fontFamily: "var(--font-mono)" };

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <p style={{ ...mono, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.2em", color: "var(--muted)", marginBottom: 8 }}>Admin</p>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "2rem", fontWeight: 300, textTransform: "uppercase", letterSpacing: "-0.02em" }}>Uploads</h1>
      </div>

      <div style={{ marginBottom: 24, maxWidth: 400 }}>
        <label style={{ display: "block", ...mono, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--muted)", marginBottom: 8 }}>
          Park slug (folder name)
        </label>
        <input
          value={parkSlug}
          onChange={e => setParkSlug(e.target.value)}
          placeholder="crystal-palace"
          style={{ width: "100%", background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)", ...mono, fontSize: 13, padding: "10px 12px", outline: "none", boxSizing: "border-box" }}
        />
        <p style={{ ...mono, fontSize: 9, color: "var(--muted)", letterSpacing: "0.06em", marginTop: 6 }}>
          Images stored at park-images/{"{slug}"}/filename
        </p>
      </div>

      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        style={{ border: `1px dashed ${dragging ? "var(--accent)" : "var(--border)"}`, background: dragging ? "color-mix(in srgb, var(--accent) 5%, var(--card))" : "var(--card)", padding: "40px 24px", cursor: "pointer", textAlign: "center", transition: "all 0.2s", marginBottom: 2 }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 32, color: "var(--muted)", display: "block", marginBottom: 12 }}>upload</span>
        <p style={{ ...mono, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 4 }}>
          Drag & drop or click to select images
        </p>
        <p style={{ ...mono, fontSize: 9, color: "var(--border)", letterSpacing: "0.06em" }}>
          JPG, PNG, WebP — uploads to Supabase Storage
        </p>
        <input ref={inputRef} type="file" multiple accept="image/*" onChange={handleChange} style={{ display: "none" }} />
      </div>

      {files.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 2, marginBottom: 20 }}>
          {files.map((f, i) => (
            <div key={i} style={{ position: "relative", aspectRatio: "4/3", background: "var(--card)", overflow: "hidden" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={URL.createObjectURL(f)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", filter: "grayscale(1)" }} />
              <button onClick={e => { e.stopPropagation(); removeFile(i); }} style={{ position: "absolute", top: 4, right: 4, width: 20, height: 20, borderRadius: "50%", background: "rgba(0,0,0,0.7)", border: "none", cursor: "pointer", color: "#fff", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "3px 6px", background: "rgba(0,0,0,0.6)" }}>
                <p style={{ ...mono, fontSize: 7, color: "rgba(255,255,255,0.7)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {files.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 40 }}>
          <button
            onClick={handleUpload}
            disabled={uploading}
            style={{ padding: "11px 28px", background: "var(--accent)", color: "#fff", border: "none", ...mono, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", cursor: uploading ? "not-allowed" : "pointer", opacity: uploading ? 0.6 : 1 }}
          >
            {uploading ? `Uploading ${files.length} file${files.length > 1 ? "s" : ""}…` : `Upload ${files.length} file${files.length > 1 ? "s" : ""} →`}
          </button>
          <button onClick={() => setFiles([])} style={{ ...mono, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", background: "none", border: "1px solid var(--border)", padding: "11px 18px", cursor: "pointer" }}>
            Clear
          </button>
        </div>
      )}

      {error && <p style={{ ...mono, fontSize: 10, color: "var(--accent)", marginBottom: 20 }}>{error}</p>}

      {/* Layout Manager */}
      {layout.length > 0 && (
        <>
          <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "32px 0 24px" }} />
          <p style={{ ...mono, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--muted)", marginBottom: 4 }}>
            Layout — drag to reorder
          </p>
          <p style={{ ...mono, fontSize: 9, color: "var(--border)", letterSpacing: "0.06em", marginBottom: 16 }}>
            Assign a ratio to each image then save. Order here = order on the park page.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 16 }}>
            {layout.map((img, idx) => (
              <div
                key={img.id}
                draggable
                onDragStart={e => onDragStart(e, img.id)}
                onDragOver={onDragOver}
                onDrop={e => onDrop(e, img.id)}
                style={{ background: "var(--card)", border: "1px solid var(--border)", padding: "10px 14px", display: "flex", alignItems: "center", gap: 14, cursor: "grab", opacity: dragSrcId === img.id ? 0.4 : 1, transition: "opacity 0.15s" }}
              >
                <span style={{ ...mono, fontSize: 9, color: "var(--muted)", minWidth: 16, textAlign: "center" }}>{idx + 1}</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt="" style={{ width: 56, height: 40, objectFit: "cover", flexShrink: 0, filter: "grayscale(1)" }} />
                <span style={{ ...mono, fontSize: 9, color: "var(--muted)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{img.name}</span>
                <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                  {(["16x9", "9x16", "1x1"] as const).map(r => (
                    <button
                      key={r}
                      onClick={() => setRatio(img.id, r)}
                      style={{ ...mono, fontSize: 8, letterSpacing: "0.08em", padding: "5px 10px", border: "1px solid var(--border)", background: img.ratio === r ? "var(--foreground)" : "var(--card)", color: img.ratio === r ? "var(--background)" : "var(--muted)", cursor: "pointer", transition: "all 0.15s" }}
                    >
                      {RATIO_LABELS[r]}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => removeFromLayout(img.id)}
                  style={{ ...mono, fontSize: 16, color: "var(--muted)", background: "none", border: "none", cursor: "pointer", lineHeight: 1, padding: "0 4px", flexShrink: 0 }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          {/* Preview strip */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, padding: 12, background: "var(--card)", border: "1px solid var(--border)", marginBottom: 20 }}>
            {layout.map((img, idx) => {
              const w = img.ratio === "9x16" ? 36 : img.ratio === "1x1" ? 64 : 114;
              const h = 64;
              return (
                <div key={img.id} style={{ position: "relative", width: w, height: h, background: "var(--border)", flexShrink: 0, overflow: "hidden" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", filter: "grayscale(1)" }} />
                  <span style={{ position: "absolute", bottom: 2, left: 3, ...mono, fontSize: 7, color: "rgba(255,255,255,0.8)" }}>{idx + 1}</span>
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button
              onClick={saveLayout}
              disabled={saving}
              style={{ padding: "11px 28px", background: "var(--accent)", color: "#fff", border: "none", ...mono, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}
            >
              {saving ? "Saving…" : `Save layout for ${parkSlug || "park"} →`}
            </button>
            {saved && <span style={{ ...mono, fontSize: 9, color: "var(--muted)", letterSpacing: "0.1em" }}>✓ saved</span>}
          </div>
        </>
      )}
    </div>
  );
}