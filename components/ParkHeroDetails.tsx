"use client";

import type { ReactNode } from "react";
import ParkWeather from "./ParkWeather";
import { catalogueIndexLabel } from "@/lib/catalogue";
import ViewTransitionBoundary from "./ViewTransitionBoundary";
import { heroTransitionNames, parkDetailTransitionNames } from "@/lib/view-transitions";

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

const MONTHS: Record<string, string> = {
  january:"01",february:"02",march:"03",april:"04",may:"05",june:"06",
  july:"07",august:"08",september:"09",october:"10",november:"11",december:"12",
};

export function fmtDate(val: string): string {
  const parts = val.trim().split(/\s+/);
  if (parts.length === 2) {
    const m = MONTHS[parts[0].toLowerCase()];
    const y = parts[1];
    if (m) return `${m}/${y}`;
  }
  if (parts.length === 1 && /^\d{4}$/.test(parts[0])) return parts[0];
  return val;
}

type Props = {
  name: string;
  catalogueId?: string;
  /** Size of the published catalogue — the "/11" half of the index badge. */
  catalogueTotal?: number;
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
  name, catalogueId, catalogueTotal, address, postcode, lat, lng, scanned, slug, compact, rightSlot,
}: Props) {
  const vt = slug ? heroTransitionNames(slug) : null;
  const vtDetail = slug ? parkDetailTransitionNames(slug) : null;

  // Shared with the homepage hero — see lib/catalogue.
  const indexLabel = catalogueIndexLabel(catalogueId, catalogueTotal);
  const areaName = address && address.length > 1 ? address[1] : address?.[0];
  const locationChain = [areaName, "London", postcode].filter(Boolean).join(", ").toUpperCase();
  const hasCoords = lat != null && lng != null;

  return (
    <>
      {/* Title. Nothing flanks it and nothing sits beside it: five different
          nav treatments were tried here across a session and every one was
          rejected in review, so prev/next moved out to the header's utility
          cluster and this is back to being only the park's name.

          It still carries the view-transition class, because the park-to-park
          title slide survived the move — the header buttons set its direction
          now. See markParkNavDirection and app/globals.css. */}
      <div className={compact ? "fbs-title-row fbs-title-row--compact" : "fbs-title-row"}>
        {named(vt?.name, <>
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
        {(indexLabel || hasCoords) && (
          <div className="fbs-field-line">
            {indexLabel && (
              named(vt?.catalogue, <>
                <span className="fbs-field-tag fbs-field-tag--cat">{indexLabel}</span>
              </>)
            )}
            {hasCoords && (
              named(vtDetail?.coords, <>
                <a
                  href={`https://maps.google.com/?q=${lat},${lng}`}
                  target="_blank" rel="noopener noreferrer"
                  className="fbs-field-tag fbs-field-tag--chip fbs-coord-tag"
                >
                  {Math.abs(lat!).toFixed(4)}° {lat! >= 0 ? "N" : "S"}, {Math.abs(lng!).toFixed(4)}° {lng! >= 0 ? "E" : "W"}
                </a>
              </>)
            )}
          </div>
        )}

        {locationChain && (
          named(vt?.address, <>
            <span className="fbs-field-tag fbs-field-tag--chip">{locationChain}</span>
          </>)
        )}

        {(scanned || hasCoords) && (
          <div className="fbs-field-line">
            {scanned && (
              named(vtDetail?.scanned, <>
                <span className="fbs-field-tag fbs-field-tag--chip">Scanned: {fmtDate(scanned)}</span>
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
