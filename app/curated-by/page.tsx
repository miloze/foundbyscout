import Link from "next/link";

export const metadata = { title: "Curated By — Found By Scout" };

const issues = [
  {
    slug: "jess-bristol",
    vol: "Vol. 001",
    location: "Bristol",
    curator: "Jess",
    bio: "Skating Lloyds before it gets busy, then whatever feels right after.",
    things: ["Lurking Class", "Krooked", "Bristol Beacon", "Mild weather", "Early sessions"],
    interview: "We talked about building community one spot at a time, and why Bristol keeps pulling people back.",
  },
];

function Vinyl({ name }: { name: string }) {
  return (
    <div
      style={{
        width: 120, height: 120, borderRadius: "50%",
        background: "radial-gradient(circle at 50% 50%, #333 0%, #111 40%, #222 42%, #111 44%, #222 48%, #111 50%, #1a1a1a 100%)",
        display: "flex", alignItems: "center", justifyContent: "center",
        animation: "vinyl-spin 5s linear infinite",
        flexShrink: 0,
        boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
        position: "relative",
      }}
    >
      <div
        style={{
          width: 36, height: 36, borderRadius: "50%",
          background: "var(--accent)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1,
        }}
      >
        <span style={{ fontSize: 7, color: "#fff", fontWeight: "bold", textAlign: "center", lineHeight: 1.2, letterSpacing: "0.05em", textTransform: "uppercase", padding: "0 4px" }}>
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

export default function CuratedByPage() {
  return (
    <div>
      <div className="px-6 py-10 md:px-12" style={{ borderBottom: "1px solid var(--border)" }}>
        <h1
          className="font-black uppercase"
          style={{ fontSize: "clamp(2rem, 6vw, 4rem)", lineHeight: 0.95, letterSpacing: "-0.03em" }}
        >
          Curated By
        </h1>
        <p className="mt-4 text-sm" style={{ color: "var(--muted)", maxWidth: "50ch", lineHeight: 1.6 }}>
          Five things they love. A short interview. A mixtape.
        </p>
      </div>

      <div className="px-6 py-10 md:px-12 flex flex-col gap-8">
        {issues.map(issue => (
          <Link
            key={issue.slug}
            href={`/curated-by/${issue.slug}`}
            style={{ display: "block", textDecoration: "none" }}
          >
            <div
              className="flex items-center gap-8 p-8"
              style={{ background: "var(--card)", border: "1px solid var(--border)" }}
            >
              <Vinyl name={issue.curator} />
              <div style={{ flex: 1 }}>
                <p className="text-xs uppercase mb-2" style={{ color: "var(--accent)", letterSpacing: "0.15em" }}>
                  {issue.vol} — {issue.location}
                </p>
                <h2 className="font-black mb-2" style={{ fontSize: "1.75rem", lineHeight: 1, letterSpacing: "-0.02em" }}>
                  {issue.vol}
                </h2>
                <p className="text-sm" style={{ color: "var(--muted)", lineHeight: 1.6, maxWidth: "48ch" }}>
                  {issue.bio}
                </p>
              </div>
              <span style={{ fontSize: 12, fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--accent)", flexShrink: 0 }}>
                Read →
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
