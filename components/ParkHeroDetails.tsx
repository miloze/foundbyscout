"use client";

import type { ReactNode } from "react";
import Coords from "./Coords";
import { formatFieldDate } from "@/lib/fieldDate";
import ParkWeather from "./ParkWeather";
import { catalogueMark } from "@/lib/catalogue";
import ViewTransitionBoundary from "./ViewTransitionBoundary";
import { parkTitleTransitionName, parkDetailTransitionNames } from "@/lib/view-transitions";

/**
 * The park's identity block — name, catalogue index, address, coordinates,
 * scan date and surface condition.
 *
 * Extracted because it is now rendered in two places: the hero, and the mobile
 * 3D viewer, which used to replace it with a single small park-name label. The
 * viewer is the same park; presenting it with a second, smaller treatment of
 * the same facts was the inconsistency the whole overlay redesign set out to
 * remove, and on mobile it read as the text disappearing when you opened the
 * scan.
 *
 * `slug` is what decides whether the elements carry view-transition names, and
 * it is deliberately optional. A view-transition-name has to be unique in the
 * document: with the hero mounted behind the viewer, rendering a second copy
 * of the named elements would break the home to park morph rather than extend
 * it. The hero passes a slug; the viewer does not.
 */


type Props = {
  name: string;
  catalogueId?: string;
  address?: string[];
  postcode?: string;
  lat?: number;
  lng?: number;
  scanned?: string;
  /** Present only where these elements own the page's transition names. */
  slug?: string;
  /** Smaller title, for the viewer where the model is the subject. */
  compact?: boolean;
  /** Sits opposite the field rows on the same baseline — the hero's control
   *  cluster. Omitted in the viewer, which carries its own controls. */
  rightSlot?: ReactNode;
};

// A plain function, not a component declared in the body of another one:
// defining it inline gives React a new component type every render, which
// remounts the whole subtree each time — and remounting is exactly what the
// view transition must not do to the title.
function named(name: string | undefined, children: ReactNode) {
  return name ? <ViewTransitionBoundary name={name}>{children}</ViewTransitionBoundary> : children;
}

