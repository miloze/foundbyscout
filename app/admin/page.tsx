import { createServerClient } from "@/lib/supabase-server";
import Link from "next/link";

async function getCounts() {
  const db = createServerClient();
  const [parks, notes, curated, music] = await Promise.all([
    db.from("parks").select("id", { count: "exact", head: true }),
    db.from("field_notes").select("id", { count: "exact", head: true }),
    db.from("curated_by").select("id", { count: "exact", head: true }),
    db.from("music").select("id", { count: "exact", head: true }),
  ]);
  return {
    parks:   parks.count   ?? 0,
    notes:   notes.count   ?? 0,
    curated: curated.count ?? 0,
    music:   music.count   ?? 0,
  };
}

const TILES = [
  { href: "/admin/parks",       label: "Parks",       key: "parks"   },
  { href: "/admin/field-notes", label: "Field Notes", key: "notes"   },
  { href: "/admin/curated-by",  label: "Curated By",  key: "curated" },
  { href: "/admin/music",       label: "Music",       key: "music"   },
];

export default async function AdminDashboard() {
  const counts = await getCounts();

  return (
    <div>
      <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.2em", color: "var(--muted)", marginBottom: 10 }}>
        Overview
      </p>
      <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "2.5rem", fontWeight: 300, textTransform: "uppercase", letterSpacing: "-0.02em", marginBottom: 40 }}>
        Dashboard
      </h1>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 2, marginBottom: 48 }}>
        {TILES.map(tile => (
          <Link key={tile.href} href={tile.href} style={{ textDecoration: "none" }}>
            <div style={{ background: "var(--card)", border: "1px solid var(--border)", padding: "28px 24px" }}>
              <p style={{ fontFamily: "var(--font-heading)", fontSize: "3rem", fontWeight: 300, lineHeight: 1, marginBottom: 8 }}>
                {counts[tile.key as keyof typeof counts]}
              </p>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--muted)" }}>
                {tile.label}
              </p>
            </div>
          </Link>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
        <Link href="/admin/parks/new" style={{ textDecoration: "none" }}>
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--foreground)" }}>Add a park</span>
            <span style={{ color: "var(--accent)", fontFamily: "var(--font-mono)", fontSize: 10 }}>→</span>
          </div>
        </Link>
        <Link href="/admin/uploads" style={{ textDecoration: "none" }}>
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--foreground)" }}>Upload images</span>
            <span style={{ color: "var(--accent)", fontFamily: "var(--font-mono)", fontSize: 10 }}>→</span>
          </div>
        </Link>
      </div>
    </div>
  );
}
