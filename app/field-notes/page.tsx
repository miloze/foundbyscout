export const metadata = { title: "Field Notes — Found By Scout" };

const articles = [
  { category: "Interview", title: "The Unsung Builder", standfirst: "Three DIY spots. No credit. No regrets.", slug: "the-unsung-builder" },
  { category: "Regional", title: "The North West Right Now", standfirst: "Five parks worth the drive.", slug: "north-west-right-now" },
  { category: "Spotlight", title: "Rom Skatepark", standfirst: "Britain's oldest concrete park turns 50.", slug: "rom-skatepark" },
  { category: "Spotlight", title: "Meanwhile Gardens", standfirst: "West London's community bowl. Still essential.", slug: "meanwhile-gardens" },
];

export default function FieldNotesPage() {
  return (
    <div>
      <div style={{ paddingTop: "2.5rem", paddingBottom: "2.5rem", borderBottom: "1px solid var(--border)" }}>
        <h1 style={{ fontSize: "clamp(2rem, 6vw, 4rem)", lineHeight: 0.95, letterSpacing: "-0.03em" }}>
          Field Notes
        </h1>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 0 }}>
        {articles.map((article, i) => (
          <div
            key={article.slug}
            style={{
              padding: "32px 28px",
              display: "flex", flexDirection: "column", justifyContent: "flex-end",
              minHeight: 280,
              background: "var(--card)",
              borderBottom: "1px solid var(--border)",
              borderRight: i % 2 === 0 ? "1px solid var(--border)" : "none",
            }}
          >
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--accent)", marginBottom: 12 }}>
              {article.category}
            </p>
            <h2 style={{ fontSize: "clamp(1.25rem, 3vw, 2rem)", lineHeight: 1, letterSpacing: "-0.02em", marginBottom: 10 }}>
              {article.title}
            </h2>
            <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>
              {article.standfirst}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
