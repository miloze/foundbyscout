"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type GalleryRowItem = { slot: number; ratio: string; type: "image" | "video" | "gif" | "glb"; glbFile?: string };
type GalleryColumn = { slots: GalleryRowItem[] };

const btnStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: "0.06em",
  padding: "3px 8px", border: "1px solid var(--border)",
  background: "var(--card)", color: "var(--muted)",
  cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap",
};

function SectionHead({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase",
      letterSpacing: "0.2em", color: "var(--muted)",
      borderBottom: "1px solid var(--border)", paddingBottom: 10, marginBottom: 20,
    }}>{children}</div>
  );
}

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <label style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--muted)", marginBottom: 8 }}>
      {children}
      {hint && <span style={{ marginLeft: 8, color: "var(--border)", textTransform: "none", letterSpacing: 0, fontSize: 8 }}>({hint})</span>}
    </label>
  );
}

function Input({ value, onChange, placeholder, readOnly }: {
  value: string; onChange?: (v: string) => void;
  placeholder?: string; readOnly?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <input type="text" value={value}
      onChange={e => onChange?.(e.target.value)}
      placeholder={placeholder} readOnly={readOnly}
      style={{
        width: "100%", background: readOnly ? "transparent" : "var(--card)",
        border: `1px solid ${focused ? "var(--accent)" : "var(--border)"}`,
        color: "var(--foreground)", fontFamily: "var(--font-body)", fontSize: 13,
        padding: "10px 12px", outline: "none", boxSizing: "border-box",
        transition: "border-color 0.15s", opacity: readOnly ? 0.5 : 1,
      }}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    />
  );
}

function Textarea({ value, onChange, placeholder, rows = 4 }: {
  value: string; onChange: (v: string) => void;
  placeholder?: string; rows?: number;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <textarea value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} rows={rows}
      style={{
        width: "100%", background: "var(--card)",
        border: `1px solid ${focused ? "var(--accent)" : "var(--border)"}`,
        color: "var(--foreground)", fontFamily: "var(--font-body)", fontSize: 13,
        padding: "10px 12px", outline: "none", resize: "vertical",
        boxSizing: "border-box", lineHeight: 1.6, transition: "border-color 0.15s",
      }}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    />
  );
}

function Select({ value, onChange, options }: {
  value: string; onChange: (v: string) => void; options: string[];
}) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={{
      width: "100%", background: "var(--card)", border: "1px solid var(--border)",
      color: "var(--foreground)", fontSize: 13, padding: "10px 12px",
      outline: "none", fontFamily: "var(--font-body)",
    }}>
      {options.map(o => <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
    </select>
  );
}

function AddRowBtn({ onClick, label = "+ Add row" }: { onClick: () => void; label?: string }) {
  return (
    <button type="button" onClick={onClick} style={{
      width: "100%", marginTop: 6, padding: "9px 16px",
      fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase",
      letterSpacing: "0.1em", color: "var(--accent)", background: "none",
      border: "1px dashed var(--accent)", cursor: "pointer",
    }}>{label}</button>
  );
}

function RemoveBtn({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={{
      flexShrink: 0, width: 30, height: 30, background: "none",
      border: "1px solid var(--border)", color: "var(--muted)",
      cursor: "pointer", fontSize: 16, display: "flex",
      alignItems: "center", justifyContent: "center",
    }}>×</button>
  );
}

type TransportItem = { type: string; name: string; detail: string };
type HoursItem     = { days: string; time: string };
type GlanceItem    = { icon: string; value: string; label: string; available: boolean };
type SocialItem    = { platform: string; url: string; label: string };

type FormState = {
  name: string; postcode: string; borough: string; location: string;
  type: string; surface: string; surface_note: string;
  is_free: boolean; is_covered: boolean; published: boolean; use_contour_model: boolean;
  sort_order: number;
  opened: string; builder: string; managed_by: string;
  lat: string; lng: string;
  address: string[];
  transport: TransportItem[];
  hours: HoursItem[];
  glance: GlanceItem[];
  socials: SocialItem[];
  gallery_images: string[];
  brief: string; description: string;
  hero_image: string; thumbnail: string; model_file: string;
  camera_pos: string; camera_target: string; model_rotation: string;
};

const EMPTY: FormState = {
  name: "", postcode: "", borough: "", location: "",
  type: "Bowl", surface: "", surface_note: "",
  is_free: true, is_covered: false, published: false, use_contour_model: false, sort_order: 0,
  opened: "", builder: "", managed_by: "",
  lat: "", lng: "",
  address: [], transport: [], hours: [], glance: [], socials: [], gallery_images: [],
  brief: "", description: "",
  hero_image: "", thumbnail: "", model_file: "",
  camera_pos: "", camera_target: "", model_rotation: "",
};

function numArrToStr(v: unknown): string {
  if (Array.isArray(v)) return v.join(", ");
  return "";
}

function strToNumArr(s: string): number[] | null {
  const parts = s.split(",").map(x => parseFloat(x.trim())).filter(n => !isNaN(n));
  return parts.length === 3 ? parts : null;
}

const RATIO_OPTIONS = [
  { label: "16:9", aspect: "16/9" },
  { label: "9:16", aspect: "9/16" },
  { label: "1:1",  aspect: "1/1"  },
  { label: "21:9", aspect: "21/9" },
  { label: "3:2",  aspect: "3/2"  },
  { label: "16:7", aspect: "16/7" },
];