export default function ParkHeroDetails({
  name, catalogueId, address, postcode, lat, lng, scanned, slug, compact, rightSlot,
}: Props) {
  // Title only. See lib/view-transitions — this is the park-to-park slide,
  // not the retired home-to-park morph.
  const titleName = slug ? parkTitleTransitionName(slug) : undefined;
  const vtDetail = slug ? parkDetailTransitionNames(slug) : null;

  // The catalogue mark, not the index badge. This row names the park; it is
  // not a position in a walk, so the "/11" the badge used to carry was
  // counting against a sequence that is not here. The prev/next cluster in
  // ParkHeroShell is the one place that total is true — see lib/catalogue.
  const mark = catalogueMark(catalogueId);
  const areaName = address && address.length > 1 ? address[1] : address?.[0];
  const locationChain = [areaName, "London", postcode].filter(Boolean).join(", ").toUpperCase();
  const hasCoords = lat != null && lng != null;
  // Null unless the stored value is genuinely a date, so an unscanned park
  // shows no chip rather than a chip reading "NA".
  const scannedText = formatFieldDate(scanned);

  return (
    <>
      {/* Title. Nothing flanks it and nothing sits beside it: five different
          nav treatments were tried here across a session and every one was
          rejected in review, so prev/next moved out to the header's utility
          cluster and this is back to being only the park's name.

          It still carries a view-transition name and class, and that is now
          the only reason either exists: the park-to-park slide, set by the
          header's prev/next buttons. The home-to-park morph this name once
          also served is gone. See markParkNavDirection and app/globals.css. */}
      <div className={compact ? "fbs-title-row fbs-title-row--compact" : "fbs-title-row"}>
        {named(titleName, <>
          <span className="fbs-title">{name}</span>
        </>)}
      </div>

      {/* Three rows. The index no longer shares a line with the address: read
          inline, "(003) DULWICH, LONDON" parsed as a house number and the
          catalogue position disappeared into the street. It sits with the
          coordinates instead — both are ways of saying where this park is in
          a system rather than on a street — leaving the address a line of its
          own and the scan date paired with the surface condition. */}
      <div className="fbs-hero-meta">
      <div className="fbs-hm-left">
      <div className="fbs-field-row">
        {(mark || hasCoords) && (
          <div className="fbs-field-line">
            {/* No transition name. This paired with the homepage badge to
                morph the mark across the navigation; that pairing is gone and
                a name with nothing to pair against would only give this chip a
                fade of its own, out of step with the frame around it. */}
            {mark && <span className="fbs-field-tag fbs-field-tag--cat">{mark}</span>}
            {/* The formatting and the Maps link now come from <Coords>, shared
                with the homepage's Found Object. The classes and therefore the
                appearance are unchanged and still styled below — only the
                string-building moved. */}
            <Coords
              lat={lat}
              lng={lng}
              className="fbs-field-tag fbs-field-tag--chip fbs-coord-tag"
              wrap={node => named(vtDetail?.coords, node)}
            />
          </div>
        )}

        {/* Likewise unnamed — it paired with the homepage's address chip. */}
        {locationChain && (
          <span className="fbs-field-tag fbs-field-tag--chip">{locationChain}</span>
        )}

        {(scannedText || hasCoords) && (
          <div className="fbs-field-line">
            {scannedText && (
              named(vtDetail?.scanned, <>
                <span className="fbs-field-tag fbs-field-tag--chip">Scanned: {scannedText}</span>
              </>)
            )}
            {hasCoords && (
              <div className="fbs-cond-desktop">
                <ParkWeather lat={lat!} lng={lng!} />
              </div>
            )}
          </div>
        )}
      </div>
      </div>
      {rightSlot && <div className="fbs-hm-right">{rightSlot}</div>}
      </div>

      {/* Travels with the markup rather than living in the hero's style block,
          so this renders identically wherever it is mounted. Mounting it twice
          only restates the same rules. */}
      <style>{`
        /* --- Title -------------------------------------------------------- */
        .fbs-title-row {
          --fbs-title-size: clamp(34px, 5.5vw, 60px);
          margin-bottom: 20px;
        }
        .fbs-title-row--compact {
          --fbs-title-size: clamp(26px, 7vw, 38px);
          margin-bottom: 14px;
        }
        .fbs-title {
          /* inline-block, not inline: a name long enough to wrap must still be
             a single box — an element fragmented across lines cannot carry a
             view-transition-name, and the home to park morph would stop dead
             without anything visibly breaking. */
          display: inline-block;
          font-family: var(--font-display), Arial, sans-serif;
          font-weight: 300;
          /* Italic, matching the home hero exactly. Without it this rendered
             MSCHN's upright cut — a real second face, not a fallback, since
             colors_and_type.css declares normal and italic @font-face blocks
             off the same variable file. That made the shared-element morph
             change letterform mid-flight instead of only repositioning. */
          font-style: italic;
          font-size: var(--fbs-title-size);
          line-height: 0.88;
          color: #fff;
          text-shadow: 0 2px 24px rgba(0,0,0,0.25);
          text-transform: uppercase;
          letter-spacing: 0em;
          /* Names the title to the slide rules in globals.css without pinning a
             fixed view-transition-name, which React sets per slug. */
          view-transition-class: park-title;
        }

        /* Fills the weather pill to match the metadata chips beside it. Scoped
           here so the directory accordion keeps ParkWeather's lighter default. */
        .fbs-hero-meta { --fbs-weather-bg: rgba(20,18,15,0.82); }

        .fbs-hero-meta {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 32px;
        }
        .fbs-hm-left { flex: 1; min-width: 0; }
        .fbs-hm-right {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 10px;
          flex-shrink: 0;
          margin-bottom: 1px;
        }
        @media (max-width: 767px) {
          .fbs-hero-meta { flex-direction: column; align-items: stretch; gap: 14px; }
          .fbs-hm-right { flex-direction: row; align-items: center; justify-content: space-between; }
        }
        .fbs-field-row {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 8px;
        }
        /* flex-start rather than center because row 3 pairs a single-line tag
           with the weather block, which is a pill over a timestamp — centring
           would float the tag between the two instead of lining it up. */
        .fbs-field-line {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          flex-wrap: wrap;
        }
        /* Box metrics are the home hero's .fbs-hp-chip, to the pixel: 11px
           type on a 16.5px line box, 3px of vertical inset and 8px of
           horizontal. The 1px border is counted as part of the inset rather
           than added to it, so the filled and outlined variants are the same
           height as each other and as the home chips. Change padding and
           border together or the match breaks. */
        .fbs-field-tag {
          display: inline-flex;
          align-items: center;
          font-family: var(--font-mono);
          font-size: 11px;
          /* A length, not a ratio, and not left to the font: it is what makes
             every tag exactly the same height. Inherited as a computed length,
             so the coordinate link's smaller ↗ gets the same 16.5px line box as
             11px text instead of a 10px-derived one — otherwise that one tag
             sits a hair short of the rest. */
          line-height: 16.5px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: .08em;
          color: rgba(255,255,255,0.7);
          border: 1px solid rgba(255,255,255,0.25);
          padding: 2px 7px;
          text-decoration: none;
        }
        /* The address line's backer, carried over from the home hero, so the
           element travelling in from the homepage does not arrive with its
           chip dissolving mid-flight. */
        .fbs-field-tag--chip {
          background: rgba(20,18,15,0.82);
          border-color: transparent;
          border-radius: 3px;
          color: #F3EFEC;
        }
        /* The index badge, matching the home hero's inverted chip: light
           plate, dark number, 3px radius. */
        .fbs-field-tag--cat {
          background: rgba(243,239,236,0.82);
          border-color: transparent;
          border-radius: 3px;
          color: #14120f;
        }
        .fbs-coord-tag { gap: 5px; }
        .fbs-coord-tag::after { content: "↗"; font-size: 10px; opacity: .7; }
        .fbs-coord-tag:hover { color: #fff; border-color: var(--accent); }
        .fbs-coord-tag:hover::after { opacity: 1; }
        /* flex, not the default block: the weather block inside is
           inline-flex, so as a block child it sat on a text baseline and
           picked up ~2.75px of leading above it. */
        .fbs-cond-desktop { display: flex; }
        .fbs-cond-mobile { display: none; }
        @media (max-width: 767px) {
          .fbs-cond-desktop { display: none; }
          .fbs-cond-mobile { display: flex; }
        }
      `}</style>
    </>
  );
}
