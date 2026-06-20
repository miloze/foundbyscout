import Link from "next/link";
import { createServerClient } from "@/lib/supabase-server";

export default async function Home() {
  const db = createServerClient();

  const [{ data: featuredParks }, { data: featured }] = await Promise.all([
    db
      .from("parks")
      .select("slug, name, location, type, hero_image, thumbnail")
      .eq("published", true)
      .gt("sort_order", 0)
      .order("sort_order", { ascending: true })
      .limit(4),
    // TEMP: hardcoded to Bloblands while homepage feature content/layout is being finalised.
    // Future: replace with either curated "significant park" selection or random-from-archive.
    db
      .from("parks")
      .select("*")
      .eq("slug", "bloblands")
      .eq("published", true)
      .single(),
  ]);

  // Derive tag list from structured fields
  const featureTags: string[] = featured ? [
    featured.type,
    featured.is_free ? "Free" : null,
    featured.is_covered ? "Covered" : "Outdoor",
  ].filter(Boolean) as string[] : [];

  return (
    <div>
      {/* HERO — static single-park feature */}
      {featured && (
        <section
          style={{
            position: "relative",
            height: "78vh",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            padding: "8rem clamp(16px,4vw,56px) 3rem",
            marginTop: "-44px",
            marginLeft: "calc(-1 * clamp(16px, 4vw, 56px))",
            marginRight: "calc(-1 * clamp(16px, 4vw, 56px))",
            overflow: "hidden",
            userSelect: "none",
          }}
        >
          {/* Hero background */}
          {featured.hero_image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={featured.hero_image}
              alt=""
              style={{
                position: "absolute", inset: 0, width: "100%", height: "100%",
                objectFit: "cover", objectPosition: "center center",
              }}
            />
          ) : (
            <div style={{ position: "absolute", inset: 0, background: "#111" }} />
          )}

          {/* Gradient scrim — darkens bottom of hero so text reads cleanly */}
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(to top, rgba(20,20,18,0.82) 0%, rgba(20,20,18,0.3) 40%, rgba(20,20,18,0) 70%)",
            pointerEvents: "none",
            zIndex: 1,
          }} />


          {/* Postcode badge */}
          {featured.postcode && (
            <div style={{
              position: "absolute", top: "clamp(20px,4vw,36px)", left: "clamp(16px,4vw,56px)",
              width: 80, height: 80, borderRadius: "50%", background: "var(--accent)",
              display: "flex", alignItems: "center", justifyContent: "center",
              zIndex: 2, pointerEvents: "none",
            }}>
              <span style={{ fontFamily: "var(--font-heading)", fontSize: 18, fontWeight: 300, color: "#fff", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                {featured.postcode.split(" ")[0]}
              </span>
            </div>
          )}

          {/* Archive content block — z-index 2 sits above blur band (z-index 1) */}
          <div style={{ position: "relative", zIndex: 2, maxWidth: 900 }}>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--accent)", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 20 }}>
              Park Spotlight
            </p>
            {featured.catalogue_id && (
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(255,255,255,0.4)", letterSpacing: "0.15em", marginBottom: 6 }}>
                {featured.catalogue_id}
              </p>
            )}
            <h1 style={{ fontSize: "clamp(3.5rem, 11vw, 9rem)", lineHeight: 0.88, letterSpacing: "-0.02em", color: "#fff", fontWeight: 300, marginBottom: 16 }}>
              {featured.name}
            </h1>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(255,255,255,0.55)", letterSpacing: "0.06em", marginBottom: 12 }}>
              {[featured.location, "London", featured.postcode?.split(" ")[0]].filter(Boolean).join("/")}
            </p>
            <div style={{ display: "flex", gap: 24, fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(255,255,255,0.5)", letterSpacing: "0.06em", marginBottom: 28 }}>
              {featured.opened  && <span>Opened {featured.opened}</span>}
              {featured.scanned && <span>Scanned {featured.scanned}</span>}
            </div>
            <Link
              href={`/parks/${featured.slug}`}
              style={{ display: "inline-block", padding: "7px 16px", fontSize: 10, fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.12em", background: "var(--accent)", color: "#fff", fontFamily: "var(--font-mono)" }}
            >
              View scan →
            </Link>
          </div>
        </section>
      )}

      {/* DIRECTORY CTA + FEATURED PARKS */}
      <section style={{ paddingTop: "5rem", paddingBottom: "6rem", borderBottom: "1px solid var(--border)" }}>

        {/* Header row — label */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.2em", color: "var(--muted)" }}>
            The Directory
          </p>
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
                padding: "7px 16px", fontWeight: "bold", fontSize: 10,
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
