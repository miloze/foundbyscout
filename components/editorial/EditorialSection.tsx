// Editorial prose block — used for the Introduction and the Feature Story.
//
// Deliberately the same treatment as the existing "About" block on
// app/parks/[slug]/page.tsx: mono-uppercase eyebrow label, then a paragraph
// stack at 15/1.75 capped to a readable measure. Nothing new is invented here;
// the block is lifted so three sections can share one implementation.
//
// Renders null when there is no body — no empty headings, no placeholders.

type Props = {
  label: string;
  title?: string;
  body?: string[] | null;
  /** Feature Story sits between two blocks, so it carries its own rule. */
  divider?: boolean;
};

export default function EditorialSection({ label, title, body, divider = true }: Props) {
  const paragraphs = (body ?? []).map(p => p?.trim()).filter(Boolean) as string[];
  if (paragraphs.length === 0) return null;

  return (
    <section
      style={{
        paddingTop: 40,
        paddingBottom: 40,
        borderBottom: divider ? "1px solid var(--border)" : undefined,
        maxWidth: 680,
      }}
    >
      <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 16 }}>
        {label}
      </p>

      {title && (
        <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(1.6rem, 3.4vw, 2.4rem)", fontWeight: 300, textTransform: "uppercase", letterSpacing: "-0.02em", lineHeight: 1.02, marginBottom: 20 }}>
          {title}
        </h2>
      )}

      <div style={{ fontSize: 15, lineHeight: 1.75, color: "var(--foreground)" }}>
        {paragraphs.map((p, i) => (
          <p key={i} style={{ marginTop: i > 0 ? 14 : 0 }}>{p}</p>
        ))}
      </div>
    </section>
  );
}
