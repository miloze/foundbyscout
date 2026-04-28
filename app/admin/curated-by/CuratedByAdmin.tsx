"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Issue = { id: string; slug: string; vol: string; curator: string; location: string; bio: string; published: boolean };

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

export default function CuratedByAdmin({ issues: initial }: { issues: Issue[] }) {
  const router = useRouter();
  const [issues, setIssues] = useState(initial);
  const [form, setForm] = useState({ slug: "", vol: "", curator: "", location: "", bio: "", published: false });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function field(key: keyof typeof form) {
    return (v: string | boolean) => setForm(f => ({ ...f, [key]: v }));
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/admin/curated-by", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (res.ok) {
      router.refresh();
      setForm({ slug: "", vol: "", curator: "", location: "", bio: "", published: false });
    } else {
      const d = await res.json();
      setError(d.error ?? "Error");
    }
    setSaving(false);
  }

  async function togglePublished(issue: Issue) {
    await fetch(`/api/admin/curated-by/${issue.slug}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ published: !issue.published }) });
    setIssues(is => is.map(i => i.slug === issue.slug ? { ...i, published: !i.published } : i));
  }

  async function handleDelete(slug: string) {
    if (!confirm("Delete this issue?")) return;
    await fetch(`/api/admin/curated-by/${slug}`, { method: "DELETE" });
    setIssues(is => is.filter(i => i.slug !== slug));
  }

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.2em", color: "var(--muted)", marginBottom: 8 }}>Admin</p>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "2rem", fontWeight: 300, textTransform: "uppercase", letterSpacing: "-0.02em" }}>Curated By</h1>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 48 }}>
        {issues.map(issue => (
          <div key={issue.slug} style={{ background: "var(--card)", border: "1px solid var(--border)", padding: "14px 20px", display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>Curated by {issue.curator}</p>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                {issue.vol} · {issue.location}
              </p>
            </div>
            <button onClick={() => togglePublished(issue)} style={{ fontFamily: "var(--font-mono)", fontSize: 8, padding: "3px 8px", border: `1px solid ${issue.published ? "var(--accent)" : "var(--border)"}`, color: issue.published ? "var(--accent)" : "var(--muted)", background: "none", cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              {issue.published ? "Live" : "Draft"}
            </button>
            <button onClick={() => handleDelete(issue.slug)} style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--muted)", background: "none", border: "none", cursor: "pointer" }}>Delete</button>
          </div>
        ))}
        {issues.length === 0 && (
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", padding: "40px 24px", textAlign: "center" }}>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted)" }}>No issues yet.</p>
          </div>
        )}
      </div>

      <hr style={{ border: "none", borderTop: "1px solid var(--border)", marginBottom: 32 }} />
      <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1.2rem", fontWeight: 300, textTransform: "uppercase", letterSpacing: "-0.01em", marginBottom: 24 }}>Add Issue</h2>

      <form onSubmit={handleAdd} style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 600 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div><FieldLabel>Vol (e.g. Vol. 004)</FieldLabel><Input value={form.vol} onChange={field("vol")} placeholder="Vol. 004" /></div>
          <div><FieldLabel>Slug *</FieldLabel><Input value={form.slug} onChange={field("slug")} placeholder="name-city" /></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div><FieldLabel>Curator name *</FieldLabel><Input value={form.curator} onChange={field("curator")} placeholder="Jess" /></div>
          <div><FieldLabel>Location</FieldLabel><Input value={form.location} onChange={field("location")} placeholder="Bristol" /></div>
        </div>
        <div><FieldLabel>Bio</FieldLabel><Input value={form.bio} onChange={field("bio")} placeholder="One-line bio shown on the listing" /></div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
          <input type="checkbox" checked={form.published} onChange={e => field("published")(e.target.checked)} style={{ accentColor: "var(--accent)", width: 14, height: 14 }} />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)" }}>Publish immediately</span>
        </label>
        {error && <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--accent)" }}>{error}</p>}
        <button type="submit" disabled={saving} style={{ padding: "11px 28px", background: "var(--accent)", color: "#fff", border: "none", fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", cursor: saving ? "not-allowed" : "pointer", alignSelf: "flex-start", opacity: saving ? 0.6 : 1 }}>
          {saving ? "Saving…" : "Add issue →"}
        </button>
      </form>
    </div>
  );
}
