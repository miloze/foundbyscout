"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createServerClient } from "@/lib/supabase-server";

// ── Shared field components ─────────────────────────────────────────────────

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--muted)", marginBottom: 8 }}>
      {children}{required && <span style={{ color: "var(--accent)", marginLeft: 4 }}>*</span>}
    </label>
  );
}

function Input({ value, onChange, placeholder, type = "text" }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ width: "100%", background: "var(--card)", border: `1px solid ${focused ? "var(--accent)" : "var(--border)"}`, color: "var(--foreground)", fontFamily: "var(--font-body)", fontSize: 13, padding: "10px 12px", outline: "none", boxSizing: "border-box", transition: "border-color 0.15s" }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  );
}

function Textarea({ value, onChange, placeholder, rows = 3 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  const [focused, setFocused] = useState(false);
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      style={{ width: "100%", background: "var(--card)", border: `1px solid ${focused ? "var(--accent)" : "var(--border)"}`, color: "var(--foreground)", fontFamily: "var(--font-body)", fontSize: 13, padding: "10px 12px", outline: "none", resize: "vertical", boxSizing: "border-box", lineHeight: 1.6, transition: "border-color 0.15s" }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function NewParkPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    slug: "", name: "", postcode: "", borough: "", location: "",
    type: "Bowl", surface: "", surface_note: "",
    is_free: true, is_covered: false,
    opened: "", builder: "", managed_by: "",
    lat: "", lng: "",
    brief: "",
    description: "",
    hero_image: "", model_file: "",
    published: false,
  });

  function field(key: keyof typeof form) {
    return (v: string | boolean) => setForm(f => ({ ...f, [key]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const body = {
      ...form,
      lat: form.lat ? parseFloat(form.lat as string) : null,
      lng: form.lng ? parseFloat(form.lng as string) : null,
      description: form.description ? form.description.split("\n\n").filter(Boolean) : [],
      glance: [], transport: [], hours: [], facilities: [], gallery: [], spots: [], socials: [],
    };

    const res = await fetch("/api/admin/parks", {
      method: "POST",
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

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ marginBottom: 32 }}>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.2em", color: "var(--muted)", marginBottom: 8 }}>Parks</p>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "2rem", fontWeight: 300, textTransform: "uppercase", letterSpacing: "-0.02em" }}>Add a Park</h1>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 24 }}>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <FieldLabel required>Park Name</FieldLabel>
            <Input value={form.name} onChange={field("name")} placeholder="Crystal Palace Skatepark" />
          </div>
          <div>
            <FieldLabel required>Slug</FieldLabel>
            <Input value={form.slug} onChange={field("slug")} placeholder="crystal-palace" />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
          <div>
            <FieldLabel>Postcode</FieldLabel>
            <Input value={form.postcode} onChange={field("postcode")} placeholder="SE19 2BA" />
          </div>
          <div>
            <FieldLabel>Borough</FieldLabel>
            <Input value={form.borough} onChange={field("borough")} placeholder="Bromley" />
          </div>
          <div>
            <FieldLabel>Location</FieldLabel>
            <Input value={form.location} onChange={field("location")} placeholder="South London" />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <FieldLabel>Type</FieldLabel>
            <select
              value={form.type}
              onChange={e => field("type")(e.target.value)}
              style={{ width: "100%", background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)", fontSize: 13, padding: "10px 12px", outline: "none", fontFamily: "var(--font-body)" }}
            >
              {["Bowl", "Street", "Historic", "DIY", "Indoor", "Mixed"].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <FieldLabel>Surface</FieldLabel>
            <Input value={form.surface} onChange={field("surface")} placeholder="Smooth concrete" />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <FieldLabel>Latitude</FieldLabel>
            <Input value={form.lat as string} onChange={field("lat")} placeholder="51.4156" type="number" />
          </div>
          <div>
            <FieldLabel>Longitude</FieldLabel>
            <Input value={form.lng as string} onChange={field("lng")} placeholder="-0.0719" type="number" />
          </div>
        </div>

        <div style={{ display: "flex", gap: 24 }}>
          {(["is_free", "is_covered", "published"] as const).map(key => (
            <label key={key} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input type="checkbox" checked={form[key] as boolean} onChange={e => field(key)(e.target.checked)} style={{ accentColor: "var(--accent)", width: 14, height: 14 }} />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)" }}>
                {key === "is_free" ? "Free entry" : key === "is_covered" ? "Covered" : "Published"}
              </span>
            </label>
          ))}
        </div>

        <div>
          <FieldLabel>Brief (map card summary)</FieldLabel>
          <Input value={form.brief} onChange={field("brief")} placeholder="One-line description for the map card" />
        </div>

        <div>
          <FieldLabel>Description (separate paragraphs with a blank line)</FieldLabel>
          <Textarea value={form.description} onChange={field("description")} placeholder={"First paragraph.\n\nSecond paragraph."} rows={6} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <FieldLabel>Opened</FieldLabel>
            <Input value={form.opened} onChange={field("opened")} placeholder="March 2018" />
          </div>
          <div>
            <FieldLabel>Builder</FieldLabel>
            <Input value={form.builder} onChange={field("builder")} placeholder="Canvas Skateparks" />
          </div>
        </div>

        <div>
          <FieldLabel>Managed by</FieldLabel>
          <Input value={form.managed_by} onChange={field("managed_by")} placeholder="GLL / London Borough of Bromley" />
        </div>

        <div>
          <FieldLabel>Hero image path</FieldLabel>
          <Input value={form.hero_image} onChange={field("hero_image")} placeholder="/images/parks/crystal-palace/gallery-01.webp" />
        </div>

        <hr style={{ border: "none", borderTop: "1px solid var(--border)" }} />

        {error && <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--accent)" }}>{error}</p>}

        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <button
            type="submit"
            disabled={saving}
            style={{ padding: "12px 32px", background: "var(--accent)", color: "#fff", border: "none", fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}
          >
            {saving ? "Saving…" : "Save park →"}
          </button>
          <button type="button" onClick={() => router.back()} style={{ fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", background: "none", border: "1px solid var(--border)", padding: "12px 20px", cursor: "pointer" }}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
