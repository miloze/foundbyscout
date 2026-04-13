export const metadata = { title: "Music — Found By Scout" };

const mixes = [
  { vol: "Vol. 001", region: "Bristol", curator: "Jess", bio: "Skating Lloyds before it gets busy, then whatever feels right after.", url: "#" },
];

export default function MusicPage() {
  return (
    <div>
      <div className="px-6 py-10 md:px-12" style={{ borderBottom: "1px solid var(--border)" }}>
        <h1
          className="font-black uppercase"
          style={{ fontSize: "clamp(2rem, 6vw, 4rem)", lineHeight: 0.95, letterSpacing: "-0.03em" }}
        >
          Music
        </h1>
        <p className="mt-4 text-sm" style={{ color: "var(--muted)", maxWidth: "55ch", lineHeight: 1.6 }}>
          Guest mixtapes and playlists from people in the UK skate scene. One region at a time.
        </p>
      </div>

      <div className="px-6 py-10 md:px-12">
        {mixes.map((mix) => (
          <div
            key={mix.vol}
            className="p-8 mb-px"
            style={{ background: "var(--card)", border: "1px solid var(--border)" }}
          >
            <p className="text-xs uppercase mb-2" style={{ color: "var(--accent)", letterSpacing: "0.15em" }}>
              {mix.vol} — {mix.region}
            </p>
            <h2
              className="font-black uppercase mb-3"
              style={{ fontSize: "clamp(1.5rem, 4vw, 2.5rem)", lineHeight: 1, letterSpacing: "-0.02em" }}
            >
              Curated by {mix.curator}
            </h2>
            <p className="text-sm mb-6" style={{ color: "var(--muted)", lineHeight: 1.6, maxWidth: "55ch" }}>
              {mix.bio}
            </p>
            <p className="text-xs" style={{ color: "var(--muted)" }}>Playlist coming soon.</p>
          </div>
        ))}
      </div>
    </div>
  );
}
