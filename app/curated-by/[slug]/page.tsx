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
    mixtape: { title: "Temporal Cove w/ Pavement", url: "https://www.mixcloud.com/NTSRadio/temporal-cove-w-pavement-15th-january-2026/" },
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
        style={{ paddingTop: 48, paddingBottom: 48, display: "flex", alignItems: "center", gap: 48, borderBottom: "1px solid var(--border)", background: "var(--card)" }}
      >
        <Vinyl name={issue.curator} />
        <div>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.2em", color: "var(--accent)", marginBottom: 12 }}>
            {issue.vol} — {issue.location}
          </p>
          <h1 style={{ fontSize: "clamp(2rem, 6vw, 4rem)", lineHeight: 0.95, letterSpacing: "-0.03em", marginBottom: 16 }}>
            {issue.vol}
          </h1>
          <p style={{ color: "var(--muted)", fontSize: 15, lineHeight: 1.6, maxWidth: "46ch" }}>
            {issue.bio}
          </p>
        </div>
      </div>

      {/* 5 Things */}
      <section style={{ paddingTop: "3.5rem", paddingBottom: "3.5rem", borderBottom: "1px solid var(--border)" }}>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.2em", color: "var(--accent)", marginBottom: 32 }}>Five Things</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 2 }}>
          {issue.things.map((thing, i) => (
            <div key={i} style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <div style={{ aspectRatio: "1/1", background: "var(--border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontFamily: "var(--font-heading)", fontSize: "2rem", fontWeight: 300, color: "var(--muted)" }}>{i + 1}</span>
              </div>
              <div style={{ padding: "1rem" }}>
                <p style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>{thing.label}</p>
                <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>{thing.caption}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Interview */}
      <section style={{ paddingTop: "3.5rem", paddingBottom: "3.5rem", borderBottom: "1px solid var(--border)" }}>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.2em", color: "var(--accent)", marginBottom: 32 }}>Interview</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "2.5rem", maxWidth: "60ch" }}>
          {issue.interview.map((item, i) => (
            <div key={i}>
              <p style={{ fontSize: 15, fontWeight: 500, marginBottom: "0.5rem", lineHeight: 1.4 }}>{item.q}</p>
              <p style={{ color: "var(--muted)", lineHeight: 1.7, fontSize: 15 }}>{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Mixtape */}
      {issue.mixtape && (
        <section style={{ paddingTop: "3.5rem", paddingBottom: "3.5rem" }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.2em", color: "var(--accent)", marginBottom: 24 }}>Mixtape</p>
          <p style={{ fontSize: 15, fontWeight: 500, marginBottom: 16 }}>{issue.mixtape.title}</p>
          <iframe
            width="100%"
            height="120"
            src={`https://www.mixcloud.com/widget/iframe/?hide_cover=1&mini=1&feed=${encodeURIComponent(new URL(issue.mixtape.url).pathname)}`}
            frameBorder="0"
            allow="autoplay"
            style={{ border: "1px solid var(--border)", display: "block" }}
          />
        </section>
      )}
    </div>
  );
}
