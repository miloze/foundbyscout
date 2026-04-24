import Link from "next/link";
import HomeSpotlight from "@/components/HomeSpotlight";

const featuredParks = [
  { name: "Crystal Palace", location: "South London", slug: "crystal-palace", tag: "Bowl" },
  { name: "Southbank", location: "Waterloo", slug: "southbank", tag: "Historic" },
  { name: "Stockwell", location: "South London", slug: "stockwell", tag: "Bowl" },
  { name: "Livingston", location: "Scotland", slug: "livingston", tag: "Historic" },
];

export default function Home() {
  return (
    <div>
      {/* HERO */}
      <HomeSpotlight />

      {/* DIRECTORY CTA + FEATURED PARKS */}
      <section style={{ paddingTop: "5rem", paddingBottom: "5rem" }}>
        <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: "clamp(2rem, 5vw, 5rem)", alignItems: "start" }}>
          {/* Left: Directory CTA */}
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", paddingTop: "1rem" }}>
            <p className="text-xs uppercase tracking-widest mb-4" style={{ color: "var(--muted)", letterSpacing: "0.2em" }}>The Directory</p>
            <h2
              style={{
                fontSize: "clamp(2rem, 5vw, 3.5rem)",
                lineHeight: 0.95,
                letterSpacing: "-0.03em",
                marginBottom: "1.25rem",
              }}
            >
              Find a park
            </h2>
            <p style={{ color: "var(--muted)", maxWidth: "38ch", lineHeight: 1.6, fontSize: "0.9375rem", marginBottom: "1.75rem" }}>
              Every skatepark in the UK, mapped and documented. Filter by obstacles, amenities, or find what&apos;s near you right now.
            </p>
            <Link
              href="/parks"
              className="inline-block"
              style={{
                padding: "11px 28px", fontWeight: "bold", fontSize: 12,
                textTransform: "uppercase", letterSpacing: "0.12em",
                background: "var(--accent)", color: "#fff",
                alignSelf: "flex-start",
              }}
            >
              Open the Map →
            </Link>
          </div>

          {/* Right: 2×2 featured parks grid */}
          <div>
            <div className="flex items-center justify-between mb-5">
              <p className="text-xs uppercase tracking-widest" style={{ color: "var(--muted)", letterSpacing: "0.2em" }}>Featured Parks</p>
              <Link href="/parks" className="text-xs uppercase tracking-widest" style={{ color: "var(--muted)", letterSpacing: "0.15em" }}>View All →</Link>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              {featuredParks.map((park) => (
                <Link key={park.slug} href={`/parks/${park.slug}`} style={{ display: "block" }}>
                  <div
                    style={{
                      position: "relative", overflow: "hidden",
                      background: "var(--card)",
                      aspectRatio: "4/3",
                      marginBottom: "0.5rem",
                    }}
                  >
                    <span
                      style={{
                        position: "absolute", top: 8, left: 8,
                        fontSize: 9, padding: "3px 8px",
                        background: "var(--accent)", color: "#fff",
                        fontWeight: "bold", letterSpacing: "0.1em", textTransform: "uppercase",
                      }}
                    >
                      {park.tag}
                    </span>
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 700, letterSpacing: "0.02em", fontFamily: "var(--font-body)" }}>{park.name}</p>
                  <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 2, fontFamily: "var(--font-body)" }}>{park.location}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FIELD NOTES */}
      <section style={{ paddingBottom: "5rem" }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: "clamp(1.5rem, 4vw, 2.5rem)", letterSpacing: "-0.02em" }}>Field Notes</h2>
          <Link href="/field-notes" className="text-xs uppercase" style={{ color: "var(--muted)", letterSpacing: "0.15em", fontFamily: "var(--font-mono)" }}>All Features →</Link>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          <div style={{ padding: "40px 32px", display: "flex", flexDirection: "column", justifyContent: "flex-end", background: "var(--card)", minHeight: 320 }}>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--accent)", marginBottom: 12 }}>Interview</p>
            <h3 style={{ fontSize: "clamp(1.25rem, 3vw, 2rem)", lineHeight: 1, letterSpacing: "-0.02em", marginBottom: 12 }}>
              The Unsung Builder
            </h3>
            <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.6 }}>
              The man who built three DIY spots and never asked for credit.
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ padding: "28px 24px", display: "flex", flexDirection: "column", justifyContent: "flex-end", flex: 1, background: "var(--card)" }}>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--accent)", marginBottom: 8 }}>Regional</p>
              <h3 style={{ fontSize: "1.25rem", lineHeight: 1, letterSpacing: "-0.02em", marginBottom: 8 }}>
                The North West Right Now
              </h3>
              <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>
                Five parks worth the drive, one city that&apos;s quietly become essential.
              </p>
            </div>
            <div style={{ padding: "28px 24px", display: "flex", flexDirection: "column", justifyContent: "flex-end", flex: 1, background: "var(--card)" }}>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--accent)", marginBottom: 8 }}>Spotlight</p>
              <h3 style={{ fontSize: "1.25rem", lineHeight: 1, letterSpacing: "-0.02em", marginBottom: 8 }}>
                Rom Skatepark
              </h3>
              <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>
                Britain&apos;s oldest concrete skatepark turns 50.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CURATED BY */}
      <section style={{ paddingBottom: "6rem" }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: "clamp(1.5rem, 4vw, 2.5rem)", letterSpacing: "-0.02em" }}>Curated By</h2>
          <Link href="/curated-by" style={{ fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--muted)" }}>All Issues →</Link>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "32px 40px", background: "var(--card)" }}>
          <div>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--accent)", marginBottom: 8 }}>Vol. 001 — Bristol</p>
            <h3 style={{ fontSize: "1.75rem", lineHeight: 1, letterSpacing: "-0.02em", marginBottom: 8 }}>Curated by Jess</h3>
            <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>
              Skating Lloyds before it gets busy, then whatever feels right after.
            </p>
          </div>
          <Link href="/curated-by/jess-bristol" style={{ flexShrink: 0, marginLeft: 32, padding: "12px 24px", fontSize: 14, fontWeight: 700, background: "var(--accent)", color: "#fff", fontFamily: "var(--font-body)" }}>
            Read
          </Link>
        </div>
      </section>
    </div>
  );
}
