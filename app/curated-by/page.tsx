import Link from "next/link";
import { createServerClient } from "@/lib/supabase-server";

export const metadata = { title: "Curated By — Found By Scout" };

export default async function CuratedByPage() {
  const db = createServerClient();
  const { data: issues } = await db
    .from("curated_by")
    .select("slug, vol, curator, location, bio")
    .eq("published", true)
    .order("sort_order", { ascending: true });

  return (
    <div style={{ paddingTop: "3rem", paddingBottom: "6rem" }}>
      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.2em", color: "var(--muted)", marginBottom: 12 }}>
          Found By Scout
        </p>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(2.5rem, 7vw, 6rem)", fontWeight: 300, letterSpacing: "-0.03em", textTransform: "uppercase", lineHeight: 0.88, marginBottom: 20 }}>
          Curated By
        </h1>
        <p style={{ fontSize: 15, lineHeight: 1.7, color: "var(--muted)", maxWidth: "48ch" }}>
          Each issue is curated by a local skater. Their parks, their routes, their city.
        </p>
      </div>

      <hr style={{ border: "none", borderTop: "1px solid var(--border)", marginBottom: 40 }} />

      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {(issues ?? []).map(issue => (
          <Link
            key={issue.slug}
            href={`/curated-by/${issue.slug}`}
            style={{ display: "block", textDecoration: "none" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 32, padding: "28px 32px", background: "var(--card)", border: "1px solid var(--border)" }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--accent)", marginBottom: 10 }}>
                  {issue.vol} — {issue.location}
                </p>
                <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(1.4rem, 3vw, 2rem)", fontWeight: 300, textTransform: "uppercase", letterSpacing: "-0.02em", lineHeight: 1, marginBottom: 10 }}>
                  Curated by {issue.curator}
                </h2>
                <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6, maxWidth: "52ch" }}>
                  {issue.bio}
                </p>
              </div>
              <div style={{ flexShrink: 0, padding: "10px 24px", background: "var(--accent)", color: "#fff", fontFamily: "var(--font-body)", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                Read
              </div>
            </div>
          </Link>
        ))}

        {(!issues || issues.length === 0) && (
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted)", letterSpacing: "0.1em" }}>
            No issues published yet.
          </p>
        )}
      </div>
    </div>
  );
}
