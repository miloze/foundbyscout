"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Mix = { id: string; vol: string; region: string; curator: string; bio: string; mixcloud_url: string; published: boolean };

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--muted)", marginBottom: 8 }}>{children}</label>;
}
function Input({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [focused, setFocused] = useState(false);
  return (
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{ width: "100%", background: "var(--card)", border: `1px solid ${focused ? "var(--accent)" : "var(--border)"}`, color: "var(--foreground)", fontFamily: "var(--font-body)", fontSize: 13, padding: "10px 12px", outline: "none", boxSizing: "border-box" }}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} />
  );
}

export default function MusicAdmin({ mixes: initial }: { mixes: Mix[] }) {
  const router = useRouter();
  const [mixes, setMixes] = useState(initial);
  const [form, setForm] = useState({ vol: "", region: "", curator: "", bio: "", mixcloud_url: "", published: false });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function field(key: keyof typeof form) {
    return (v: string | boolean) => setForm(f => ({ ...f, [key]: v }));
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/admin/music", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (res.ok) {
      router.refresh();
      setForm({ vol: "", region: "", curator: "", bio: "", mixcloud_url: "", published: false });
    } else {
      const d = await res.json();
      setError(d.error ?? "Error");
    }
    setSaving(false);
  }

  async function togglePublished(mix: Mix) {
    await fetch(`/api/admin/music/${mix.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ published: !mix.published }) });
    setMixes(ms => ms.map(m => m.id === mix.id ? { ...m, published: !m.published } : m));
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this mix?")) return;
    await fetch(`/api/admin/music/${id}`, { method: "DELETE" });
    setMixes(ms => ms.filter(m => m.id !== id));
  }

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.2em", color: "var(--muted)", marginBottom: 8 }}>Admin</p>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "2rem", fontWeight: 300, textTransform: "uppercase", letterSpacing: "-0.02em" }}>Music</h1>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 48 }}>
        {mixes.map(mix => (
          <div key={mix.id} style={{ background: "var(--card)", border: "1px solid var(--border)", padding: "14px 20px", display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{mix.vol} — {mix.region}</p>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--muted)", letterSpacing: "0.08em" }}>Curated by {mix.curator}</p>
            </div>
            <button onClick={() => togglePublished(mix)} style={{ fontFamily: "var(--font-mono)", fontSize: 8, padding: "3px 8px", border: `1px solid ${mix.published ? "var(--accent)" : "var(--border)"}`, color: mix.published ? "var(--accent)" : "var(--muted)", background: "none", cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              {mix.published ? "Live" : "Draft"}
            </button>
            <button onClick={() => handleDelete(mix.id)} style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--muted)", background: "none", border: "none", cursor: "pointer" }}>Delete</button>
          </div>
        ))}
        {mixes.length === 0 && (
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", padding: "40px 24px", textAlign: "center" }}>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted)" }}>No mixes yet.</p>
          </div>
        )}
      </div>

      <hr style={{ border: "none", borderTop: "1px solid var(--border)", marginBottom: 32 }} />
      <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1.2rem", fontWeight: 300, textTransform: "uppercase", letterSpacing: "-0.01em", marginBottom: 24 }}>Add Mix</h2>

      <form onSubmit={handleAdd} style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 600 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
          <div><FieldLabel>Vol</FieldLabel><Input value={form.vol} onChange={field("vol")} placeholder="Vol. 002" /></div>
          <div><FieldLabel>Curator</FieldLabel><Input value={form.curator} onChange={field("curator")} placeholder="Jess" /></div>
          <div><FieldLabel>Region</FieldLabel><Input value={form.region} onChange={field("region")} placeholder="Bristol" /></div>
        </div>
        <div><FieldLabel>Bio</FieldLabel><Input value={form.bio} onChange={field("bio")} placeholder="Short bio" /></div>
        <div><FieldLabel>Mixcloud URL</FieldLabel><Input value={form.mixcloud_url} onChange={field("mixcloud_url")} placeholder="https://www.mixcloud.com/..." /></div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
          <input type="checkbox" checked={form.published} onChange={e => field("published")(e.target.checked)} style={{ accentColor: "var(--accent)", width: 14, height: 14 }} />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)" }}>Publish immediately</span>
        </label>
        {error && <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--accent)" }}>{error}</p>}
        <button type="submit" disabled={saving} style={{ padding: "11px 28px", background: "var(--accent)", color: "#fff", border: "none", fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", cursor: saving ? "not-allowed" : "pointer", alignSelf: "flex-start", opacity: saving ? 0.6 : 1 }}>
          {saving ? "Saving…" : "Add mix →"}
        </button>
      </form>
    </div>
  );
}
