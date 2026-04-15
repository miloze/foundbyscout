import { notFound } from "next/navigation";

const issues: Record<string, {
  vol: string;
  location: string;
  curator: string;
  bio: string;
  things: { label: string; caption: string }[];
  interview: { q: string; a: string }[];
  mixtape: { title: string; url: string } | null;
}> = {
  "jess-bristol": {
    vol: "Vol. 001",
    location: "Bristol",
    curator: "Jess",
    bio: "Skating Lloyds before it gets busy, then whatever feels right after.",
    things: [
      { label: "Lurking Class", caption: "Dark graphics, darker humour. Always relevant." },
      { label: "Krooked", caption: "Gonz energy. Sketch pads and slappies." },
      { label: "Bristol Beacon", caption: "Best venue in the city. Acoustics are unreal." },
      { label: "Mild weather", caption: "70°F and overcast. Perfect skating conditions." },
      { label: "Early sessions", caption: "No one around. Fresh wax on everything." },
    ],
    interview: [
      { q: "How did you get into skating in Bristol?", a: "Moved here for uni. Walked past Lloyds on the first day and never looked back." },
      { q: "What's the spot that defines the city for you?", a: "Lloyds, obviously. But there's a little marble ledge behind the waterfront that nobody really talks about. That's mine." },
      { q: "Five things — how'd you pick them?", a: "Stuff I'd grab if I had ten minutes to pack a bag. No overthinking." },
    ],
    mixtape: { title: "Jess — Bristol Sessions", url: "#" },
  },
};

function Vinyl({ name }: { name: string }) {
  return (
    <div
      style={{
        width: 180, height: 180, borderRadius: "50%",
        background: "radial-gradient(circle at 50% 50%, #333 0%, #111 40%, #222 42%, #111 44%, #222 48%, #111 50%, #1a1a1a 100%)",
        display: "flex", alignItems: "center", justifyContent: "center",
        animation: "vinyl-spin 5s linear infinite",
        flexShrink: 0,
        boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
      }}
    >
      <div
        style={{
          width: 54, height: 54, borderRadius: "50%",
          background: "var(--accent)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <span style={{ fontSize: 9, color: "#fff", fontWeight: "bold", textAlign: "center", lineHeight: 1.2, letterSpacing: "0.05em", textTransform: "uppercase", padding: "0 6px" }}>
          {name}
        </span>
      </div>
      <style>{`
        @keyframes vinyl-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default async function CuratedBySlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const issue = issues[slug];
  if (!issue) notFound();

  return (
    <div>
      {/* Hero */}
      <div
        className="px-6 py-16 md:px-12 flex items-center gap-12"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--card)" }}
      >
        <Vinyl name={issue.curator} />
        <div>
          <p className="text-xs uppercase mb-3" style={{ color: "var(--accent)", letterSpacing: "0.2em" }}>
            {issue.vol} — {issue.location}
          </p>
          <h1 className="font-black" style={{ fontSize: "clamp(2rem, 6vw, 4rem)", lineHeight: 0.95, letterSpacing: "-0.03em", marginBottom: "1rem" }}>
            Curated by {issue.curator}
          </h1>
          <p style={{ color: "var(--muted)", fontSize: "0.9375rem", lineHeight: 1.6, maxWidth: "46ch" }}>
            {issue.bio}
          </p>
        </div>
      </div>

      {/* 5 Things */}
      <section className="px-6 py-14 md:px-12" style={{ borderBottom: "1px solid var(--border)" }}>
        <p className="text-xs uppercase mb-8" style={{ color: "var(--accent)", letterSpacing: "0.2em" }}>Five Things</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1.5rem" }}>
          {issue.things.map((thing, i) => (
            <div key={i} style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <div style={{ aspectRatio: "1/1", background: "var(--border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: "2rem", color: "var(--muted)", fontWeight: 800 }}>{i + 1}</span>
              </div>
              <div style={{ padding: "1rem" }}>
                <p style={{ fontWeight: "bold", fontSize: "0.9375rem", marginBottom: 4 }}>{thing.label}</p>
                <p style={{ fontSize: "0.8125rem", color: "var(--muted)", lineHeight: 1.5 }}>{thing.caption}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Interview */}
      <section className="px-6 py-14 md:px-12" style={{ borderBottom: "1px solid var(--border)" }}>
        <p className="text-xs uppercase mb-8" style={{ color: "var(--accent)", letterSpacing: "0.2em" }}>Interview</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "2.5rem", maxWidth: "60ch" }}>
          {issue.interview.map((item, i) => (
            <div key={i}>
              <p style={{ fontWeight: "bold", marginBottom: "0.5rem", lineHeight: 1.4 }}>{item.q}</p>
              <p style={{ color: "var(--muted)", lineHeight: 1.7, fontSize: "0.9375rem" }}>{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Mixtape */}
      {issue.mixtape && (
        <section className="px-6 py-14 md:px-12">
          <p className="text-xs uppercase mb-6" style={{ color: "var(--accent)", letterSpacing: "0.2em" }}>Mixtape</p>
          <div className="flex items-center gap-6 p-8" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#111", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontSize: "1.5rem" }}>♫</span>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: "bold", marginBottom: 4 }}>{issue.mixtape.title}</p>
              <p style={{ fontSize: "0.8125rem", color: "var(--muted)" }}>Coming soon</p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
