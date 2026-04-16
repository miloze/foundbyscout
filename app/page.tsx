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
      <section
        className="px-8 md:px-12"
        style={{ paddingTop: "5rem", paddingBottom: "5rem" }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: "clamp(2rem, 5vw, 5rem)", alignItems: "start" }}>
          {/* Left: Directory CTA */}
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", paddingTop: "1rem" }}>
            <p className="text-xs uppercase tracking-widest mb-4" style={{ color: "var(--muted)", letterSpacing: "0.2em" }}>The Directory</p>
            <h2
              style={{
                fontSize: "clamp(2rem, 5vw, 3.5rem)",
                lineHeight: 0.95,
                letterSpacing: "-0.03em",
                fontWeight: 800,
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
                  <p style={{ fontSize: "0.875rem", fontWeight: "bold", letterSpacing: "0.02em" }}>{park.name}</p>
                  <p style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: 2 }}>{park.location}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FIELD NOTES */}
      <section className="px-8 pt-16 pb-16 md:px-12">
        <div className="flex items-center justify-between mb-8">
          <h2 className="font-black" style={{ fontSize: "clamp(1.5rem, 4vw, 2.5rem)", letterSpacing: "-0.02em" }}>Field Notes</h2>
          <Link href="/field-notes" className="text-xs uppercase tracking-widest" style={{ color: "var(--muted)", letterSpacing: "0.15em" }}>All Features →</Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-10 flex flex-col justify-end" style={{ background: "var(--card)", minHeight: "360px" }}>
            <p className="text-xs uppercase mb-4" style={{ color: "var(--accent)", letterSpacing: "0.15em" }}>Interview</p>
            <h3 className="font-black mb-3" style={{ fontSize: "clamp(1.5rem, 4vw, 2.5rem)", lineHeight: 1, letterSpacing: "-0.02em" }}>
              The Unsung Builder
            </h3>
            <p style={{ color: "var(--muted)", fontSize: "0.9375rem", lineHeight: 1.6 }}>
              The man who built three DIY spots and never asked for credit.
            </p>
          </div>
          <div className="flex flex-col gap-6">
            <div className="p-8 flex flex-col justify-end flex-1" style={{ background: "var(--card)" }}>
              <p className="text-xs uppercase mb-3" style={{ color: "var(--accent)", letterSpacing: "0.15em" }}>Regional</p>
              <h3 className="font-black mb-2" style={{ fontSize: "1.5rem", lineHeight: 1, letterSpacing: "-0.02em" }}>
                The North West Right Now
              </h3>
              <p className="text-sm" style={{ color: "var(--muted)", lineHeight: 1.6 }}>
                Five parks worth the drive, one city that&apos;s quietly become essential.
              </p>
            </div>
            <div className="p-8 flex flex-col justify-end flex-1" style={{ background: "var(--card)" }}>
              <p className="text-xs uppercase mb-3" style={{ color: "var(--accent)", letterSpacing: "0.15em" }}>Spotlight</p>
              <h3 className="font-black mb-2" style={{ fontSize: "1.5rem", lineHeight: 1, letterSpacing: "-0.02em" }}>
                Rom Skatepark
              </h3>
              <p className="text-sm" style={{ color: "var(--muted)", lineHeight: 1.6 }}>
                Britain&apos;s oldest concrete skatepark turns 50.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CURATED BY */}
      <section className="px-8 md:px-12" style={{ paddingTop: "5rem", paddingBottom: "8rem" }}>
        <div className="flex items-center justify-between mb-8">
          <h2 className="font-black" style={{ fontSize: "clamp(1.5rem, 4vw, 2.5rem)", letterSpacing: "-0.02em" }}>Curated By</h2>
          <Link href="/curated-by" className="text-xs uppercase tracking-widest" style={{ color: "var(--muted)", letterSpacing: "0.15em" }}>All Issues →</Link>
        </div>
        <div className="flex items-center justify-between p-10" style={{ background: "var(--card)" }}>
          <div>
            <p className="text-xs uppercase mb-2" style={{ color: "var(--accent)", letterSpacing: "0.15em" }}>Vol. 001 — Bristol</p>
            <h3 className="font-black mb-2" style={{ fontSize: "1.75rem", lineHeight: 1, letterSpacing: "-0.02em" }}>Curated by Jess</h3>
            <p className="text-sm" style={{ color: "var(--muted)", lineHeight: 1.6 }}>
              Skating Lloyds before it gets busy, then whatever feels right after.
            </p>
          </div>
          <Link href="/curated-by" className="flex-shrink-0 ml-8 px-6 py-3 text-sm font-bold" style={{ background: "var(--accent)", color: "#ffffff" }}>
            Read
          </Link>
        </div>
      </section>
    </div>
  );
}
