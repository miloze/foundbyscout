"use client";

import { useState, useRef } from "react";

const OBSTACLE_OPTIONS = [
  "Bowl", "Bank", "Ledge", "Rail", "Manual pad", "Flat bar",
  "Kicker", "Quarter pipe", "Vert", "Pump track", "Spine", "Stairs", "Gap",
];

const AMENITY_OPTIONS: [string, string][] = [
  ["Free entry",      "is_free"],
  ["Covered",         "is_covered"],
  ["Lit at night",    "is_lit"],
  ["Parking nearby",  "has_parking"],
  ["Toilets",         "has_toilets"],
  ["Café nearby",     "has_cafe"],
  ["BMX friendly",    "bmx_friendly"],
  ["Scooter friendly","scooter_friendly"],
];

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--muted)", marginBottom: 8 }}>
      {children}
      {required && <span style={{ color: "var(--accent)", marginLeft: 4 }}>*</span>}
    </label>
  );
}

function TextInput({ placeholder, type = "text" }: { placeholder?: string; type?: string }) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      type={type}
      placeholder={placeholder}
      style={{
        width: "100%",
        background: "var(--card)",
        border: `1px solid ${focused ? "var(--accent)" : "var(--border)"}`,
        color: "var(--foreground)",
        fontFamily: "var(--font-body)",
        fontSize: 14,
        padding: "11px 14px",
        outline: "none",
        transition: "border-color 0.2s",
        boxSizing: "border-box",
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  );
}

