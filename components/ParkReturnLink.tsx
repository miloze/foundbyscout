"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { readDirectoryOrigin, type ExploreMode } from "./parksGridState";

/**
 * The way back to the directory, in the park hero above the title.
 *
 * Inside the hero rather than in a row of its own above it. A separate row
 * pushed the whole hero down by its full height for a link that belongs to the
 * park's identity block — the return, the name, the catalogue mark and the
 * address read as one group.
 *
 * Three destinations, decided by how this page was reached:
 *
 *   Back to map   — this park was opened from the map
 *   Back to grid  — this park was opened from the grid
 *   View on map   — everything else: a direct visit, a shared link, a new
 *                   tab, or a park reached from outside the directory
 *
 * The first two restore the browsing session (see parksGridState). The third
 * opens the directory map focused on this park, so it is a real destination
 * rather than an apology. A park with no coordinates cannot be focused, so it
 * gets the plain directory — no invented location.
 *
 * All three are labelled. An arrow-only variant was tried for the two return
 * cases on the reasoning that coming back from a view you were just in needs
 * no words; it was dropped because the three states then differed in two ways
 * at once — where they go *and* whether they say so — and the control changed
 * shape as well as wording depending on how you arrived. One shape, three
 * labels, is easier to trust.
 *
 * Deliberately not history.back(). A park page can be the first entry in a
 * tab's history, or arrived at from a search engine, and "back" then means
 * leaving the site. Normal browser Back still behaves normally; this is a
 * second, explicit route that always lands somewhere known.
 */
export default function ParkReturnLink({
  slug, hasCoords,
}: {
  slug: string;
  /** False when the park's row has no usable lat/lng. */
  hasCoords: boolean;
}) {
  // The origin lives in sessionStorage, which the server cannot see, so the
  // server snapshot is null and this resolves on the client. That order is
  // deliberate: null renders the labelled fallback, which is valid for every
  // reader, so nobody is shown a broken control while it settles.
  //
  // useSyncExternalStore rather than a mount effect that calls setState:
  // reading a client-only store in an effect is the cascading-render pattern
  // React lints against, and this is the supported way round it.
  // parksGridState already reads the query string the same way (useUrlParam).
  const origin = useSyncExternalStore<ExploreMode | null>(
    () => () => {},
    () => readDirectoryOrigin(slug)?.mode ?? null,
    () => null,
  );

  const { href, label } =
    origin === "grid"    ? { href: "/parks?mode=grid", label: "Back to grid" }
  : origin === "explore" ? { href: "/parks",           label: "Back to map"  }
  : hasCoords            ? { href: `/parks?park=${encodeURIComponent(slug)}`, label: "View on map" }
  :                        { href: "/parks",           label: "Back to parks" };

  return (
    <div className="fbs-return">
      <style>{`
        /* The map preview's opening arrow, reversed. Same glyph pair (MSCHN
           carries both horizontals), same 23px, same accent, same 44px target,
           same 4px nudge on the same easing — the only differences are the
           direction it points and the direction it travels. Two controls that
           mean "open this park" and "back where I was" should read as the same
           kind of object.

           --accent, not --pda-accent: the latter is declared on the
           directory's .pda-root and does not exist on a park page. */
        .fbs-return a{
          display:inline-flex; align-items:center; justify-content:center;
          gap:9px;
          min-width:44px; min-height:44px;
          color:var(--accent); text-decoration:none;
          transition:transform 170ms cubic-bezier(0.2, 0, 0, 1);
        }
        .fbs-return__arrow{
          font-family:var(--font-display), Arial, sans-serif;
          font-size:23px; line-height:1;
        }
        /* Orange on a greyscale scan is a strong hue contrast but a weak
           luminance one, and several of these scans are pale concrete corner
           to corner. The hero's bottom scrim does most of the work; these
           tighten each mark's own edge so it holds on the brightest of them
           without needing a plate behind it. */
        .fbs-return__arrow,
        .fbs-return__label{
          text-shadow:0 1px 3px rgba(0,0,0,.6), 0 2px 12px rgba(0,0,0,.45);
        }
        .fbs-return__label{
          font-family:var(--font-mono);
          font-size:11px; font-weight:500;
          letter-spacing:.1em; text-transform:uppercase;
        }
        /* Right padding gives the label room without the arrow's touch target
           overhanging the title's left edge — the mark, not the box, is what
           lines up with the name below. */
        .fbs-return a{ padding-right:10px; }

        /* Travels the way it points — the opening arrow's nudge, mirrored. */
        @media (hover: hover){
          .fbs-return a:hover{ transform:translateX(-4px); }
        }
        .fbs-return a:focus-visible{
          outline:2px solid var(--accent); outline-offset:-5px; border-radius:5px;
        }
        @media (prefers-reduced-motion: reduce){
          .fbs-return a{ transition:none; }
        }
      `}</style>
      {/* No aria-label: the visible words are the accessible name, which is
          what a screen reader and a sighted reader should be hearing and
          seeing the same of. */}
      <Link href={href}>
        <span className="fbs-return__arrow" aria-hidden>←</span>
        <span className="fbs-return__label">{label}</span>
      </Link>
    </div>
  );
}
