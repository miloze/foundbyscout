"use client";

import { useState, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type UploadedFile = { name: string; url: string; path: string };

export default function AdminUploadsPage() {
  const [parkSlug, setParkSlug] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [uploaded, setUploaded] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
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
      const ext = file.name.split(".").pop();
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

    setUploaded(prev => [...prev, ...results]);
    setFiles([]);
    setUploading(false);
  }

  function copyUrl(url: string) {
    navigator.clipboard.writeText(url);
  }

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.2em", color: "var(--muted)", marginBottom: 8 }}>Admin</p>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "2rem", fontWeight: 300, textTransform: "uppercase", letterSpacing: "-0.02em" }}>Uploads</h1>
      </div>

      {/* Park slug */}
      <div style={{ marginBottom: 24, maxWidth: 400 }}>
        <label style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--muted)", marginBottom: 8 }}>
          Park slug (folder name)
        </label>
        <input
          value={parkSlug}
          onChange={e => setParkSlug(e.target.value)}
          placeholder="crystal-palace"
          style={{ width: "100%", background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)", fontFamily: "var(--font-body)", fontSize: 13, padding: "10px 12px", outline: "none", boxSizing: "border-box" }}
        />
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--muted)", letterSpacing: "0.06em", marginTop: 6 }}>
          Images are stored at park-images/{"{slug}"}/filename
        </p>
      </div>

      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        style={{ border: `1px dashed ${dragging ? "var(--accent)" : "var(--border)"}`, background: dragging ? "color-mix(in srgb, var(--accent) 5%, var(--card))" : "var(--card)", padding: "40px 24px", cursor: "pointer", textAlign: "center", transition: "all 0.2s", marginBottom: 2 }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 32, color: "var(--muted)", display: "block", marginBottom: 12 }}>upload</span>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 4 }}>
          Drag & drop or click to select images
        </p>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--border)", letterSpacing: "0.06em" }}>
          JPG, PNG, WebP — uploads to Supabase Storage
        </p>
        <input ref={inputRef} type="file" multiple accept="image/*" onChange={handleChange} style={{ display: "none" }} />
      </div>

      {/* Staged files */}
      {files.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 2, marginBottom: 20 }}>
          {files.map((f, i) => (
            <div key={i} style={{ position: "relative", aspectRatio: "4/3", background: "var(--card)", overflow: "hidden" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={URL.createObjectURL(f)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", filter: "grayscale(1)" }} />
              <button onClick={e => { e.stopPropagation(); removeFile(i); }} style={{ position: "absolute", top: 4, right: 4, width: 20, height: 20, borderRadius: "50%", background: "rgba(0,0,0,0.7)", border: "none", cursor: "pointer", color: "#fff", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "3px 6px", background: "rgba(0,0,0,0.6)" }}>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 7, color: "rgba(255,255,255,0.7)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</p>
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
            style={{ padding: "11px 28px", background: "var(--accent)", color: "#fff", border: "none", fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", cursor: uploading ? "not-allowed" : "pointer", opacity: uploading ? 0.6 : 1 }}
          >
            {uploading ? `Uploading ${files.length} file${files.length > 1 ? "s" : ""}…` : `Upload ${files.length} file${files.length > 1 ? "s" : ""} →`}
          </button>
          <button onClick={() => setFiles([])} style={{ fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", background: "none", border: "1px solid var(--border)", padding: "11px 18px", cursor: "pointer" }}>
            Clear
          </button>
        </div>
      )}

      {error && <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--accent)", marginBottom: 20 }}>{error}</p>}

      {/* Uploaded results */}
      {uploaded.length > 0 && (
        <>
          <hr style={{ border: "none", borderTop: "1px solid var(--border)", marginBottom: 24 }} />
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--muted)", marginBottom: 16 }}>
            Uploaded — click URL to copy
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {uploaded.map((f, i) => (
              <div key={i} style={{ background: "var(--card)", border: "1px solid var(--border)", padding: "12px 16px", display: "flex", alignItems: "center", gap: 16 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.url} alt="" style={{ width: 48, height: 36, objectFit: "cover", flexShrink: 0, filter: "grayscale(1)" }} />
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--muted)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</p>
                <button
                  onClick={() => copyUrl(f.url)}
                  style={{ fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--accent)", background: "none", border: "1px solid var(--accent)", padding: "5px 12px", cursor: "pointer", flexShrink: 0 }}
                >
                  Copy URL
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
