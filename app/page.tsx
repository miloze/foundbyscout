import Link from "next/link";
import { createServerClient } from "@/lib/supabase-server";
import ParkHeroMeta from "@/components/ParkHeroMeta";
import HeroNavOverlay from "@/components/HeroNavOverlay";
import FooterWordmark from "@/components/FooterWordmark";

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
            // Pull up by the nav's real height so the image reaches the very top
            // of the viewport behind the transparent nav. Was a hardcoded -44px,
            // which left a strip of page background once the bar measured 50px.
            marginTop: "calc(-1 * var(--nav-height, 44px))",
            marginLeft: "calc(-1 * clamp(16px, 4vw, 56px))",
            marginRight: "calc(-1 * clamp(16px, 4vw, 56px))",
            overflow: "hidden",
            userSelect: "none",
          }}
        >
          {/* Makes the nav transparent while this hero is behind it */}
          <HeroNavOverlay />

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

          {/* Gradient scrim */}
          <div style={{
            position: "absolute",
            bottom: 0, left: 0, right: 0,
            height: 200,
            background: "linear-gradient(180deg, rgba(20,19,15,0) 0%, rgba(20,19,15,0.5) 30%, rgba(20,19,15,0.88) 100%)",
            pointerEvents: "none",
            zIndex: 1,
          }} />


          {/* Postcode badge */}
          {featured.postcode && (
            <div style={{
              position: "absolute", top: "clamp(64px,8vw,80px)", right: "clamp(16px,4vw,56px)",
              width: 96, height: 96, borderRadius: "50%", background: "var(--accent)",
              display: "flex", alignItems: "center", justifyContent: "center",
              zIndex: 2, pointerEvents: "none",
            }}>
              <span style={{ fontFamily: "var(--font-heading)", fontSize: 10, fontWeight: 400, color: "#fff", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                {featured.postcode.split(" ")[0]}
              </span>
            </div>
          )}

          {/* Hero meta block */}
          <div style={{ position: "relative", zIndex: 2 }}>
            <ParkHeroMeta
              catalogueId={featured.catalogue_id ?? undefined}
              name={featured.name}
              address={featured.address}
              postcode={featured.postcode}
              opened={featured.opened}
              scanned={featured.scanned}
              slug={featured.slug}
            />
          </div>
        </section>
      )}

      {/* SITE INTRO — the one-line pitch for the whole site, sitting between
          the hero and the first section. Rubik 300 rather than MSCHN: it's a
          statement to read, not a display word, so it stays sentence case and
          sits below the section headings in the hierarchy. The second sentence
          is muted so the claim leads and the detail follows. */}
      <section style={{ paddingTop: "clamp(3rem, 7vw, 5rem)", paddingBottom: "clamp(2rem, 5vw, 3rem)" }}>
        <p style={{
          fontFamily: "var(--font-heading)",
          fontSize: "clamp(1.25rem, 2.6vw, 2rem)",
          lineHeight: 1.35,
          fontWeight: 300,
          letterSpacing: "-0.01em",
          maxWidth: "34ch",
        }}>
          A curated guide to skateparks.{" "}
          <span style={{ color: "var(--muted)" }}>
            Photography, interactive 3D models, maps and detailed park profiles.
          </span>
        </p>
      </section>

      {/* DIRECTORY CTA + FEATURED PARKS */}
      <section style={{ paddingTop: "5rem", paddingBottom: "6rem", borderBottom: "1px solid var(--border)" }}>

        {/* Header row — label */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.2em", color: "var(--muted)" }}>
            Explore
          </p>
        </div>

        {/* Full-width heading + description */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "clamp(2rem, 6vw, 6rem)", marginBottom: "3rem", flexWrap: "wrap" }}>
          <h2 style={{
            fontFamily: "var(--font-display), Arial, sans-serif",
            fontSize: "clamp(3rem, 7vw, 6rem)",
            lineHeight: 0.9,
            letterSpacing: "-0.03em",
            fontWeight: 300,
            textTransform: "uppercase",
            flexShrink: 0,
          }}>
            Parks
          </h2>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "1.25rem", maxWidth: "44ch" }}>
            <p style={{ color: "var(--muted)", lineHeight: 1.65, fontSize: 15 }}>
              Discover our growing collection of carefully documented skateparks.
            </p>
            <Link
              href="/parks"
              style={{
                display: "inline-flex", alignItems: "center", gap: 7,
                padding: "7px 16px", fontWeight: 400, fontSize: 10,
                textTransform: "uppercase", letterSpacing: "0.14em",
                background: "var(--accent)", color: "#fff",
                fontFamily: "var(--font-mono)",
              }}
            >
              Explore Parks
              {/* Same chevron as the park-card CTA, rather than a text arrow */}
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 5l7 7-7 7" />
              </svg>
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
                  fontWeight: 400, letterSpacing: "0.1em",
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

      {/* Full height here, as on the park page — the home page scrolls far
          enough to give the reveal room. */}
      <FooterWordmark />
    </div>
  );
}
