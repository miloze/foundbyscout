"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Note = { id: string; slug: string; title: string; category: string; blurb: string; published: boolean };

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

const CATEGORIES = ["Interview", "Regional", "Spotlight", "Essay", "News"];

export default function FieldNotesAdmin({ notes: initial }: { notes: Note[] }) {
  const router = useRouter();
  const [notes, setNotes] = useState(initial);
  const [form, setForm] = useState({ slug: "", title: "", category: "Spotlight", blurb: "", published: false });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function field(key: keyof typeof form) {
    return (v: string | boolean) => setForm(f => ({ ...f, [key]: v }));
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/admin/field-notes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (res.ok) {
      router.refresh();
      setForm({ slug: "", title: "", category: "Spotlight", blurb: "", published: false });
    } else {
      const d = await res.json();
      setError(d.error ?? "Error");
    }
    setSaving(false);
  }

  async function togglePublished(note: Note) {
    await fetch(`/api/admin/field-notes/${note.slug}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ published: !note.published }) });
    setNotes(ns => ns.map(n => n.slug === note.slug ? { ...n, published: !n.published } : n));
  }

  async function handleDelete(slug: string) {
    if (!confirm("Delete this article?")) return;
    await fetch(`/api/admin/field-notes/${slug}`, { method: "DELETE" });
    setNotes(ns => ns.filter(n => n.slug !== slug));
  }

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.2em", color: "var(--muted)", marginBottom: 8 }}>Admin</p>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "2rem", fontWeight: 300, textTransform: "uppercase", letterSpacing: "-0.02em" }}>Field Notes</h1>
      </div>

      {/* List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 48 }}>
        {notes.map(note => (
          <div key={note.slug} style={{ background: "var(--card)", border: "1px solid var(--border)", padding: "14px 20px", display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{note.title}</p>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                {note.category} · {note.slug}
              </p>
            </div>
            <button onClick={() => togglePublished(note)} style={{ fontFamily: "var(--font-mono)", fontSize: 8, padding: "3px 8px", border: `1px solid ${note.published ? "var(--accent)" : "var(--border)"}`, color: note.published ? "var(--accent)" : "var(--muted)", background: "none", cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              {note.published ? "Live" : "Draft"}
            </button>
            <button onClick={() => handleDelete(note.slug)} style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--muted)", background: "none", border: "none", cursor: "pointer", padding: "4px 8px" }}>
              Delete
            </button>
          </div>
        ))}
        {notes.length === 0 && (
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", padding: "40px 24px", textAlign: "center" }}>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted)" }}>No articles yet.</p>
          </div>
        )}
      </div>

      {/* Add form */}
      <hr style={{ border: "none", borderTop: "1px solid var(--border)", marginBottom: 32 }} />
      <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1.2rem", fontWeight: 300, textTransform: "uppercase", letterSpacing: "-0.01em", marginBottom: 24 }}>Add Article</h2>

      <form onSubmit={handleAdd} style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 600 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div><FieldLabel>Title *</FieldLabel><Input value={form.title} onChange={field("title")} placeholder="The Unsung Builder" /></div>
          <div><FieldLabel>Slug *</FieldLabel><Input value={form.slug} onChange={field("slug")} placeholder="the-unsung-builder" /></div>
        </div>
        <div>
          <FieldLabel>Category</FieldLabel>
          <select value={form.category} onChange={e => field("category")(e.target.value)}
            style={{ width: "100%", background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)", fontSize: 13, padding: "10px 12px", outline: "none", fontFamily: "var(--font-body)" }}>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div><FieldLabel>Blurb</FieldLabel><Input value={form.blurb} onChange={field("blurb")} placeholder="Short standfirst shown on listings" /></div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
          <input type="checkbox" checked={form.published} onChange={e => field("published")(e.target.checked)} style={{ accentColor: "var(--accent)", width: 14, height: 14 }} />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)" }}>Publish immediately</span>
        </label>
        {error && <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--accent)" }}>{error}</p>}
        <button type="submit" disabled={saving} style={{ padding: "11px 28px", background: "var(--accent)", color: "#fff", border: "none", fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", cursor: saving ? "not-allowed" : "pointer", alignSelf: "flex-start", opacity: saving ? 0.6 : 1 }}>
          {saving ? "Saving…" : "Add article →"}
        </button>
      </form>
    </div>
  );
}
