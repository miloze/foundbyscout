"use client";

import CTAButton from "./CTAButton";
import { catalogueMark } from "@/lib/catalogue";
import { formatFieldDate } from "@/lib/fieldDate";
import { parkAreaLabel } from "@/lib/parkArea";

type Props = {
  catalogueId?: string;
  name: string;
  address?: string[];
  /** The park's own area label. See lib/parkArea — this is the field, not a
   *  line of the postal address. */
  area?: string | null;
  /** Fallback for a park whose area has not been filled in yet. */
  borough?: string | null;
  postcode?: string;
  opened?: string;
  scanned?: string;
  slug?: string;
};

// The catalogue mark and the location chip are the same dark chip now — one
// above the title and one below it, bracketing the name as a single group.
// They used to be an inverted pair (light mark, dark chip) selected by a
// CHIP_VARIANT constant; with both fills the same there is nothing left to
// choose, so the constant, its `as ChipVariant` cast and the .fbs-hp-chip--inv
// rule are gone rather than left unreferenced. The park page carries its own
// copies of this chip's box metrics (see ParkHeroShell and ParkHeroDetails) and
// is unaffected.

export default function ParkHeroMeta({ catalogueId, name, address, area, borough, postcode, opened, scanned, slug }: Props) {
  // "001/", the same mark the park page and every card carry — one helper, so
  // the format cannot drift between them. This carried "(003) /11" until the
  // notations were separated: a featured park on the homepage is not a
  // position in a sequence, so there was no total for the "/11" to be true
  // against. See lib/catalogue.
  const mark = catalogueMark(catalogueId);
  // Area name (not street) reads better at hero scale — street-level detail
  // lives in the park page's "Getting there" section. This used to be
  // address[1], which is a street for three of the eleven parks; it now comes
  // from the park's own area field, falling back to the borough. See
  // lib/parkArea. `address` is untouched and still feeds "Getting there".
  const areaName = parkAreaLabel(area, borough);
  // One condensed line. "London" and the postcode are gone: the postcode area
  // is already the circle badge on this hero, and the city was never doing
  // work at this size.
  // Drops out entirely when the stored value is not a date, so the line reads
  // "WEST NORWOOD" rather than "WEST NORWOOD · SCANNED NA".
  // The name's last word, kept with the arrow. The arrow is inline so that a
  // wrapping name carries it onto the last line — but "Crystal Palace" is
  // exactly wide enough that the *arrow alone* wrapped, leaving a stray glyph
  // on a line of its own under the title. Binding the two in one nowrap span
  // makes the last word the thing that moves, so the break falls between words
  // where a reader expects it: CRYSTAL / PALACE ↘.
  const words = name.trim().split(/\s+/);
  const titleLead = words.slice(0, -1).join(" ");
  const titleTail = words[words.length - 1];

  const scannedText = formatFieldDate(scanned);
  const metaLine = [areaName, scannedText && `Scanned ${scannedText}`]
    .filter(Boolean)
    .join(" · ")
    .toUpperCase();

  // No view-transition names here any more. The park name, catalogue mark and
  // address used to carry park-name/park-cat/park-address-{slug}, matching the
  // park page so the three morphed across the navigation.
  //
  // Two reasons they are gone. The morph read as glitchy in practice — the
  // title flew into place while the destination hero was still resolving
  // behind it, so the one composed thing on screen was the piece that moved.
  // And it was the source of "two <ViewTransition name=...> mounted at the
  // same time": these names and the park page's are identical by design, and
  // an App Router view transition mounts both route trees at once, so React
  // saw two of each. Home to park is a plain crossfade now — see the root
  // timing in app/globals.css.

  return (
    <div className="fbs-hp-frame">
      {/* One group, not three positioned objects: catalogue mark, park name and
          location chip share a left edge and a tight column gap, so the whole
          thing grows and shrinks as a unit when the name wraps. The CTA is the
          group's sibling and is centred on it, which is what puts it beside the
          name at desktop and below the location line once the row folds.

          fbs-he-* are the homepage entrance's hooks. They carry no styling of
          their own and do nothing unless an ancestor sets data-hero-entrance,
          which only the home hero does on a first visit — see
          components/HeroEntrance. */}
      <div className="fbs-hp-group">
        {/* Above the title, not below it. The mark identifies the frame before
            the name is read, and stacked under the name it used to sit
            immediately above the address chip where "006/ BRIXTON" parses as
            the start of a street address. */}
        {mark && <span className="fbs-hp-chip fbs-he-badge">{mark}</span>}

        {/* 500, not 300. --font-display starts with 'MSCHN Medium', a locally
            installed static cut, so on a machine that has the MSCHN family this
            element matched a single-face family and font-weight did nothing —
            it rendered Medium whatever was declared. Every other device fell
            through to the variable webfont and honoured the 300, which is why
            the name was Medium on desktop and Light on iPad off one stylesheet.
            Measured: the VF's italic at wght 500 is 527.9px on BLOBLANDS at
            100px, exactly the installed Medium's width, so this is the weight
            desktop was already showing rather than a new decision.
            Keep in step with .fbs-title in ParkHeroDetails — the two names morph
            into each other and a weight change mid-flight is visible. */}
        <div className="fbs-he-title fbs-hp-title">
          {titleLead && `${titleLead} `}
          <span className="fbs-hp-title__tail">
            {titleTail}
            {/* Decoration, and inline on purpose. It sits in the text flow after
                the name, so a name long enough to wrap carries it onto the last
                line instead of leaving it stranded against the CTA — and it
                needs no width of its own reserved in the row. Not a link and not
                a button: the CTA it points at is the only interactive thing
                here, and a second control with the same destination is what the
                old standalone glyph was removed for. */}
            {/* The font's own glyph, not a drawing of one. MSCHN carries
                U+2198 in every cut including the variable file we actually
                load (gid 663, a composite, bbox 39,103-574,638 on a 1000 em),
                so the SVG that used to stand here was reproducing something
                the typeface already had - at its own stroke weight, which is
                why it never quite sat with the name. Inheriting means it takes
                the title's family, weight, slant and colour by construction.
                Size is deliberately left at the inherited em for now: see the
                note on .fbs-hp-arrow. */}
            <span className="fbs-hp-arrow" aria-hidden="true">&#x2198;</span>
          </span>
        </div>

        {/* The location and scan date used to be two untreated lines sitting
            straight on the photo, which vanished over bright concrete. */}
        {metaLine && <span className="fbs-hp-chip fbs-hp-chip--flow fbs-he-chip">{metaLine}</span>}
      </div>

      {/* CTA — the caret lives in the button, and the hero's own arrow above
          leads the eye to it rather than duplicating it. Shared with VIEW ALL
          PARKS further down the homepage; all of its styling and interaction
          lives in .fbs-cta. */}
      {slug && <CTAButton label="Explore park" href={`/parks/${slug}`} />}

      <style>{`
        /* The frame's lower block: one title group, one CTA.

           align-items:center rather than flex-end. The CTA is centred on the
           whole group — mark, name and location chip — which is what sets it on
           the name's own line rather than on the bottom of the block, and it
           stays centred as the name wraps to a second line instead of sliding
           down with the chip. */
        .fbs-hp-frame {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: clamp(20px, 3vw, 56px);
        }

        /* Mark, name and chip as one column on one left edge. flex-start so
           each shrinks to its own content instead of stretching to the widest;
           min-width:0 so a long name wraps inside the row rather than pushing
           the CTA off the frame's right inset.

           8px, tightened from the 18px that used to sit under the name alone.
           The gap is deliberately smaller than the chips' own height so the two
           read as attached to the title rather than as a caption under it —
           with the title's 0.9 line-height the visual gap lands nearer 20px. */
        .fbs-hp-group {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 8px;
          min-width: 0;
          /* Bounded by the column, so the chip's own max-width has the column
             to measure against. Without this the group takes its width from the
             title, and at 320px "BLOBLANDS" plus the arrow is 345px against a
             288px column — so a chip capped at 100% of the group was still 57px
             wide of the frame. Capping the box does not move the title: its
             text is left-aligned and does not wrap, so the same glyphs land in
             the same places and simply overhang the box, exactly as they do
             today at that width. */
          max-width: 100%;
          box-sizing: border-box;
        }

        /* Wrapping is the point. A name that does not fit the row breaks onto a
           second line and the group grows upward — the hero is bottom-aligned —
           rather than colliding with the CTA or being scaled per park. */
        .fbs-hp-title {
          font-family: var(--font-display), Arial, sans-serif;
          font-weight: 500;
          font-style: italic;
          font-size: clamp(3.5rem, 11vw, 9rem);
          line-height: 0.9;
          color: #fff;
          text-transform: uppercase;
          letter-spacing: 0em;
          /* No text-shadow: the shadow only softened the italic's edges, and
             the blur panel that briefly replaced it read worse over real
             photography. Plain white type on the image, as before. */
        }
        /* The name's last word and the arrow travel together — see the split
           in the component. */
        .fbs-hp-title__tail { white-space: nowrap; }

        /* Sized in em so it tracks the name at every breakpoint, and set on the
           text baseline so the head lands below the cap line and points out of
           the group toward the CTA. */
        .fbs-hp-arrow {
          /* A glyph now, not an <svg>, so the reset's display:block no longer
             applies and there is no box to size - the arrow is however big
             MSCHN draws it at the title's size. Measured on the running site
             at the hero's 144px: the glyph advances 93px and draws 77px of ink
             (bbox 535/1000 em), against the SVG's 104px box carrying about
             62px once its 1.9-unit stroke is counted - so the swap alone made
             the arrow roughly a quarter LARGER, not smaller. An earlier draft
             of this note said the opposite; it compared glyph ink to SVG box.
             No font-size adjustment applied.
             Kept inline-block for the margin and the baseline nudge, both
             carried over unchanged. */
          display: inline-block;
          margin-left: 0.16em;
          vertical-align: -0.06em;
        }

        /* Metadata chip and catalogue mark share every dimension and every
           colour — one chip above the name and one below it. Solid fill, not a
           blur or a full-width scrim: both of those were tried on this hero and
           reversed. Radius is kept square rather than reading as a pill.

           Inset is 2px/6px, tightened from 3px/8px. Type is untouched at 11px;
           the intent is to reduce the chips' visual weight, not their
           legibility. In the stacked layout the CTA drops directly beneath the
           location chip, and at 3/8 the two filled boxes sat close enough in
           weight to the button that the metadata competed with it. 2px off the
           height and 4px off the width is a smaller change than it sounds —
           whether it settles the hierarchy is a judgement to make on the
           rendered page, not something these numbers establish.

           This is the home hero's chip and nothing else. ParkHeroShell and
           ParkHeroDetails carry their own copies for the park page's tags —
           those still use 3px/8px and are deliberately not changed here, so the
           two are no longer identical boxes. See the note on .fbs-field-tag. */
        .fbs-hp-chip {
          display: inline-block;
          font-family: var(--font-mono);
          font-size: 11px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          white-space: nowrap;
          padding: 2px 6px;
          border-radius: 3px;
          background: rgba(20,18,15,0.82);
          color: #F3EFEC;
        }

        /* The location line, and only the location line. The catalogue mark is
           four characters from a fixed format and keeps the base chip's
           nowrap; this one carries an area name plus a scan date from the
           record, and at 320px the chip has room for about 38 characters
           before it leaves the column — which "Kensington and Chelsea ·
           Scanned 05/2026" (40) already exceeds. Past roughly 43 it reached the
           viewport edge and the hero's overflow:hidden cut it with no ellipsis
           and no scrollbar, so a value would have gone missing with nothing to
           show for it.

           Nothing here forces a break: shrink-to-fit still gives the chip its
           content width whenever that fits, so every current record stays on
           one line exactly as before. max-width and border-box are what bind it
           to the column, and overflow-wrap only comes into play for a single
           unbroken token longer than the column — a case no real value has, and
           the one thing max-width alone cannot contain.

           Type, inset, fill, colour and radius are the base chip's, untouched. */
        .fbs-hp-chip--flow {
          max-width: 100%;
          box-sizing: border-box;
          white-space: normal;
          overflow-wrap: anywhere;
        }

        /* The CTA's own styling is in globals.css under .fbs-cta — it is
           shared with VIEW ALL PARKS. Only this hero's layout of it belongs
           here.

           The fold is where the two stop fitting side by side, not a device
           width: below this the row becomes a column and the CTA lands under
           the whole group — under the location chip, not between it and the
           name — with the group's own order untouched. */
        @media (max-width: 860px) {
          .fbs-hp-frame {
            flex-direction: column;
            align-items: flex-start;
            /* 24px flat, not clamp(16px, 4vw, 24px) — which resolved to 16px on
               every phone, since 4vw is 15.6px at 390. This gap is the only
               thing separating the CTA from the location chip once the row
               folds, and 16px is the same order as the 8px inside the group, so
               the button read as the group's third line. It sits on the frame,
               outside the group, so the mark/title/chip spacing is untouched. */
            gap: 24px;
          }
          /* A real touch target for the one control in the hero. The shared
             .fbs-cta is 31px tall (11px type, 7px inset) and is left alone —
             this raises only the hero's own instance, and only in the stacked
             layout, where the CTA stands by itself and is the thing a thumb
             goes for. Padding, fill, label and chevron are untouched; the
             button is inline-flex and already centres its content, so the extra
             height is distributed either side of the label rather than
             offsetting it. */
          .fbs-hp-frame .fbs-cta { min-height: 44px; }
        }
        /* Below 390px the title cannot hold its floor.

           The display size is clamp(3.5rem, 11vw, 9rem), and 11vw drops under
           3.5rem at about 509px — so from there down the type is a fixed 56px
           against a column that keeps narrowing. A name that is one word cannot
           wrap, so at 320px (288px of column) STOCKWELL measured 303px of ink
           and BLOBLANDS 296px; with the arrow attached the two ran 368px and
           361px, and the hero's overflow:hidden cut 48px and 41px off them.
           Nothing indicated the name was incomplete.

           The arrow goes first, because it is decoration and it is 49px of the
           overflow — more than either name was over the column by. That alone
           fixes 335px and up.

           Below that the floor has to give as well, and it gives against the
           column rather than against the viewport: the term is the column's own
           width over 5.8, which is the widest single word in the catalogue
           measured against its font size (STOCKWELL, 5.41) plus headroom for
           the italic's overhang. It is one rule for every park — no name is
           measured at render and none gets a size of its own. A longer single
           word than STOCKWELL would need this divisor revisited; a longer
           multi-word name would not, since those wrap.

           min(), so the reduction only applies where it is needed: the second
           term passes 3.5rem at about 335px, and from there to 390px the title
           is the approved 56px with the arrow simply hidden. At 390px and above
           nothing in this block applies at all. */
        @media (max-width: 389.98px) {
          .fbs-hp-arrow { display: none; }
          .fbs-hp-title {
            font-size: min(
              3.5rem,
              calc((var(--vw, 100vw) - 2 * var(--content-padding)) / 5.8)
            );
          }
        }
      `}</style>
    </div>
  );
}
