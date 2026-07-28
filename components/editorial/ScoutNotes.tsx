// Scout Notes — 3–5 observations, set as magazine pull-quotes.
//
// Composition follows the supplied reference: an oversized coral opening mark
// hanging in a left gutter, the observation in Rubik Light Italic, and a
// matching closing mark trailing the last line.
//
// Type:
//   · marks — var(--font-display), i.e. 'MSCHN Medium' → 'MSCHN' → 'Rubik'.
//     MSCHN has no file in public/fonts, so it renders only for people who
//     have it installed locally and everyone else gets Rubik 500. Using the
//     token rather than naming MSCHN directly means these pick it up the day
//     the licensed cut ships, with no change here.
//   · text — Rubik Light Italic (--font-heading, 300, italic). It must come
//     from a family with a real italic: --font-body (Geist) has none loaded, so
//     font-style:italic on it yields a synthesised oblique, identical advance
//     widths to the upright and visibly mechanical at reading size.
//
// The closing mark is inline so it trails the final word wherever that falls,
// with line-height:0 so a 42px glyph cannot inflate the last line's box.
//
// No rules — not between the notes, and none closing the block. Whitespace
// carries the rhythm throughout. Whatever follows owns its own separation.
//
// Both marks are aria-hidden: they are decorative punctuation, and the prose
// reads as a quotation without them being announced. Still a real <ol> so the
// count and position are. Renders null when empty.

type Props = {
  label?: string;
  notes?: string[] | null;
};

export default function ScoutNotes({ label = "Scout notes", notes }: Props) {
  const items = (notes ?? []).map(n => n?.trim()).filter(Boolean) as string[];
  if (items.length === 0) return null;

  return (
    <section
      className="fbs-notes"
      style={{ paddingTop: 64, paddingBottom: 64 }}
    >
      <div style={{ maxWidth: 680 }}>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 34 }}>
          {label}
        </p>

        <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {items.map((note, i) => (
            <li key={i} className="fbs-note">
              <span className="fbs-q fbs-q-open" aria-hidden>&ldquo;</span>
              <p className="fbs-note-text">
                {note}
                <span className="fbs-q fbs-q-close" aria-hidden>&rdquo;</span>
              </p>
            </li>
          ))}
        </ol>
      </div>

      <style>{`
        .fbs-note{
          display:grid; grid-template-columns:48px 1fr; gap:10px;
          align-items:start; margin-top:38px;
        }
        .fbs-note:first-child{ margin-top:0; }

        .fbs-q{
          /* the token already ends in a generic family — don't append another */
          font-family:var(--font-display);
          font-weight:500; color:var(--accent);
          line-height:1; user-select:none;
        }
        /* Nudged up so the glyph's shoulder sits level with the cap height of
           the first line rather than its baseline. */
        .fbs-q-open{
          font-size:44px; display:block; margin-top:-4px; text-align:right;
        }
        /* line-height:0 keeps the oversized glyph from inflating the last line
           box; the negative vertical-align drops it to sit under the baseline,
           as in the reference. */
        .fbs-q-close{
          font-size:38px; display:inline-block; line-height:0;
          vertical-align:-0.34em; margin-left:8px; white-space:nowrap;
        }

        .fbs-note-text{
          font-family:var(--font-heading), sans-serif;
          font-style:italic; font-weight:300;
          font-size:17px; line-height:1.66;
          letter-spacing:-0.005em; color:var(--foreground); margin:0;
        }

        @media (max-width: 640px){
          .fbs-note{ grid-template-columns:32px 1fr; gap:8px; margin-top:30px; }
          .fbs-q-open{ font-size:32px; margin-top:-2px; }
          .fbs-q-close{ font-size:28px; margin-left:6px; vertical-align:-0.3em; }
          .fbs-note-text{ font-size:16px; }
        }
      `}</style>
    </section>
  );
}
