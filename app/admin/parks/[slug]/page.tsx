"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ── Base UI components ─────────────────────────────────────────────────────
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

// ── Types ──────────────────────────────────────────────────────────────────
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

// ── Page ───────────────────────────────────────────────────────────────────
export default function EditParkPage() {
  const router = useRouter();
  const { slug } = useParams<{ slug: string }>();

  const [form,        setForm]        = useState<FormState>(EMPTY);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [deleting,    setDeleting]    = useState(false);
  const [error,       setError]       = useState("");
  const [uploadingSlot, setUploadingSlot] = useState<number | null>(null);
  const [slotUrls,      setSlotUrls]      = useState<string[]>(Array(8).fill(""));
  const [hoveredSlot,   setHoveredSlot]   = useState<number | null>(null);
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
        setLoading(false);
      })
      .catch(() => { setError("Failed to load park"); setLoading(false); });
  }, [slug]);

  const upd = <K extends keyof FormState>(key: K, v: FormState[K]) =>
    setForm(f => ({ ...f, [key]: v }));

  // ── Gallery slot helpers ──────────────────────────────────────────────────
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

  // ── Submit ────────────────────────────────────────────────────────────────
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

  if (loading) return <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted)" }}>Loading…</p>;

  const G2 = { display: "grid" as const, gridTemplateColumns: "1fr 1fr",    gap: 16 };
  const G3 = { display: "grid" as const, gridTemplateColumns: "1fr 1fr 1fr", gap: 16 };

  return (
    <div style={{ maxWidth: 820 }}>

      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.2em", color: "var(--muted)", marginBottom: 8 }}>Parks</p>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "2rem", fontWeight: 300, textTransform: "uppercase", letterSpacing: "-0.02em" }}>
          {form.name || slug}
        </h1>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--muted)", marginTop: 4 }}>/{slug}</p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 48 }}>

        {/* ── 1. BASIC INFO ──────────────────────────────────────────────── */}
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

        {/* ── 2. CONTENT ─────────────────────────────────────────────────── */}
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
                placeholder={"First paragraph — the park's character and what makes it special.\n\nSecond paragraph — history, builders, the community.\n\nThird paragraph — tips, tricks, what to expect on your first visit."} />
            </div>
          </div>
        </section>

        {/* ── 3. ADDRESS & TRANSPORT ──────────────────────────────────────── */}
        <section>
          <SectionHead>Address & getting there</SectionHead>
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

            {/* Address lines */}
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

            {/* Transport */}
            <div>
              <FieldLabel>Transport links</FieldLabel>
              <div style={{ display: "grid", gridTemplateColumns: "110px 1fr 1fr auto", gap: 8, marginBottom: 8 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--border)" }}>Type</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--border)" }}>Station / stop</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--border)" }}>Walking time / detail</span>
                <span />
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

        {/* ── 4. OPENING HOURS ───────────────────────────────────────────── */}
        <section>
          <SectionHead>Opening hours</SectionHead>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, marginBottom: 8 }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--border)" }}>Days</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--border)" }}>Hours</span>
            <span />
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

        {/* ── 5. AT A GLANCE ─────────────────────────────────────────────── */}
        <section>
          <SectionHead>At a glance</SectionHead>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--muted)", letterSpacing: "0.04em", marginBottom: 16, lineHeight: 1.9 }}>
            Icons from <a href="https://fonts.google.com/icons" target="_blank" rel="noopener" style={{ color: "var(--accent)" }}>Material Symbols</a>.
            Common names: <span style={{ color: "var(--foreground)" }}>skatepark · wb_sunny · water_drop · groups · timer · directions_walk · local_parking · wc · star</span>
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "140px 1fr 1fr auto auto", gap: 8, marginBottom: 8 }}>
            {["Icon name", "Value", "Label", "On", ""].map((h, i) => (
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

        {/* ── 6. FACTS ───────────────────────────────────────────────────── */}
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

        {/* ── 7. SOCIAL LINKS ────────────────────────────────────────────── */}
        <section>
          <SectionHead>Social links</SectionHead>
          <div style={{ display: "grid", gridTemplateColumns: "130px 1fr 160px auto", gap: 8, marginBottom: 8 }}>
            {["Platform", "URL", "Button label", ""].map((h, i) => (
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

        {/* ── 8. GALLERY ─────────────────────────────────────────────────── */}
        <section>
          <SectionHead>Gallery — editorial layout</SectionHead>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--muted)", letterSpacing: "0.04em", marginBottom: 20, lineHeight: 1.8 }}>
            Each slot maps directly to a position in the editorial grid on the park page. Click a slot to upload, or paste a URL below it. Uploads go to Supabase Storage → park-images/{slug}/
          </p>

          <input
            ref={slotFileInputRef} type="file" accept="image/*" style={{ display: "none" }}
            onChange={e => { handleSlotUpload(slotUploadIndexRef.current, e.target.files); e.target.value = ""; }}
          />

          {(() => {
            const slotMeta = [
              { label: "Full width · top",      aspect: "16/7"  },
              { label: "Left · row 2",          aspect: "3/2"   },
              { label: "Right · row 2",         aspect: "3/2"   },
              { label: "Left · row 3 (model)",  aspect: "1/1"   },
              { label: "Right · row 3",         aspect: "1/1"   },
              { label: "Full width · mid",      aspect: "21/9"  },
              { label: "Full width · lower",    aspect: "21/9"  },
              { label: "Full width · bottom",   aspect: "21/9"  },
            ];

            const renderSlot = (i: number) => {
              const { label, aspect } = slotMeta[i];
              const url = form.gallery_images[i] ?? "";
              const isHovered  = hoveredSlot === i;
              const isUploading = uploadingSlot === i;

              return (
                <div key={i}>
                  <div
                    style={{ position: "relative", aspectRatio: aspect, background: "var(--card)", overflow: "hidden", cursor: "pointer" }}
                    onMouseEnter={() => setHoveredSlot(i)}
                    onMouseLeave={() => setHoveredSlot(null)}
                    onClick={() => { slotUploadIndexRef.current = i; slotFileInputRef.current?.click(); }}
                  >
                    {url
                      ? <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> // eslint-disable-line @next/next/no-img-element
                      : (
                        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }}>
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--border)" }}>{label}</span>
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "var(--border)" }}>click to upload</span>
                        </div>
                      )
                    }

                    {/* Hover / uploading overlay */}
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

                    {/* Slot label badge */}
                    <div style={{ position: "absolute", bottom: 0, left: 0, padding: "3px 7px", background: "rgba(0,0,0,0.45)", fontFamily: "var(--font-mono)", fontSize: 7, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.55)", pointerEvents: "none" }}>
                      {label}
                    </div>

                    {/* Hero badge */}
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
              <div style={{ display: "flex", flexDirection: "column", gap: 10, background: "var(--background)" }}>
                {renderSlot(0)}
                <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 10 }}>
                  {renderSlot(1)}{renderSlot(2)}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {renderSlot(3)}{renderSlot(4)}
                </div>
                {renderSlot(5)}
                {renderSlot(6)}
                {renderSlot(7)}
              </div>
            );
          })()}
        </section>

        {/* ── 9. HERO & 3D MODEL ──────────────────────────────────────────── */}
        <section>
          <SectionHead>Hero image & 3D model</SectionHead>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 140px", gap: 16, alignItems: "end" }}>
              <div>
                <FieldLabel hint="set from gallery above or paste a URL">Hero image URL</FieldLabel>
                <Input value={form.hero_image} onChange={v => upd("hero_image", v)}
                  placeholder="https://… or /images/parks/crystal-palace/gallery-01.webp" />
              </div>
              {form.hero_image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.hero_image} alt="" style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", filter: "grayscale(1)", display: "block" }} />
              ) : (
                <div style={{ width: "100%", aspectRatio: "16/9", background: "var(--card)", border: "1px dashed var(--border)" }} />
              )}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 140px", gap: 16, alignItems: "end" }}>
              <div>
                <FieldLabel hint="directory / find-a-park grid (3:4 portrait, 720×960)">Thumbnail image URL</FieldLabel>
                <Input value={form.thumbnail} onChange={v => upd("thumbnail", v)}
                  placeholder="/images/parks/bloblands/thumb-01.webp" />
              </div>
              {form.thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.thumbnail} alt="" style={{ width: "100%", aspectRatio: "3/4", objectFit: "cover", filter: "grayscale(1)", display: "block" }} />
              ) : (
                <div style={{ width: "100%", aspectRatio: "3/4", background: "var(--card)", border: "1px dashed var(--border)" }} />
              )}
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

        {/* ── Actions ──────────────────────────────────────────────────────── */}
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