export default function EditParkPage() {
  const router = useRouter();
  const { slug } = useParams<{ slug: string }>();

  const [form,          setForm]          = useState<FormState>(EMPTY);
  const [loading,       setLoading]       = useState(true);
  const [saving,        setSaving]        = useState(false);
  const [deleting,      setDeleting]      = useState(false);
  const [error,         setError]         = useState("");
  const [uploadingSlot, setUploadingSlot] = useState<number | null>(null);
  const [slotUrls,      setSlotUrls]      = useState<string[]>(Array(8).fill(""));
  const [hoveredSlot,   setHoveredSlot]   = useState<number | null>(null);
  const [slotRatios,    setSlotRatios]    = useState<string[]>(Array(8).fill("16/9"));
  const [slotOrder,     setSlotOrder]     = useState<number[]>([0,1,2,3,4,5,6,7]);
  const [dragSlot,      setDragSlot]      = useState<number | null>(null);

  const [galleryRows, setGalleryRows] = useState<GalleryColumn[][]>([])

  const slotFileInputRef   = useRef<HTMLInputElement>(null);
  const slotUploadIndexRef = useRef<number>(-1);

  useEffect(() => {
    fetch(`/api/admin/parks/${slug}`)
      .then(r => r.json())
      .then(park => {
        if (!park || park.error) { setError("Park not found"); setLoading(false); return; }
        setForm({
          name:              park.name ?? "",
          postcode:          park.postcode ?? "",
          borough:           park.borough ?? "",
          location:          park.location ?? "",
          type:              park.type ?? "Bowl",
          surface:           park.surface ?? "",
          surface_note:      park.surface_note ?? "",
          is_free:           park.is_free ?? true,
          is_covered:        park.is_covered ?? false,
          published:         park.published ?? false,
          sort_order:        park.sort_order ?? 0,
          use_contour_model: park.use_contour_model ?? false,
          opened:            park.opened ?? "",
          builder:           park.builder ?? "",
          managed_by:        park.managed_by ?? "",
          lat:  park.lat  != null ? String(park.lat)  : "",
          lng:  park.lng  != null ? String(park.lng)  : "",
          address:   Array.isArray(park.address)   ? park.address   : [],
          transport: Array.isArray(park.transport) ? park.transport : [],
          hours:     Array.isArray(park.hours)     ? park.hours     : [],
          glance:    Array.isArray(park.glance)    ? park.glance    : [],
          socials:   Array.isArray(park.socials)   ? park.socials   : [],
          gallery_images: Array.isArray(park.gallery_images) ? park.gallery_images : [],
          brief:       park.brief ?? "",
          description: Array.isArray(park.description)
            ? park.description.join("\n\n")
            : (park.description ?? ""),
          hero_image:     park.hero_image   ?? "",
          thumbnail:      park.thumbnail    ?? "",
          model_file:     park.model_file   ?? "",
          camera_pos:     numArrToStr(park.camera_pos),
          camera_target:  numArrToStr(park.camera_target),
          model_rotation: numArrToStr(park.model_rotation),
        });
        if (Array.isArray(park.slot_ratios)) setSlotRatios(park.slot_ratios);
        if (Array.isArray(park.slot_order))  setSlotOrder(park.slot_order);
        if (Array.isArray(park.gallery_rows)) {
          const normalize = (row: unknown[]) =>
            row.map((item: unknown) => {
              const i = item as Record<string, unknown>;
              return Array.isArray(i.slots) ? (i as GalleryColumn) : { slots: [i as GalleryRowItem] };
            });
          setGalleryRows((park.gallery_rows as unknown[][]).map(normalize));
        }
        setLoading(false);
      })
      .catch(() => { setError("Failed to load park"); setLoading(false); });
  }, [slug]);

  const upd = <K extends keyof FormState>(key: K, v: FormState[K]) =>
    setForm(f => ({ ...f, [key]: v }));

  function setSlotImage(index: number, url: string) {
    setForm(f => {
      const imgs = [...f.gallery_images];
      while (imgs.length <= index) imgs.push("");
      imgs[index] = url;
      return { ...f, gallery_images: imgs };
    });
  }

  function removeSlotImage(index: number) {
    setForm(f => {
      const imgs = [...f.gallery_images];
      imgs[index] = "";
      while (imgs.length > 0 && !imgs[imgs.length - 1]) imgs.pop();
      return { ...f, gallery_images: imgs };
    });
  }

  async function handleSlotUpload(slotIndex: number, files: FileList | null) {
    if (!files?.length) return;
    setUploadingSlot(slotIndex);
    setError("");
    const file = files[0];
    const path = `${slug}/${Date.now()}-${file.name}`;
    const { error: err } = await supabase.storage
      .from("park-images").upload(path, file, { upsert: true });
    if (err) { setError(`Upload failed: ${err.message}`); setUploadingSlot(null); return; }
    const { data } = supabase.storage.from("park-images").getPublicUrl(path);
    setSlotImage(slotIndex, data.publicUrl);
    setUploadingSlot(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const body = {
      ...form,
      lat: form.lat ? parseFloat(form.lat) : null,
      lng: form.lng ? parseFloat(form.lng) : null,
      description:    form.description ? form.description.split("\n\n").filter(Boolean) : [],
      camera_pos:     strToNumArr(form.camera_pos),
      camera_target:  strToNumArr(form.camera_target),
      model_rotation: strToNumArr(form.model_rotation),
      slot_ratios: slotRatios,
      slot_order:  slotOrder,
      gallery_rows: galleryRows,
    };

    const res = await fetch(`/api/admin/parks/${slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      router.push("/admin/parks");
    } else {
      const data = await res.json();
      setError(data.error ?? "Something went wrong");
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${form.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    const res = await fetch(`/api/admin/parks/${slug}`, { method: "DELETE" });
    if (res.ok) router.push("/admin/parks");
    else { const d = await res.json(); setError(d.error ?? "Delete failed"); setDeleting(false); }
  }

  function moveSlot(fromIdx: number, toIdx: number) {
    setSlotOrder(prev => {
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  }

  if (loading) return <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted)" }}>Loading…</p>;

  const G2 = { display: "grid" as const, gridTemplateColumns: "1fr 1fr",     gap: 16 };
  const G3 = { display: "grid" as const, gridTemplateColumns: "1fr 1fr 1fr", gap: 16 };

  const slotLabels = ["Slot 0","Slot 1","Slot 2","Slot 3","Slot 4","Slot 5","Slot 6","Slot 7"];

  const renderSlot = (orderIdx: number) => {
    const i           = slotOrder[orderIdx];
    const aspect      = slotRatios[i] ?? "16/9";
    const url         = form.gallery_images[i] ?? "";
    const isHovered   = hoveredSlot === i;
    const isUploading = uploadingSlot === i;
    const isDragging  = dragSlot === orderIdx;

    return (
      <div
        key={i}
        style={{ opacity: isDragging ? 0.4 : 1, transition: "opacity 0.15s", userSelect: "none" }}
      >
        {/* Drag handle + ratio selector row */}
        <div style={{ display: "flex", gap: 2, marginBottom: 4, alignItems: "center" }}
          onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
          onDrop={e => { e.preventDefault(); if (dragSlot !== null && dragSlot !== orderIdx) moveSlot(dragSlot, orderIdx); setDragSlot(null); }}
        >
          {/* Grip handle — this is the drag target */}
          <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
  <button
    type="button"
    onClick={() => { if (orderIdx > 0) moveSlot(orderIdx, orderIdx - 1); }}
    disabled={orderIdx === 0}
    style={{ padding: "3px 7px", border: "1px solid var(--border)", background: "var(--card)", color: orderIdx === 0 ? "var(--border)" : "var(--muted)", fontFamily: "var(--font-mono)", fontSize: 11, cursor: orderIdx === 0 ? "default" : "pointer" }}
  >↑</button>
  <button
    type="button"
    onClick={() => { if (orderIdx < slotOrder.length - 1) moveSlot(orderIdx, orderIdx + 1); }}
    disabled={orderIdx === slotOrder.length - 1}
    style={{ padding: "3px 7px", border: "1px solid var(--border)", background: "var(--card)", color: orderIdx === slotOrder.length - 1 ? "var(--border)" : "var(--muted)", fontFamily: "var(--font-mono)", fontSize: 11, cursor: orderIdx === slotOrder.length - 1 ? "default" : "pointer" }}
  >↓</button>
  <button
  type="button"
  onClick={() => {
    setSlotOrder(prev => prev.filter((_, idx) => idx !== orderIdx));
    setSlotRatios(prev => prev.filter((_, idx) => idx !== i));
    setForm(f => ({
      ...f,
      gallery_images: f.gallery_images.filter((_, idx) => idx !== i),
    }));
  }}
  style={{ padding: "3px 7px", border: "1px solid var(--border)", background: "var(--card)", color: "var(--muted)", fontFamily: "var(--font-mono)", fontSize: 11, cursor: "pointer" }}
>×</button>
</div>

          <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginLeft: 4, marginRight: 6 }}>
            {orderIdx + 1}
          </span>

          {RATIO_OPTIONS.map(r => (
            <button
              key={r.label}
              type="button"
              onClick={() => setSlotRatios(prev => { const n = [...prev]; n[i] = r.aspect; return n; })}
              style={{
                fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: "0.06em",
                padding: "3px 8px", border: "1px solid var(--border)",
                background: aspect === r.aspect ? "var(--foreground)" : "var(--card)",
                color: aspect === r.aspect ? "var(--background)" : "var(--muted)",
                cursor: "pointer", transition: "all 0.15s",
              }}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Drop zone above */}
        <div
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); if (dragSlot !== null && dragSlot !== orderIdx) moveSlot(dragSlot, orderIdx); setDragSlot(null); }}
          style={{ height: dragSlot !== null && dragSlot !== orderIdx ? 6 : 0, background: "var(--accent)", transition: "height 0.15s", marginBottom: dragSlot !== null && dragSlot !== orderIdx ? 4 : 0 }}
        />

        {/* Slot image */}
        <div
          style={{ position: "relative", aspectRatio: aspect, background: "var(--card)", overflow: "hidden", cursor: "pointer" }}
          onMouseEnter={() => setHoveredSlot(i)}
          onMouseLeave={() => setHoveredSlot(null)}
          onClick={() => { slotUploadIndexRef.current = i; slotFileInputRef.current?.click(); }}
        >
          {url
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : (
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--border)" }}>{slotLabels[i]}</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "var(--border)" }}>click to upload</span>
              </div>
            )
          }

          {(isHovered || isUploading) && (
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              {isUploading
                ? <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "#fff" }}>Uploading…</span>
                : <>
                    <button type="button"
                      onClick={e => { e.stopPropagation(); slotUploadIndexRef.current = i; slotFileInputRef.current?.click(); }}
                      style={{ fontFamily: "var(--font-mono)", fontSize: 8, textTransform: "uppercase", letterSpacing: "0.08em", background: "var(--accent)", border: "none", color: "#fff", padding: "5px 10px", cursor: "pointer" }}>
                      {url ? "Replace" : "Upload"}
                    </button>
                    {url && (
                      <>
                        <button type="button"
                          onClick={e => { e.stopPropagation(); setForm(f => ({ ...f, hero_image: url })); }}
                          style={{ fontFamily: "var(--font-mono)", fontSize: 8, textTransform: "uppercase", letterSpacing: "0.08em", background: "#333", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", padding: "5px 10px", cursor: "pointer" }}>
                          Set hero
                        </button>
                        <button type="button"
                          onClick={e => { e.stopPropagation(); removeSlotImage(i); }}
                          style={{ fontFamily: "var(--font-mono)", fontSize: 8, textTransform: "uppercase", letterSpacing: "0.08em", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", padding: "5px 10px", cursor: "pointer" }}>
                          Remove
                        </button>
                      </>
                    )}
                  </>
              }
            </div>
          )}

          <div style={{ position: "absolute", bottom: 0, left: 0, padding: "3px 7px", background: "rgba(0,0,0,0.45)", fontFamily: "var(--font-mono)", fontSize: 7, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.55)", pointerEvents: "none" }}>
            {slotLabels[i]} · {RATIO_OPTIONS.find(r => r.aspect === aspect)?.label}
          </div>

          {form.hero_image === url && url && (
            <div style={{ position: "absolute", top: 6, left: 6, background: "var(--accent)", fontFamily: "var(--font-mono)", fontSize: 7, textTransform: "uppercase", letterSpacing: "0.06em", color: "#fff", padding: "3px 6px" }}>Hero</div>
          )}
        </div>

        {/* URL paste row */}
        <div style={{ display: "flex", gap: 2, marginTop: 2 }}>
          <input
            type="text"
            value={slotUrls[i] ?? ""}
            onChange={e => setSlotUrls(prev => { const n = [...prev]; n[i] = e.target.value; return n; })}
            onKeyDown={e => {
              if (e.key !== "Enter") return;
              const u = slotUrls[i]?.trim();
              if (u) { setSlotImage(i, u); setSlotUrls(prev => { const n = [...prev]; n[i] = ""; return n; }); }
            }}
            placeholder={`Slot ${i} — paste URL and press → or Enter`}
            style={{ flex: 1, background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)", fontFamily: "var(--font-mono)", fontSize: 9, padding: "6px 8px", outline: "none" }}
          />
          <button type="button"
            onClick={() => {
              const u = slotUrls[i]?.trim();
              if (u) { setSlotImage(i, u); setSlotUrls(prev => { const n = [...prev]; n[i] = ""; return n; }); }
            }}
            style={{ flexShrink: 0, padding: "6px 12px", background: "var(--card)", border: "1px solid var(--border)", color: "var(--accent)", fontFamily: "var(--font-mono)", fontSize: 12, cursor: "pointer" }}>
            →
          </button>
        </div>
      </div>
    );
  };
  
  return (
    <div style={{ maxWidth: 820 }}>

      <div style={{ marginBottom: 40 }}>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.2em", color: "var(--muted)", marginBottom: 8 }}>Parks</p>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "2rem", fontWeight: 300, textTransform: "uppercase", letterSpacing: "-0.02em" }}>
          {form.name || slug}
        </h1>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--muted)", marginTop: 4 }}>/{slug}</p>
      </div>

      <form onSubmit={handleSubmit} onKeyDown={e => { if (e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT") e.preventDefault(); }} style={{ display: "flex", flexDirection: "column", gap: 48 }}>

        {/* 1. BASIC INFO */}
        <section>
          <SectionHead>Basic info</SectionHead>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={G2}>
              <div>
                <FieldLabel>Park name *</FieldLabel>
                <Input value={form.name} onChange={v => upd("name", v)} placeholder="Crystal Palace Skatepark" />
              </div>
              <div>
                <FieldLabel>Slug (read-only)</FieldLabel>
                <Input value={slug} readOnly />
              </div>
            </div>
            <div style={G3}>
              <div>
                <FieldLabel>Postcode</FieldLabel>
                <Input value={form.postcode} onChange={v => upd("postcode", v)} placeholder="SE19 2BA" />
              </div>
              <div>
                <FieldLabel>Borough</FieldLabel>
                <Input value={form.borough} onChange={v => upd("borough", v)} placeholder="Bromley" />
              </div>
              <div>
                <FieldLabel>Location label</FieldLabel>
                <Input value={form.location} onChange={v => upd("location", v)} placeholder="South London" />
              </div>
            </div>
            <div style={G3}>
              <div>
                <FieldLabel>Type</FieldLabel>
                <Select value={form.type} onChange={v => upd("type", v)}
                  options={["Bowl", "Street", "Transition", "DIY", "Indoor", "Mixed"]} />
              </div>
              <div>
                <FieldLabel>Surface</FieldLabel>
                <Input value={form.surface} onChange={v => upd("surface", v)} placeholder="Smooth concrete" />
              </div>
              <div>
                <FieldLabel>Surface note</FieldLabel>
                <Input value={form.surface_note} onChange={v => upd("surface_note", v)} placeholder="Original 1978 pour, restored 2023" />
              </div>
            </div>
            <div style={G2}>
              <div>
                <FieldLabel>Latitude</FieldLabel>
                <Input value={form.lat} onChange={v => upd("lat", v)} placeholder="51.4156" />
              </div>
              <div>
                <FieldLabel>Longitude</FieldLabel>
                <Input value={form.lng} onChange={v => upd("lng", v)} placeholder="-0.0719" />
              </div>
            </div>
            <div style={{ display: "flex", gap: 28, flexWrap: "wrap", alignItems: "center" }}>
              {([
                ["is_free",           "Free entry"],
                ["is_covered",        "Covered / indoor"],
                ["published",         "Published"],
                ["use_contour_model", "Contour (topo) model"],
              ] as [keyof FormState, string][]).map(([key, label]) => (
                <label key={key} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input type="checkbox" checked={form[key] as boolean}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))}
                    style={{ accentColor: "var(--accent)", width: 14, height: 14 }} />
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)" }}>{label}</span>
                </label>
              ))}
              <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)" }}>Homepage order</span>
                <input type="number" min={0} value={form.sort_order}
                  onChange={e => setForm(f => ({ ...f, sort_order: +e.target.value }))}
                  style={{ width: 56, background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)", fontFamily: "var(--font-mono)", fontSize: 12, padding: "6px 8px", outline: "none", textAlign: "center" }} />
              </label>
            </div>
          </div>
        </section>

        {/* 2. CONTENT */}
        <section>
          <SectionHead>Content</SectionHead>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <FieldLabel hint="shown on map cards and in the directory">Brief — one line</FieldLabel>
              <Input value={form.brief} onChange={v => upd("brief", v)}
                placeholder="South London's concrete icon. World-class cloverleaf pool, built for riders, by riders." />
            </div>
            <div>
              <FieldLabel hint="separate paragraphs with a blank line">Description</FieldLabel>
              <Textarea value={form.description} onChange={v => upd("description", v)} rows={8}
                placeholder={"First paragraph.\n\nSecond paragraph.\n\nThird paragraph."} />
            </div>
          </div>
        </section>

        {/* 3. ADDRESS & TRANSPORT */}
        <section>
          <SectionHead>Address & getting there</SectionHead>
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div>
              <FieldLabel hint="one row per line — street, area, city">Address</FieldLabel>
              {form.address.map((line, i) => (
                <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                  <Input value={line}
                    onChange={v => { const a = [...form.address]; a[i] = v; upd("address", a); }}
                    placeholder={["Ledrington Rd", "Crystal Palace", "London"][i] ?? "…"} />
                  <RemoveBtn onClick={() => upd("address", form.address.filter((_, j) => j !== i))} />
                </div>
              ))}
              <AddRowBtn onClick={() => upd("address", [...form.address, ""])} label="+ Add address line" />
            </div>
            <div>
              <FieldLabel>Transport links</FieldLabel>
              <div style={{ display: "grid", gridTemplateColumns: "110px 1fr 1fr auto", gap: 8, marginBottom: 8 }}>
                {["Type","Station / stop","Walking time / detail",""].map((h, i) => (
                  <span key={i} style={{ fontFamily: "var(--font-mono)", fontSize: 8, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--border)" }}>{h}</span>
                ))}
              </div>
              {form.transport.map((t, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "110px 1fr 1fr auto", gap: 8, marginBottom: 6, alignItems: "center" }}>
                  <Select value={t.type}
                    onChange={v => { const a = [...form.transport]; a[i] = { ...a[i], type: v }; upd("transport", a); }}
                    options={["tube", "rail", "bus", "tram"]} />
                  <Input value={t.name} placeholder="Crystal Palace (Overground)"
                    onChange={v => { const a = [...form.transport]; a[i] = { ...a[i], name: v }; upd("transport", a); }} />
                  <Input value={t.detail} placeholder="8 min walk"
                    onChange={v => { const a = [...form.transport]; a[i] = { ...a[i], detail: v }; upd("transport", a); }} />
                  <RemoveBtn onClick={() => upd("transport", form.transport.filter((_, j) => j !== i))} />
                </div>
              ))}
              <AddRowBtn onClick={() => upd("transport", [...form.transport, { type: "tube", name: "", detail: "" }])} />
            </div>
          </div>
        </section>

        {/* 4. OPENING HOURS */}
        <section>
          <SectionHead>Opening hours</SectionHead>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, marginBottom: 8 }}>
            {["Days","Hours",""].map((h, i) => (
              <span key={i} style={{ fontFamily: "var(--font-mono)", fontSize: 8, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--border)" }}>{h}</span>
            ))}
          </div>
          {form.hours.map((row, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, marginBottom: 6, alignItems: "center" }}>
              <Input value={row.days} placeholder="Mon – Fri"
                onChange={v => { const a = [...form.hours]; a[i] = { ...a[i], days: v }; upd("hours", a); }} />
              <Input value={row.time} placeholder="9:00 – 21:00"
                onChange={v => { const a = [...form.hours]; a[i] = { ...a[i], time: v }; upd("hours", a); }} />
              <RemoveBtn onClick={() => upd("hours", form.hours.filter((_, j) => j !== i))} />
            </div>
          ))}
          <AddRowBtn onClick={() => upd("hours", [...form.hours, { days: "", time: "" }])} />
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--muted)", marginTop: 8, letterSpacing: "0.04em" }}>
            Leave empty if always open or unknown.
          </p>
        </section>

        {/* 5. AT A GLANCE */}
        <section>
          <SectionHead>At a glance</SectionHead>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--muted)", letterSpacing: "0.04em", marginBottom: 16, lineHeight: 1.9 }}>
            Icons from <a href="https://fonts.google.com/icons" target="_blank" rel="noopener" style={{ color: "var(--accent)" }}>Material Symbols</a>.
            Common: <span style={{ color: "var(--foreground)" }}>skatepark · wb_sunny · water_drop · groups · timer · directions_walk · local_parking · wc · star</span>
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "140px 1fr 1fr auto auto", gap: 8, marginBottom: 8 }}>
            {["Icon name","Value","Label","On",""].map((h, i) => (
              <span key={i} style={{ fontFamily: "var(--font-mono)", fontSize: 8, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--border)" }}>{h}</span>
            ))}
          </div>
          {form.glance.map((g, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "140px 1fr 1fr auto auto", gap: 8, marginBottom: 6, alignItems: "center" }}>
              <Input value={g.icon} placeholder="skatepark"
                onChange={v => { const a = [...form.glance]; a[i] = { ...a[i], icon: v }; upd("glance", a); }} />
              <Input value={g.value} placeholder="Free entry"
                onChange={v => { const a = [...form.glance]; a[i] = { ...a[i], value: v }; upd("glance", a); }} />
              <Input value={g.label} placeholder="Admission"
                onChange={v => { const a = [...form.glance]; a[i] = { ...a[i], label: v }; upd("glance", a); }} />
              <label style={{ display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <input type="checkbox" checked={g.available}
                  onChange={e => { const a = [...form.glance]; a[i] = { ...a[i], available: e.target.checked }; upd("glance", a); }}
                  style={{ accentColor: "var(--accent)", width: 14, height: 14 }} />
              </label>
              <RemoveBtn onClick={() => upd("glance", form.glance.filter((_, j) => j !== i))} />
            </div>
          ))}
          <AddRowBtn onClick={() => upd("glance", [...form.glance, { icon: "", value: "", label: "", available: true }])} />
        </section>

        {/* 6. FACTS */}
        <section>
          <SectionHead>Facts</SectionHead>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={G2}>
              <div>
                <FieldLabel>Opened</FieldLabel>
                <Input value={form.opened} onChange={v => upd("opened", v)} placeholder="1978" />
              </div>
              <div>
                <FieldLabel>Builder</FieldLabel>
                <Input value={form.builder} onChange={v => upd("builder", v)} placeholder="Canvas Skateparks" />
              </div>
            </div>
            <div>
              <FieldLabel>Managed by</FieldLabel>
              <Input value={form.managed_by} onChange={v => upd("managed_by", v)} placeholder="GLL / London Borough of Bromley" />
            </div>
          </div>
        </section>

        {/* 7. SOCIAL LINKS */}
        <section>
          <SectionHead>Social links</SectionHead>
          <div style={{ display: "grid", gridTemplateColumns: "130px 1fr 160px auto", gap: 8, marginBottom: 8 }}>
            {["Platform","URL","Button label",""].map((h, i) => (
              <span key={i} style={{ fontFamily: "var(--font-mono)", fontSize: 8, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--border)" }}>{h}</span>
            ))}
          </div>
          {form.socials.map((s, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "130px 1fr 160px auto", gap: 8, marginBottom: 6, alignItems: "center" }}>
              <Select value={s.platform}
                onChange={v => { const a = [...form.socials]; a[i] = { ...a[i], platform: v }; upd("socials", a); }}
                options={["instagram", "facebook", "youtube", "tiktok", "website"]} />
              <Input value={s.url} placeholder="https://instagram.com/…"
                onChange={v => { const a = [...form.socials]; a[i] = { ...a[i], url: v }; upd("socials", a); }} />
              <Input value={s.label} placeholder="Instagram (optional)"
                onChange={v => { const a = [...form.socials]; a[i] = { ...a[i], label: v }; upd("socials", a); }} />
              <RemoveBtn onClick={() => upd("socials", form.socials.filter((_, j) => j !== i))} />
            </div>
          ))}
          <AddRowBtn onClick={() => upd("socials", [...form.socials, { platform: "instagram", url: "", label: "" }])} />
        </section>

        {/* 8. GALLERY */}
<section>
  <SectionHead>Gallery — editorial layout</SectionHead>
  <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--muted)", letterSpacing: "0.04em", marginBottom: 20, lineHeight: 1.8 }}>
    Build rows of 1–3 columns. Each column can stack multiple slots vertically.
  </p>

  <input
    ref={slotFileInputRef} type="file" accept="image/*,video/*" style={{ display: "none" }}
    onChange={e => { handleSlotUpload(slotUploadIndexRef.current, e.target.files); e.target.value = ""; }}
  />

  <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 6 }}>
    {galleryRows.map((row, rowIdx) => (
      <div key={rowIdx} style={{ border: "1px solid var(--border)", background: "var(--card)" }}>

        {/* Row header */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderBottom: "1px solid var(--border)" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", flex: 1 }}>
            Row {rowIdx + 1} · {row.length === 1 ? "full width" : `${row.length} cols`}
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
          {row.length < 3 && (
            <button type="button" onClick={() => {
              setGalleryRows(prev => {
                const next = [...prev];
                const nextSlot = Math.max(...next.flatMap(r => r.flatMap(col => col.slots.map(s => s.slot))), -1) + 1;
                next[rowIdx] = [...next[rowIdx], { slots: [{ slot: nextSlot, ratio: "1/1", type: "image" as const }] }];
                return next;
              });
            }} style={{ ...btnStyle }}>+ col</button>
          )}
          <button type="button" onClick={() => {
            setGalleryRows(prev => prev.filter((_, i) => i !== rowIdx));
          }} style={{ ...btnStyle, color: "var(--accent)" }}>× row</button>
        </div>

        {/* Columns */}
        <div style={{ display: "flex", gap: 2, padding: 10 }}>
          {row.map((col, colIdx) => (
            <div key={colIdx} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
              {col.slots.map((slot, slotIdx) => {
                const url = form.gallery_images[slot.slot] ?? "";
                return (
                  <div key={slotIdx} style={{ display: "flex", flexDirection: "column", gap: 6, ...(slotIdx > 0 ? { borderTop: "1px dashed var(--border)", paddingTop: 8 } : {}) }}>

                    {/* Type + ratio selectors */}
                    <div style={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                      {(["image","video","gif","glb"] as const).map(t => (
                        <button key={t} type="button"
                          onClick={() => setGalleryRows(prev => {
                            const next = prev.map(r => r.map(c => ({ ...c, slots: [...c.slots] })));
                            next[rowIdx][colIdx].slots[slotIdx] = { ...slot, type: t };
                            return next;
                          })}
                          style={{ ...btnStyle, background: slot.type === t ? "var(--foreground)" : "var(--card)", color: slot.type === t ? "var(--background)" : "var(--muted)" }}
                        >{t}</button>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
                      {RATIO_OPTIONS.map(r => (
                        <button key={r.label} type="button"
                          onClick={() => setGalleryRows(prev => {
                            const next = prev.map(r => r.map(c => ({ ...c, slots: [...c.slots] })));
                            next[rowIdx][colIdx].slots[slotIdx] = { ...slot, ratio: r.aspect };
                            return next;
                          })}
                          style={{ ...btnStyle, background: slot.ratio === r.aspect ? "var(--foreground)" : "var(--card)", color: slot.ratio === r.aspect ? "var(--background)" : "var(--muted)" }}
                        >{r.label}</button>
                      ))}
                      <input
                        type="text"
                        defaultValue={RATIO_OPTIONS.some(r => r.aspect === slot.ratio) ? "" : slot.ratio}
                        placeholder="w/h"
                        onBlur={e => {
                          const v = e.target.value.trim();
                          if (/^\d+\/\d+$/.test(v)) setGalleryRows(prev => {
                            const next = prev.map(r => r.map(c => ({ ...c, slots: [...c.slots] })));
                            next[rowIdx][colIdx].slots[slotIdx] = { ...slot, ratio: v };
                            return next;
                          });
                        }}
                        style={{ ...btnStyle, width: 52, padding: "3px 5px", color: "var(--foreground)" }}
                      />
                    </div>

                    {/* Preview */}
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
                            : <img src={url} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} /> // eslint-disable-line @next/next/no-img-element
                          : <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}>
                              <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "var(--border)", textTransform: "uppercase", letterSpacing: "0.1em" }}>click to upload</span>
                            </div>
                      }
                    </div>

                    {/* GLB file path input */}
                    {slot.type === "glb" && (
                      <input
                        type="text"
                        value={slot.glbFile ?? ""}
                        onChange={e => setGalleryRows(prev => {
                          const next = prev.map(r => r.map(c => ({ ...c, slots: [...c.slots] })));
                          next[rowIdx][colIdx].slots[slotIdx] = { ...slot, glbFile: e.target.value };
                          return next;
                        })}
                        placeholder="/images/parks/crystal-palace/model.glb"
                        style={{ width: "100%", background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)", fontFamily: "var(--font-mono)", fontSize: 8, padding: "5px 7px", outline: "none", boxSizing: "border-box" }}
                      />
                    )}

                    {/* URL input */}
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

                    {/* Set hero / remove image */}
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

                    {/* Remove slot from column (only when column has multiple slots) */}
                    {col.slots.length > 1 && (
                      <button type="button"
                        onClick={() => setGalleryRows(prev => {
                          const next = prev.map(r => r.map(c => ({ ...c, slots: [...c.slots] })));
                          next[rowIdx][colIdx].slots = next[rowIdx][colIdx].slots.filter((_, i) => i !== slotIdx);
                          return next;
                        })}
                        style={{ ...btnStyle, color: "var(--accent)", width: "100%" }}>× slot</button>
                    )}
                  </div>
                );
              })}

              {/* Add stacked slot within this column */}
              <button type="button"
                onClick={() => setGalleryRows(prev => {
                  const next = prev.map(r => r.map(c => ({ ...c, slots: [...c.slots] })));
                  const nextSlot = Math.max(...next.flatMap(r => r.flatMap(c => c.slots.map(s => s.slot))), -1) + 1;
                  next[rowIdx][colIdx].slots = [...next[rowIdx][colIdx].slots, { slot: nextSlot, ratio: "1/1", type: "image" as const }];
                  return next;
                })}
                style={{ ...btnStyle, width: "100%", textAlign: "center" }}>+ stack</button>

              {/* Remove this column (only when row has multiple columns) */}
              {row.length > 1 && (
                <button type="button"
                  onClick={() => setGalleryRows(prev => {
                    const next = prev.map(r => [...r]);
                    next[rowIdx] = next[rowIdx].filter((_, i) => i !== colIdx);
                    return next;
                  })}
                  style={{ ...btnStyle, color: "var(--accent)", width: "100%" }}>× col</button>
              )}
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>

  <button type="button"
    onClick={() => {
      const nextSlot = galleryRows.length === 0 ? 0 : Math.max(...galleryRows.flatMap(r => r.flatMap(col => col.slots.map(s => s.slot))), -1) + 1;
      setGalleryRows(prev => [...prev, [{ slots: [{ slot: nextSlot, ratio: "16/9", type: "image" as const }] }]]);
    }}
    style={{ width: "100%", padding: "9px 16px", fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--accent)", background: "none", border: "1px dashed var(--accent)", cursor: "pointer" }}
  >+ Add row</button>
</section>

        {/* 9. HERO & 3D MODEL */}
        <section>
          <SectionHead>Hero image & 3D model</SectionHead>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 140px", gap: 16, alignItems: "end" }}>
              <div>
                <FieldLabel hint="set from gallery above or paste a URL">Hero image URL</FieldLabel>
                <Input value={form.hero_image} onChange={v => upd("hero_image", v)}
                  placeholder="https://… or /images/parks/crystal-palace/hero.webp" />
              </div>
              {form.hero_image
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={form.hero_image} alt="" style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", filter: "grayscale(1)", display: "block" }} />
                : <div style={{ width: "100%", aspectRatio: "16/9", background: "var(--card)", border: "1px dashed var(--border)" }} />
              }
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 140px", gap: 16, alignItems: "end" }}>
              <div>
                <FieldLabel hint="directory / find-a-park grid (3:4 portrait)">Thumbnail image URL</FieldLabel>
                <Input value={form.thumbnail} onChange={v => upd("thumbnail", v)}
                  placeholder="/images/parks/crystal-palace/thumb.webp" />
              </div>
              {form.thumbnail
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={form.thumbnail} alt="" style={{ width: "100%", aspectRatio: "3/4", objectFit: "cover", filter: "grayscale(1)", display: "block" }} />
                : <div style={{ width: "100%", aspectRatio: "3/4", background: "var(--card)", border: "1px dashed var(--border)" }} />
              }
            </div>
            <div>
              <FieldLabel hint="/images/parks/{slug}/model.glb">3D model file path</FieldLabel>
              <Input value={form.model_file} onChange={v => upd("model_file", v)}
                placeholder="/images/parks/crystal-palace/model.glb" />
            </div>
            <div style={G3}>
              <div>
                <FieldLabel hint="x, y, z from ?debug=1 on park page">Camera position</FieldLabel>
                <Input value={form.camera_pos} onChange={v => upd("camera_pos", v)} placeholder="-37.9, 50, 30" />
              </div>
              <div>
                <FieldLabel hint="x, y, z">Camera target</FieldLabel>
                <Input value={form.camera_target} onChange={v => upd("camera_target", v)} placeholder="0, 2, 0" />
              </div>
              <div>
                <FieldLabel hint="x, y, z in radians">Model rotation</FieldLabel>
                <Input value={form.model_rotation} onChange={v => upd("model_rotation", v)} placeholder="-1.5708, 0, 0" />
              </div>
            </div>
          </div>
        </section>

        <hr style={{ border: "none", borderTop: "1px solid var(--border)" }} />

        {error && (
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--accent)" }}>{error}</p>
        )}

        <div style={{ display: "flex", gap: 16, alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <button type="submit" disabled={saving} style={{
              padding: "12px 32px", background: "var(--accent)", color: "#fff", border: "none",
              fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 700, textTransform: "uppercase",
              letterSpacing: "0.12em", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1,
            }}>
              {saving ? "Saving…" : "Save changes →"}
            </button>
            <button type="button" onClick={() => router.back()} style={{
              fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em",
              color: "var(--muted)", background: "none", border: "1px solid var(--border)",
              padding: "12px 20px", cursor: "pointer",
            }}>Cancel</button>
          </div>
          <button type="button" onClick={handleDelete} disabled={deleting} style={{
            fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em",
            color: "var(--accent)", background: "none", border: "1px solid var(--accent)",
            padding: "12px 20px", cursor: deleting ? "not-allowed" : "pointer", opacity: deleting ? 0.6 : 1,
          }}>
            {deleting ? "Deleting…" : "Delete park"}
          </button>
        </div>

      </form>
    </div>
  );
}