function TextArea({ placeholder, rows = 4 }: { placeholder?: string; rows?: number }) {
  const [focused, setFocused] = useState(false);
  return (
    <textarea
      placeholder={placeholder}
      rows={rows}
      style={{
        width: "100%",
        background: "var(--card)",
        border: `1px solid ${focused ? "var(--accent)" : "var(--border)"}`,
        color: "var(--foreground)",
        fontFamily: "var(--font-body)",
        fontSize: 14,
        padding: "11px 14px",
        outline: "none",
        resize: "vertical",
        transition: "border-color 0.2s",
        lineHeight: 1.6,
        boxSizing: "border-box",
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  );
}

function UploadZone({ files, setFiles }: { files: File[]; setFiles: React.Dispatch<React.SetStateAction<File[]>> }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = Array.from(e.dataTransfer.files).filter(
      (f) => f.type.startsWith("image/") || f.type.startsWith("video/")
    );
    setFiles((prev) => [...prev, ...dropped]);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
  };

  const removeFile = (i: number) => setFiles((prev) => prev.filter((_, idx) => idx !== i));

  return (
    <div>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        style={{
          border: `1px dashed ${dragging ? "var(--accent)" : "var(--border)"}`,
          background: dragging ? "color-mix(in srgb, var(--accent) 5%, var(--card))" : "var(--card)",
          padding: "36px 24px",
          cursor: "pointer",
          textAlign: "center",
          transition: "border-color 0.2s, background 0.2s",
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 32, color: "var(--muted)", display: "block", marginBottom: 12 }}>upload</span>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 6 }}>
          Drag &amp; drop or click to upload
        </p>
        <p style={{ fontSize: 12, color: "var(--border)", fontFamily: "var(--font-mono)", letterSpacing: "0.06em" }}>
          JPG, PNG, MP4, MOV — max 50MB each
        </p>
        <input ref={inputRef} type="file" multiple accept="image/*,video/*" onChange={handleChange} style={{ display: "none" }} />
      </div>

      {files.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 2, marginTop: 2 }}>
          {files.map((f, i) => (
            <div key={i} style={{ position: "relative", aspectRatio: "4/3", background: "var(--card)", overflow: "hidden" }}>
              {f.type.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={URL.createObjectURL(f)}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover", filter: "grayscale(1) contrast(1.05)" }}
                />
              ) : (
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 4 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 24, color: "var(--muted)" }}>videocam</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Video</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => removeFile(i)}
                style={{ position: "absolute", top: 4, right: 4, width: 20, height: 20, borderRadius: "50%", background: "rgba(0,0,0,0.6)", border: "none", cursor: "pointer", color: "#fff", fontSize: 14, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                ×
              </button>
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "3px 6px", background: "rgba(0,0,0,0.55)" }}>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 7, color: "rgba(255,255,255,0.6)", letterSpacing: "0.06em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</p>
              </div>
            </div>
          ))}
          <div
            onClick={() => inputRef.current?.click()}
            style={{ aspectRatio: "4/3", background: "var(--card)", border: "1px dashed var(--border)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
          >
            <span style={{ fontSize: 24, color: "var(--border)" }}>+</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SubmitPage() {
  const [obstacles, setObstacles] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const toggleObstacle = (obs: string) =>
    setObstacles((prev) => prev.includes(obs) ? prev.filter((o) => o !== obs) : [...prev, obs]);

  if (submitted) {
    return (
      <div style={{ paddingTop: "5rem", paddingBottom: "6rem", maxWidth: 560 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
          <div style={{ width: 52, height: 52, borderRadius: "50%", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 24, color: "#fff" }}>check</span>
          </div>
          <div>
            <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1.5rem", fontWeight: 300, letterSpacing: "-0.02em", textTransform: "uppercase" }}>Submitted</h2>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 4 }}>We&apos;ll review within 48 hours</p>
          </div>
        </div>
        <p style={{ fontSize: 14, lineHeight: 1.7, color: "var(--muted)", marginBottom: 28 }}>
          Thanks for helping build the directory. We&apos;ll check the details and get it on the map.
        </p>
        <button
          onClick={() => setSubmitted(false)}
          style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", background: "none", border: "1px solid var(--border)", color: "var(--muted)", padding: "8px 18px", cursor: "pointer" }}
        >
          Submit another →
        </button>
      </div>
    );
  }

  return (
    <div style={{ paddingTop: "3rem", paddingBottom: "6rem", maxWidth: 640 }}>
      <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.2em", color: "var(--muted)", marginBottom: 12 }}>
        Found By Scout
      </p>
      <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(2rem, 5vw, 3.5rem)", fontWeight: 300, lineHeight: 0.95, letterSpacing: "-0.03em", textTransform: "uppercase", marginBottom: 14 }}>
        Submit a Park
      </h1>
      <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.6, marginBottom: 40 }}>
        Know a park that&apos;s not on the map? Fill this in and we&apos;ll review and add it within 48 hours.
      </p>
      <hr style={{ border: "none", borderTop: "1px solid var(--border)", marginBottom: 36 }} />

      <form onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }} style={{ display: "flex", flexDirection: "column", gap: 28 }}>

        <div>
          <FieldLabel required>Park Name</FieldLabel>
          <TextInput placeholder="e.g. Crystal Palace Skatepark" />
        </div>

        <div>
          <FieldLabel required>Address</FieldLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextInput placeholder="Street address" />
            <TextInput placeholder="Town / City" />
            <TextInput placeholder="Postcode" />
          </div>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--muted)", letterSpacing: "0.08em", marginTop: 6 }}>
            We use this to place it on the map — please be as precise as possible.
          </p>
        </div>

        <div>
          <FieldLabel>Description</FieldLabel>
          <TextArea rows={5} placeholder="Tell us about the park — what's there, what it's like to skate, any history worth knowing. Write it how you'd describe it to another skater." />
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--muted)", letterSpacing: "0.08em", marginTop: 6 }}>
            This becomes the editorial description on the park page.
          </p>
        </div>

        <div>
          <FieldLabel>Photos &amp; Videos</FieldLabel>
          <UploadZone files={files} setFiles={setFiles} />
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--muted)", letterSpacing: "0.08em", marginTop: 6 }}>
            Action shots, wide angles, features — anything that shows what the park is like.
          </p>
        </div>

        <div>
          <FieldLabel>Obstacles</FieldLabel>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {OBSTACLE_OPTIONS.map((obs) => (
              <button
                key={obs}
                type="button"
                onClick={() => toggleObstacle(obs)}
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  padding: "5px 12px",
                  border: `1px solid ${obstacles.includes(obs) ? "var(--accent)" : "var(--border)"}`,
                  color: obstacles.includes(obs) ? "var(--accent)" : "var(--muted)",
                  background: obstacles.includes(obs) ? "color-mix(in srgb, var(--accent) 8%, var(--card))" : "none",
                  cursor: "pointer",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  transition: "all 0.15s",
                }}
              >
                {obs}
              </button>
            ))}
          </div>
        </div>

        <div>
          <FieldLabel>Amenities</FieldLabel>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px" }}>
            {AMENITY_OPTIONS.map(([label, name]) => (
              <label key={name} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                <input type="checkbox" name={name} style={{ width: 14, height: 14, accentColor: "var(--accent)", cursor: "pointer" }} />
                <span style={{ fontSize: 13, color: "var(--foreground)" }}>{label}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <FieldLabel>Special Sessions</FieldLabel>
          <TextArea rows={2} placeholder="e.g. Women & non-binary nights every Tuesday, inline only Wednesdays…" />
        </div>

        <div>
          <FieldLabel>Your email or Instagram (optional)</FieldLabel>
          <TextInput placeholder="hello@example.com or @yourhandle" />
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--muted)", letterSpacing: "0.08em", marginTop: 6 }}>
            Only used if we need to follow up. Never published.
          </p>
        </div>

        <hr style={{ border: "none", borderTop: "1px solid var(--border)" }} />

        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <button
            type="submit"
            style={{ padding: "13px 36px", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", background: "var(--accent)", color: "#fff", border: "none", cursor: "pointer", fontFamily: "var(--font-body)" }}
          >
            Submit →
          </button>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--muted)", letterSpacing: "0.08em" }}>
            Reviewed within 48 hours
          </p>
        </div>

      </form>
    </div>
  );
}
