// Pull quote — the editorial column's closer, between the Introduction copy
// and the photo grid.
//
// It exists to fill the gap the facts sidebar leaves: At a Glance plus the
// fact rows run shorter than the introduction, and the editorial band is a
// two-column grid, so the left column ends well above the photos. Closing that
// by shrinking the photography was rejected — full-bleed image scale is held
// everywhere else on the page — so the copy grows into it instead.
//
// Type is deliberately the loudest thing in the column, and deliberately not
// ScoutNotes:
//   · This is --font-display (MSCHN) italic at 600, the park name's own face,
//     scaled to compete with the photography below it.
//   · Scout Notes further down the page is Rubik Light italic at 17px with
//     oversized coral marks.
// Two quote treatments on one page only work if they are unmistakably
// different registers, which is why this one carries no quote marks at all —
// scale and weight do the work, and the marks stay Scout Notes' signature.
//
// Sentence case, not the hero's uppercase: the hero sets one or two words and
// this sets a sentence, where caps at this size stop being a voice and start
// being a shout. The italic and the weight carry the identity instead.

type Props = {
  quote?: string | null;
  attribution?: string | null;
};

export default function PullQuote({ quote, attribution }: Props) {
  const text = quote?.trim();
  // No quote, no block, no gap-filling placeholder — the column simply ends
  // where it used to for parks that have not been given one.
  if (!text) return null;

  const credit = attribution?.trim();

  return (
    <figure className="fbs-pq">
      <blockquote className="fbs-pq-text">{text}</blockquote>
      {credit && <figcaption className="fbs-pq-credit">{credit}</figcaption>}

      <style>{`
        /* Sits inside the editorial band's left column, under the
           Introduction's own hairline. The asymmetric padding lets it breathe
           away from the copy above without pushing the column past the
           sidebar's height, which is the whole reason it is here. */
        .fbs-pq{ max-width:680px; margin:0; padding:36px 0 8px; }

        .fbs-pq-text{
          /* the token already ends in a generic family — don't append another */
          font-family:var(--font-display);
          /* Real drawn italic off the variable file's ital axis, not a
             synthesised shear — see the two @font-face blocks in
             colors_and_type.css. */
          font-style:italic;
          /* 600 is MSCHN L. The face's wght axis runs 300–700, so this is a
             real instance rather than a faux-bolded 300. */
          font-weight:600;
          font-size:clamp(1.75rem, 3.6vw, 2.75rem);
          line-height:1.06;
          letter-spacing:-0.015em;
          color:var(--foreground);
          margin:0;
          /* MSCHN's italic leans hard; without this the first glyph's overhang
             sits left of the column's edge and breaks the alignment every
             other block on the page keeps. */
          text-indent:-0.02em;
        }

        /* The site's metadata language, same as the At a Glance captions and
           the fact-row labels: DM Mono, uppercase, muted. The em dash is the
           attribution marker, so a handle reads as credited rather than as a
           stray second line of quote. */
        .fbs-pq-credit{
          font-family:var(--font-mono); font-size:10px; font-weight:400;
          letter-spacing:0.12em; text-transform:uppercase;
          color:var(--muted); margin-top:18px;
        }
        .fbs-pq-credit::before{ content:"— "; }

        @media (max-width: 768px){
          .fbs-pq{ padding:28px 0 0; }
          .fbs-pq-credit{ margin-top:14px; }
        }
      `}</style>
    </figure>
  );
}
