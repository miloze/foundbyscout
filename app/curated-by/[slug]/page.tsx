import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase-server";

export default async function CuratedBySlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = createServerClient();

  const [{ data: issue }, { data: things }, { data: interview }, { data: mixtapeRows }] =
    await Promise.all([
      db.from("curated_by").select("*").eq("slug", slug).single(),
      db.from("curated_by_things").select("*").eq("issue_slug", slug).order("sort_order"),
      db.from("curated_by_interview").select("*").eq("issue_slug", slug).order("sort_order"),
      db.from("curated_by_mixtape").select("*").eq("issue_slug", slug).limit(1),
    ]);

  if (!issue) notFound();

  const mixtape = mixtapeRows?.[0] ?? null;

  return (
    <div>
      {/* Hero */}
      <div style={{ paddingTop: 48, paddingBottom: 48, display: "flex", alignItems: "center", gap: 48, borderBottom: "1px solid var(--border)" }}>
        <div>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.2em", color: "var(--accent)", marginBottom: 12 }}>
            {issue.vol} — {issue.location}
          </p>
          <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(2rem, 6vw, 4rem)", fontWeight: 300, textTransform: "uppercase", lineHeight: 0.95, letterSpacing: "-0.03em", marginBottom: 16 }}>
            Curated by {issue.curator}
          </h1>
          <p style={{ color: "var(--muted)", fontSize: 15, lineHeight: 1.6, maxWidth: "46ch" }}>
            {issue.bio}
          </p>
        </div>
      </div>

      {/* 5 Things */}
      {things && things.length > 0 && (
        <section style={{ paddingTop: "3.5rem", paddingBottom: "3.5rem", borderBottom: "1px solid var(--border)" }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.2em", color: "var(--accent)", marginBottom: 32 }}>Five Things</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 2 }}>
            {things.map((thing, i) => (
              <div key={thing.id} style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                <div style={{ aspectRatio: "1/1", background: thing.image ? undefined : "var(--border)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                  {thing.image
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={thing.image} alt={thing.label} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "grayscale(1)" }} />
                    : <span style={{ fontFamily: "var(--font-heading)", fontSize: "2rem", fontWeight: 300, color: "var(--muted)" }}>{i + 1}</span>
                  }
                </div>
                <div style={{ padding: "1rem" }}>
                  <p style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>{thing.label}</p>
                  <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>{thing.caption}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Interview */}
      {interview && interview.length > 0 && (
        <section style={{ paddingTop: "3.5rem", paddingBottom: "3.5rem", borderBottom: "1px solid var(--border)" }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.2em", color: "var(--accent)", marginBottom: 32 }}>Interview</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "2.5rem", maxWidth: "60ch" }}>
            {interview.map(item => (
              <div key={item.id}>
                <p style={{ fontSize: 15, fontWeight: 500, marginBottom: "0.5rem", lineHeight: 1.4 }}>{item.question}</p>
                <p style={{ color: "var(--muted)", lineHeight: 1.7, fontSize: 15 }}>{item.answer}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Mixtape */}
      {mixtape && (
        <section style={{ paddingTop: "3.5rem", paddingBottom: "3.5rem" }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.2em", color: "var(--accent)", marginBottom: 24 }}>Mixtape</p>
          <p style={{ fontSize: 15, fontWeight: 500, marginBottom: 16 }}>{mixtape.title}</p>
          <iframe
            width="100%"
            height="120"
            src={`https://www.mixcloud.com/widget/iframe/?hide_cover=1&mini=1&feed=${encodeURIComponent(new URL(mixtape.url).pathname)}`}
            frameBorder="0"
            allow="autoplay"
            style={{ border: "1px solid var(--border)", display: "block" }}
          />
        </section>
      )}
    </div>
  );
}
