// Editorial prose block — Introduction, Feature Story, and the flat sections
// that replaced the Origins / Local Knowledge accordions.
//
// Two scales:
//   "band"    — inside the editorial band beside the facts sidebar. Mono
//               eyebrow, modest title, hairline beneath. The original.
//   "section" — a standalone section further down the page. No eyebrow and no
//               rule: the title carries the hierarchy on its own, at display
//               size, with generous space around it. Typography is the only
//               chrome, which is the point of dropping the accordions.
//
// Renders null when there is nothing to show — no empty headings, no gaps.

type Props = {
  /** mono eyebrow; omit on "section" scale, where the title leads */
  label?: string;
  title?: string;
  body?: string[] | null;
  /** bulleted lines, e.g. Local Knowledge */
  items?: string[] | null;
  scale?: "band" | "section";
  divider?: boolean;
};

export default function EditorialSection({
  label, title, body, items, scale = "band", divider = true,
}: Props) {
  const paragraphs = (body ?? []).map(p => p?.trim()).filter(Boolean) as string[];
  const bullets    = (items ?? []).map(p => p?.trim()).filter(Boolean) as string[];
  if (paragraphs.length === 0 && bullets.length === 0) return null;

  const isSection = scale === "section";

  return (
    <section
      className={`fbs-ed ${isSection ? "fbs-ed--section" : "fbs-ed--band"}`}
      style={{ borderBottom: divider && !isSection ? "1px solid var(--border)" : undefined }}
    >
      {label && <p className="fbs-ed-label">{label}</p>}
      {title && <h2 className="fbs-ed-title">{title}</h2>}

      <div className="fbs-ed-body">
        {paragraphs.map((p, i) => (
          <p key={i} style={{ marginTop: i > 0 ? 14 : 0 }}>{p}</p>
        ))}

        {bullets.length > 0 && (
          <ul className="fbs-ed-list" style={{ marginTop: paragraphs.length ? 22 : 0 }}>
            {bullets.map((b, i) => <li key={i}>{b}</li>)}
          </ul>
        )}
      </div>

      <style>{`
        .fbs-ed{ max-width:680px; }
        .fbs-ed--band{ padding:40px 0; }
        /* Breathing room does the work the accordion chrome used to. */
        .fbs-ed--section{ padding:clamp(56px, 8vw, 90px) 0 0; }

        .fbs-ed-label{
          font-family:var(--font-mono); font-size:10px; letter-spacing:.15em;
          text-transform:uppercase; color:var(--muted); margin-bottom:16px;
        }

        .fbs-ed-title{
          font-family:var(--font-heading); font-weight:300;
          text-transform:uppercase; letter-spacing:-0.02em;
          line-height:1.02; margin:0 0 20px;
          font-size:clamp(1.6rem, 3.4vw, 2.4rem);
        }
        /* Standalone sections take the display face at a size that reads as a
           chapter opener rather than a sub-heading. */
        .fbs-ed--section .fbs-ed-title{
          font-family:var(--font-display), sans-serif;
          font-weight:500;
          font-size:clamp(1.9rem, 4.4vw, 3.1rem);
          line-height:0.98; letter-spacing:-0.01em;
          margin-bottom:26px;
        }

        .fbs-ed-body{ font-size:15px; line-height:1.75; color:var(--foreground); }
        .fbs-ed--section .fbs-ed-body{ font-size:16px; line-height:1.85; }

        .fbs-ed-list{ list-style:none; margin:0; padding:0; }
        .fbs-ed-list li{
          display:grid; grid-template-columns:20px 1fr; gap:6px;
          margin-top:14px;
        }
        .fbs-ed-list li:first-child{ margin-top:0; }
        .fbs-ed-list li::before{ content:"—"; color:var(--accent); line-height:inherit; }
      `}</style>
    </section>
  );
}
