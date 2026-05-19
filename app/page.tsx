import Link from "next/link";
import HomeSpotlight from "@/components/HomeSpotlight";
import { createServerClient } from "@/lib/supabase-server";

export default async function Home() {
  const db = createServerClient();
  const { data: featuredParks } = await db
    .from("parks")
    .select("slug, name, location, type, hero_image, thumbnail")
    .eq("published", true)
    .gt("sort_order", 0)
    .order("sort_order", { ascending: true })
    .limit(4);

  return (
    <div>
      {/* HERO */}
      <HomeSpotlight />

      {/* DIRECTORY CTA + FEATURED PARKS */}
      <section style={{ paddingTop: "5rem", paddingBottom: "6rem", borderBottom: "1px solid var(--border)" }}>

        {/* Header row — label + View All link */}
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 24 }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.2em", color: "var(--muted)" }}>
            The Directory
          </p>
          <Link href="/parks" style={{ fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--muted)", textDecoration: "none" }}>
            View All →
          </Link>
        </div>

        {/* Full-width heading + description */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "clamp(2rem, 6vw, 6rem)", marginBottom: "3rem", flexWrap: "wrap" }}>
          <h2 style={{
            fontFamily: "var(--font-heading)",
            fontSize: "clamp(3rem, 7vw, 6rem)",
            lineHeight: 0.9,
            letterSpacing: "-0.03em",
            fontWeight: 300,
            textTransform: "uppercase",
            flexShrink: 0,
          }}>
            Find a park
          </h2>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "1.25rem", maxWidth: "44ch" }}>
            <p style={{ color: "var(--muted)", lineHeight: 1.65, fontSize: 15 }}>
              Every skatepark in the UK, documented and mapped. Filter by type, amenities, or find what&apos;s near you.
            </p>
            <Link
              href="/parks"
              style={{
                display: "inline-block",
                padding: "12px 28px", fontWeight: "bold", fontSize: 11,
                textTransform: "uppercase", letterSpacing: "0.14em",
                background: "var(--accent)", color: "#fff",
                fontFamily: "var(--font-mono)",
              }}
            >
              Browse Parks →
            </Link>
          </div>
        </div>

        {/* Thumbnails — 4 across */}
        <div data-park-thumbs style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 2, background: "var(--border)" }}>
          {(featuredParks ?? []).map((park) => (
            <Link key={park.slug} href={`/parks/${park.slug}`} style={{ display: "block", background: "var(--background)", textDecoration: "none", color: "inherit" }}>
              <div style={{ position: "relative", overflow: "hidden", background: "#111", aspectRatio: "3/4" }}>
                {(park.thumbnail || park.hero_image) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={park.thumbnail || park.hero_image}
                    alt=""
                    style={{
                      position: "absolute", inset: 0,
                      width: "100%", height: "100%",
                      objectFit: "cover",
                      filter: "grayscale(1) contrast(1.05) brightness(0.88)",
                    }}
                    className="fbs-thumb-img"
                  />
                )}
                <div className="fbs-thumb-overlay" />
                <span style={{
                  position: "absolute", top: 10, left: 10,
                  fontSize: 9, padding: "3px 8px",
                  background: "var(--accent)", color: "#fff",
                  fontWeight: "bold", letterSpacing: "0.1em",
                  textTransform: "uppercase", fontFamily: "var(--font-mono)",
                }}>
                  {park.type}
                </span>
              </div>
              <div style={{ padding: "10px 12px 14px" }}>
                <p style={{ fontSize: 13, fontWeight: 600, letterSpacing: "-0.01em" }}>{park.name}</p>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted)", marginTop: 3, letterSpacing: "0.06em", textTransform: "uppercase" }}>{park.location}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <style>{`
        .fbs-thumb-img { color: transparent; transition: filter 0.4s ease; }
        .fbs-colour .fbs-thumb-img { filter: none !important; }
        .fbs-thumb-overlay { position:absolute; inset:0; background:var(--accent); opacity:0; transition:opacity 0.3s ease; pointer-events:none; }
        a:hover .fbs-thumb-overlay { opacity:0.28; }
        a:active .fbs-thumb-overlay { opacity:0.28; }
        @media (max-width: 700px) {
          [data-park-thumbs] { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>
    </div>
  );
}
