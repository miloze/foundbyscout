import { createServerClient } from "@/lib/supabase-server";

export const metadata = { title: "Field Notes — Found By Scout" };

export default async function FieldNotesPage() {
  const db = createServerClient();
  const { data: features } = await db
    .from("field_notes")
    .select("slug, title, category, blurb")
    .eq("published", true)
    .order("sort_order", { ascending: true });

  const items = features ?? [];
  const [featured, ...rest] = items;

  return (
    <div style={{ paddingTop: "3rem", paddingBottom: "6rem" }}>
      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.2em", color: "var(--muted)", marginBottom: 12 }}>
          Found By Scout
        </p>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(2.5rem, 7vw, 6rem)", fontWeight: 300, letterSpacing: "-0.03em", textTransform: "uppercase", lineHeight: 0.88, marginBottom: 20 }}>
          Field Notes
        </h1>
        <p style={{ fontSize: 15, lineHeight: 1.7, color: "var(--muted)", maxWidth: "48ch" }}>
          Interviews, regional guides, spotlights, and essays from the UK skateboarding scene.
        </p>
      </div>

      <hr style={{ border: "none", borderTop: "1px solid var(--border)", marginBottom: 40 }} />

      {items.length === 0 && (
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted)", letterSpacing: "0.1em" }}>
          No articles published yet.
        </p>
      )}

      {/* Featured article — 2-col */}
      {featured && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, marginBottom: 2 }}>
          <div style={{ background: "var(--card)", minHeight: 360, padding: "40px 36px", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--accent)", marginBottom: 16 }}>
              {featured.category}
            </p>
            <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(1.5rem, 3vw, 2.5rem)", fontWeight: 300, textTransform: "uppercase", letterSpacing: "-0.02em", lineHeight: 1, marginBottom: 16 }}>
              {featured.title}
            </h2>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--muted)", marginBottom: 24, maxWidth: "42ch" }}>
              {featured.blurb}
            </p>
            <button style={{ padding: "10px 24px", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", background: "var(--accent)", color: "#fff", border: "none", cursor: "pointer", alignSelf: "flex-start", fontFamily: "var(--font-body)" }}>
              Read →
            </button>
          </div>
          <div style={{ background: "var(--card)", minHeight: 360, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--border)", letterSpacing: "0.1em", textTransform: "uppercase" }}>Photo</span>
          </div>
        </div>
      )}

      {/* 3-col grid */}
      {rest.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2, marginBottom: 2 }}>
          {rest.slice(0, 3).map(f => (
            <div key={f.slug} style={{ background: "var(--card)", padding: "28px 24px", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--accent)", marginBottom: 10 }}>
                {f.category}
              </p>
              <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "1.2rem", fontWeight: 300, textTransform: "uppercase", letterSpacing: "-0.015em", lineHeight: 1, marginBottom: 10 }}>
                {f.title}
              </h3>
              <p style={{ fontSize: 12, lineHeight: 1.6, color: "var(--muted)" }}>{f.blurb}</p>
            </div>
          ))}
        </div>
      )}

      {/* 2-col grid */}
      {rest.length > 3 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
          {rest.slice(3).map(f => (
            <div key={f.slug} style={{ background: "var(--card)", padding: "28px 24px" }}>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--accent)", marginBottom: 10 }}>
                {f.category}
              </p>
              <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "1.2rem", fontWeight: 300, textTransform: "uppercase", letterSpacing: "-0.015em", lineHeight: 1, marginBottom: 10 }}>
                {f.title}
              </h3>
              <p style={{ fontSize: 12, lineHeight: 1.6, color: "var(--muted)" }}>{f.blurb}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
