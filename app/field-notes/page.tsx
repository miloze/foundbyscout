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
      <div className="px-6 py-10 md:px-12" style={{ borderBottom: "1px solid var(--border)" }}>
        <h1
          className="font-black uppercase"
          style={{ fontSize: "clamp(2rem, 6vw, 4rem)", lineHeight: 0.95, letterSpacing: "-0.03em" }}
        >
          Field Notes
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2">
        {articles.map((article, i) => (
          <div
            key={article.slug}
            className="p-8 flex flex-col justify-end"
            style={{
              minHeight: "280px",
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderTop: "none",
              borderLeft: i % 2 === 1 ? "none" : undefined,
            }}
          >
            <p className="text-xs uppercase mb-4" style={{ color: "var(--accent)", letterSpacing: "0.15em" }}>
              {article.category}
            </p>
            <h2
              className="font-black uppercase mb-3"
              style={{ fontSize: "clamp(1.25rem, 3vw, 2rem)", lineHeight: 1, letterSpacing: "-0.02em" }}
            >
              {article.title}
            </h2>
            <p className="text-sm" style={{ color: "var(--muted)", lineHeight: 1.6 }}>
              {article.standfirst}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
