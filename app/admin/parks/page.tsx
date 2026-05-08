import { createServerClient } from "@/lib/supabase-server";
import Link from "next/link";
import PublishToggle from "./PublishToggle";

export default async function AdminParksPage() {
  const db = createServerClient();
  const { data: parks } = await db
    .from("parks")
    .select("slug, name, postcode, borough, type, is_free, published")
    .order("sort_order", { ascending: true });

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
        <div>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.2em", color: "var(--muted)", marginBottom: 8 }}>Admin</p>
          <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "2rem", fontWeight: 300, textTransform: "uppercase", letterSpacing: "-0.02em" }}>Parks</h1>
        </div>
        <Link href="/admin/parks/new" style={{ padding: "10px 24px", background: "var(--accent)", color: "#fff", fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", textDecoration: "none" }}>
          + Add park
        </Link>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {(parks ?? []).map(park => (
          <div key={park.slug} style={{ background: "var(--card)", border: "1px solid var(--border)", padding: "16px 20px", display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>{park.name}</p>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                {park.postcode} · {park.borough} · {park.type}
              </p>
            </div>
            <PublishToggle slug={park.slug} published={park.published} />
            <Link href={`/admin/parks/${park.slug}`} style={{ fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--foreground)", textDecoration: "none" }}>
              Edit →
            </Link>
            <Link href={`/parks/${park.slug}`} target="_blank" style={{ fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", textDecoration: "none" }}>
              View
            </Link>
          </div>
        ))}

        {(!parks || parks.length === 0) && (
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", padding: "48px 24px", textAlign: "center" }}>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted)", letterSpacing: "0.1em" }}>No parks yet — add your first one.</p>
          </div>
        )}
      </div>
    </div>
  );
}
