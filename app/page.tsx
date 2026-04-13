import Link from "next/link";
import HomeSpotlight from "@/components/HomeSpotlight";

const featuredParks = [
  { name: "Crystal Palace", location: "South London", slug: "crystal-palace", tag: "Bowl" },
  { name: "Meanwhile Gardens", location: "West London", slug: "meanwhile-gardens", tag: "Bowl" },
  { name: "Rom Skatepark", location: "Essex", slug: "rom", tag: "Historic" },
  { name: "Livingston", location: "Scotland", slug: "livingston", tag: "Historic" },
  { name: "Bay 66", location: "West London", slug: "bay-66", tag: "Indoor" },
];

export default function Home() {
  return (
    <div>
      {/* HERO */}
      <HomeSpotlight />


      {/* RECENTLY ADDED */}
      <section className="px-8 md:px-12" style={{ paddingTop: "5rem", paddingBottom: "5rem" }}>
        <div className="flex items-center justify-between mb-8">
          <p className="text-xs uppercase tracking-widest" style={{ color: "var(--muted)", letterSpacing: "0.2em" }}>Recently Added</p>
          <Link href="/parks" className="text-xs uppercase tracking-widest" style={{ color: "var(--muted)", letterSpacing: "0.15em" }}>View All →</Link>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {featuredParks.map((park) => (
            <Link key={park.slug} href={`/parks/${park.slug}`} className="flex-shrink-0">
              <div className="w-48 h-32 mb-3 relative overflow-hidden" style={{ background: "var(--card)" }}>
                <span className="absolute top-2 left-2 text-xs px-2 py-0.5 font-bold" style={{ background: "var(--accent)", color: "#ffffff", letterSpacing: "0.1em" }}>
                  {park.tag}
                </span>
              </div>
              <p className="text-sm font-bold" style={{ letterSpacing: "0.02em" }}>{park.name}</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{park.location}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* MAGAZINE */}
      <section className="px-8 pt-16 pb-16 md:px-12">
        <div className="flex items-center justify-between mb-8">
          <h2 className="font-black" style={{ fontSize: "clamp(1.5rem, 4vw, 2.5rem)", letterSpacing: "-0.02em" }}>Magazine</h2>
          <Link href="/magazine" className="text-xs uppercase tracking-widest" style={{ color: "var(--muted)", letterSpacing: "0.15em" }}>All Features →</Link>
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

      {/* MUSIC */}
      <section className="px-8 md:px-12" style={{ paddingTop: "5rem", paddingBottom: "8rem" }}>
        <div className="flex items-center justify-between mb-8">
          <h2 className="font-black" style={{ fontSize: "clamp(1.5rem, 4vw, 2.5rem)", letterSpacing: "-0.02em" }}>Music</h2>
          <Link href="/music" className="text-xs uppercase tracking-widest" style={{ color: "var(--muted)", letterSpacing: "0.15em" }}>All Mixes →</Link>
        </div>
        <div className="flex items-center justify-between p-10" style={{ background: "var(--card)" }}>
          <div>
            <p className="text-xs uppercase mb-2" style={{ color: "var(--accent)", letterSpacing: "0.15em" }}>Vol. 001 — Bristol</p>
            <h3 className="font-black mb-2" style={{ fontSize: "1.75rem", lineHeight: 1, letterSpacing: "-0.02em" }}>Curated by Jess</h3>
            <p className="text-sm" style={{ color: "var(--muted)", lineHeight: 1.6 }}>
              Skating Lloyds before it gets busy, then whatever feels right after.
            </p>
          </div>
          <Link href="/music" className="flex-shrink-0 ml-8 px-6 py-3 text-sm font-bold" style={{ background: "var(--accent)", color: "#ffffff" }}>
            Listen
          </Link>
        </div>
      </section>

      {/* FIND A PARK CTA */}
      <section className="px-8 md:px-12 text-center" style={{ paddingTop: "6rem", paddingBottom: "8rem" }}>
        <p className="text-xs uppercase tracking-widest mb-4" style={{ color: "var(--muted)", letterSpacing: "0.2em" }}>The Directory</p>
        <h2 className="font-black mb-6" style={{ fontSize: "clamp(2rem, 6vw, 4rem)", lineHeight: 0.95, letterSpacing: "-0.03em" }}>
          Find a park
        </h2>
        <p className="mb-8 mx-auto" style={{ color: "var(--muted)", maxWidth: "50ch", lineHeight: 1.6 }}>
          Every skatepark in the UK, mapped and documented. Filter by obstacles, amenities, or find what&apos;s near you right now.
        </p>
        <Link href="/parks" className="inline-block px-10 py-4 font-bold" style={{ background: "var(--accent)", color: "#ffffff" }}>
          Open the Map
        </Link>
      </section>
    </div>
  );
}
