"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ParkCard, PARK_CARD_CSS } from "./ParkCard";
import { filterParks, getParkImageCandidates, useParksIndex, type ParkIndexRow } from "./parksIndex";
import { DENSITIES, useGridScrollRestore, useUrlParam, type GridDensity } from "./parksGridState";
import { debugAllowed } from "@/lib/debugMode";
// Type-only, so lib/parkImages (which reads the filesystem) never reaches the
// browser bundle — the audit arrives over /api/dev/park-images instead.
import type { ParkAudit, SlotAudit } from "@/lib/parkImages";

// ── Parks Grid ───────────────────────────────────────────────────────────
// The third browsing mode: a full-width photographic contact sheet. Regular
// grid, not masonry — every park gets the same cell, so the sheet reads as an
// index rather than a feed, and density changes scale only.
//
// A tile is a FRAME and a CAPTION, in that order, and they do not overlap.
// Identification lives beneath the photograph the way a plate number lives in
// the margin of a contact sheet — permanently, at every width, on every
// pointer type. It used to be an overlay revealed on hover, which failed in
// both directions at once: on a desktop sheet at rest the grid contained
// literally zero characters of text, so nothing was identifiable without
// hovering it one tile at a time; on touch the same block was permanent and
// therefore sat on the photograph, taking 45-56% of the frame at the denser
// sizes. Both were the same decision — label and image competing for the same
// pixels — so both are answered by moving the label off the image.
//
// Consequently the photograph is never drawn on. No scrim, no gradient, no
// title over the image, and no card around the pair: no border, no radius, no
// shadow, no plate, no CTA. The frame plus its caption is the whole link.
//
// Built to mount either standalone (app/parks/grid-preview) or nested inside
// .pda-root on /parks. The --pda-* block below and PARK_CARD_CSS are therefore
// redeclared here at the same values the accordion sets; nested, they resolve
// identically and nothing changes.

// How many tiles are added each time the sentinel comes into view. Mounted DOM
// then grows with how far you have actually scrolled instead of with the size
// of the archive — see the note on windowing at the bottom of this file.
const PAGE = 60;
const INITIAL = 60;

// Column counts are per density and per breakpoint. They are set in one place
// because `sizes` below has to describe the same layout to the image optimiser
// — if these drift apart the browser downloads the wrong tier.
// Unchanged by the caption: captions cost vertical space, not horizontal, so
// there is no reason to fit more columns now that they exist. Photography
// stays the dominant material at both densities.
const COLS: Record<GridDensity, [number, number, number]> = {
  large:  [1, 2, 3],
  medium: [2, 3, 4],
};

// Matches COLS: <640 mobile, <1100 tablet, else desktop.
const SIZES: Record<GridDensity, string> = {
  large:  "(max-width: 639px) 100vw, (max-width: 1099px) 50vw, 33vw",
  medium: "(max-width: 639px) 50vw,  (max-width: 1099px) 33vw, 25vw",
};

export default function ParksGridView({
  search = "",
  density,
  onDensityChange,
  gap,
  ratio,
  multiply = 1,
}: {
  search?: string;
  density: GridDensity;
  onDensityChange: (d: GridDensity) => void;
  /** Gutter override in px, for the preview harness only. Left unset, the
   *  sheet uses --park-image-gap, the token the homepage thumbnail strip also
   *  reads, so the two grids cannot drift apart. */
  gap?: number;
  /** Tile aspect-ratio override, e.g. "16 / 10". Preview harness only — the
   *  shipped value is --pgv-ratio in the stylesheet below. */
  ratio?: string;
  /** Synthetic scale factor — duplicates the real rows. Test harness only. */
  multiply?: number;
}) {
  const { parks, status } = useParksIndex();
  const [visible, setVisible] = useState(INITIAL);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // ?debug=1 — the same flag the park page's GLB viewer uses. Gated on the
  // environment as well, so appending it to a production URL does nothing:
  // debugAllowed() is a build-time constant, so in a production bundle the
  // indicator and every file path in it are dead code.
  const debugParam = useUrlParam("debug");
  const debug = debugAllowed() && debugParam === "1";
  const audit = useImageAudit(debug);

  const displayed = useMemo(() => {
    const filtered = filterParks(parks, search);
    if (multiply <= 1) return filtered.map(p => ({ park: p, key: p.id }));
    return Array.from({ length: multiply }, (_, copy) =>
      filtered.map(p => ({ park: p, key: `${p.id}-${copy}` }))
    ).flat();
  }, [parks, search, multiply]);

  // A new search is a new sheet — carrying the old reveal count would drop the
  // reader into the middle of a result set they have not scrolled through.
  // Adjusted during render rather than in an effect so the reset lands in the
  // same commit as the new results, with no pass where a long sheet is mounted
  // against a short one.
  const sheetKey = `${search}|${multiply}`;
  const [lastSheetKey, setLastSheetKey] = useState(sheetKey);
  if (sheetKey !== lastSheetKey) {
    setLastSheetKey(sheetKey);
    setVisible(INITIAL);
  }

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || visible >= displayed.length) return;
    const io = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) setVisible(v => v + PAGE); },
      // Reveals a screenful ahead of the edge so the next rows are mounted and
      // their images already decoding by the time they are scrolled to.
      { rootMargin: "1200px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible, displayed.length]);

  useGridScrollRestore(true, status === "ready" && displayed.length > 0, visible, setVisible);

  const [colMobile, colTablet, colDesktop] = COLS[density];

  return (
    <div
      className="pgv-root"
      data-density={density}
      style={{
        "--pgv-gap": gap === undefined ? "var(--park-image-gap)" : `${gap}px`,
        ...(ratio ? { "--pgv-ratio": ratio } : {}),
      } as React.CSSProperties}
    >
      <style>{`
        .pgv-root{
          --pda-bg:var(--background); --pda-panel:var(--card); --pda-fg:var(--foreground);
          --pda-muted:var(--muted); --pda-line:var(--border);
          --pda-accent:var(--accent); --pda-accent-hover:var(--accent-hover);
          --pda-ease: cubic-bezier(0.16, 1, 0.3, 1);
          --pda-font-mono: 'DM Mono', ui-monospace, monospace;
          --pda-font-ui: 'Rubik', Arial, sans-serif;
          --pda-font-display: var(--font-display), Arial, sans-serif;
          /* The page gutter, at the accordion's value. Redeclared for the same
             reason as the colours above: nested on /parks it resolves to the
             identical value .pda-root sets, and standalone in the preview
             harness there is no .pda-root to inherit from. The control row
             below is the only thing that reads it — the photographic sheet
             itself stays full-bleed. */
          --pda-gutter: clamp(16px, 4vw, 56px);
          /* One ratio for every density. The handover asks for equal
             photographic hierarchy with only scale changing, so the crop must
             not move between densities — a per-density ratio would recompose
             every photograph on the way down.

             16:10 is the ratio every other surface the directory asset feeds
             already uses — the accordion drawer figure and both map card
             thumbnails. Chosen by eye over 2:1 and 4:3, and it means the whole
             system now displays park photography at one ratio, so a frame
             composed for any surface reads the same on all of them. Only the
             feature card differs, at 16:9.

             Keep in step with .pcard-thumb-map if that ratio ever moves. */
          --pgv-ratio: 16 / 10;
          font-family:var(--pda-font-ui);
        }

        /* ── The control row ───────────────────────────────────────────────
           The only chrome the sheet carries, and it sits on the page gutter —
           not on the viewport edge.

           This row used to have no horizontal padding at all. It is mounted
           inside a full-bleed wrapper on /parks, so with zero padding it landed
           flush against the screen while MAP | GRID, which lives in .pda-bar
           (full-bleed with the gutter as padding), stopped one gutter short.
           The density control therefore sat exactly one --pda-gutter to the
           right of the toggle above it at every width: 56px at 1440, 41px at
           1024, 33px at 834, 16px at 390. On desktop the offset was large
           enough to read as "that one belongs to the sheet"; in the 640-1099
           band it shrank to the point where it just read as two controls that
           failed to line up.

           The rule the page already states for itself is that chrome is
           contained even where the imagery under it is not (see
           .pda-desktop-bar-row). This row was the one piece of chrome never
           brought into it. One gutter here puts both controls on a single
           right-hand edge at every width, and costs the photographs nothing —
           the sheet below still runs to the screen. */
        .pgv-controls{
          display:flex; justify-content:flex-end; align-items:center;
          /* The top padding is not decorative: .pda-bar above is sticky at
             z-index 25, so anything of this row that reaches into the bar's box
             is covered by it — including the button's extended hit area, which
             measured as blocked on its top edge with the pill sitting 1px below
             the bar. 10px clears the 8px the target extends upward. */
          padding:10px var(--pda-gutter) 12px;
        }
        .pgv-density{
          display:flex; align-items:center; height:30px;
          border:1px solid var(--pda-line); border-radius:15px;
        }
        .pgv-density button{
          position:relative;
          height:100%; width:46px; display:flex; align-items:center; justify-content:center;
          background:transparent; border:none; cursor:pointer;
          color:var(--pda-muted);
          transition:background .15s var(--pda-ease), color .15s var(--pda-ease);
        }
        /* A 44x44 target without a 44px-tall control. The pill stays 30px —
           this is a photographic sheet and its one control should not read as a
           toolbar — and the hit area extends 7px past it top and bottom, into
           the row's own padding rather than onto the first row of frames.
           Was 34x26, which is under the touch minimum in both axes. */
        .pgv-density button::after{
          content:""; position:absolute; left:0; right:0; top:50%;
          height:44px; transform:translateY(-50%);
        }
        /* Own radii rather than overflow:hidden on the pill — clipping the
           parent would clip the hit area above with it. */
        .pgv-density button:first-child{ border-radius:15px 0 0 15px; }
        .pgv-density button:last-child{ border-radius:0 15px 15px 0; }
        .pgv-density button:hover{ color:var(--pda-fg); }
        .pgv-density button[aria-pressed="true"]{ background:var(--pda-accent); color:#fff; }
        .pgv-density button:focus-visible{ outline:2px solid var(--pda-accent); outline-offset:2px; z-index:1; }
        .pgv-density svg{ width:13px; height:13px; }

        .pgv-grid{
          display:grid; gap:var(--pgv-gap);
          grid-template-columns:repeat(var(--pgv-cols), minmax(0, 1fr));
        }

        /* ── The tile: a frame, then a caption ─────────────────────────────
           Both are inside the one <a>, so the photograph and its notation are a
           single target. Nothing is drawn around the pair — no border, radius,
           shadow or plate — and nothing at all is drawn on the photograph. */
        .pgv-tile{
          position:relative; display:block; text-decoration:none; color:inherit;
        }
        .pgv-tile:focus-visible{ outline:2px solid var(--pda-accent); outline-offset:-2px; z-index:2; }

        /* The photograph. 100% of this box is image; the caption is a sibling
           below it, never an overlay. */
        .pgv-frame{
          position:relative; overflow:hidden;
          aspect-ratio:var(--pgv-ratio);
          background:var(--pda-panel);
          /* Lets the browser skip layout and paint for frames that are scrolled
             out. The aspect ratio still resolves from the grid track, so a
             skipped frame keeps its exact height and nothing shifts. Scoped to
             the frame rather than the whole tile now the tile also contains
             text: the caption has no intrinsic height to fall back on, so
             skipping it would collapse the row and shift the sheet. */
          content-visibility:auto;
        }
        .pgv-frame img{
          object-fit:cover;
          /* No filter. Park photography runs in colour, matching the homepage
             thumbnail strip — the b/w treatment read as too grungy against the
             current palette. The interactive B&W toggles (hero/3D viewer,
             gallery) are a separate concern and are untouched. */
          transition:transform .45s var(--pda-ease);
        }

        /* ── The caption ───────────────────────────────────────────────────
           Field notation set as it is everywhere else on the site, laid out to
           read as a margin note rather than a card footer:

               005/  CRYSTAL PALACE
                     SE19 / SOUTH LONDON

           Two columns, not three rows. The catalogue mark holds the first
           column and the name sits beside it on a shared baseline; the place
           line takes the second column on the row below, so it hangs under the
           name rather than under the mark. That indent is what makes the mark
           read as a plate number in the margin — three left-aligned rows read
           as a stack of fields, which is a card.

           The .pcard-* selectors below set arrangement and scale only. The
           notation itself — which tiers exist, what they are set in, their
           order — stays ParkCard's, and no prop or variant is added for this.
           That is the split ParkCard documents: the component owns the
           language, the layout owns the scale. */
        .pgv-cap{
          padding:var(--pgv-cap-top, 10px) var(--pgv-cap-x, 12px) var(--pgv-cap-bottom, 20px);
        }
        .pgv-cap .pcard{
          display:grid;
          grid-template-columns:auto minmax(0, 1fr);
          column-gap:var(--pgv-mark-gap, 10px);
          align-items:baseline;
        }
        .pgv-cap .pcard-id{ grid-column:1; grid-row:1; }
        .pgv-cap .pcard-title{ grid-column:2; grid-row:1; min-width:0; }
        .pgv-cap .pcard-location{ grid-column:2; grid-row:2; }
        /* Full names survive: the name wraps inside its column rather than
           being truncated, and a single long word breaks rather than pushing
           the column open. */
        .pgv-cap .pcard-name{ overflow-wrap:anywhere; }

        @media (hover: hover){
          /* The one hover response, and the ceiling for it. Enough to confirm
             the frame is a control; identity is already on screen and does not
             move. */
          .pgv-tile:hover .pgv-frame img{ transform:scale(1.02); }
        }

        /* ── Density: scale, and only scale ────────────────────────────────
           Same crop, same treatment, same information at both — a tile at
           Medium is a tile at Large, smaller. Geography is shown at every
           density and every width, including mobile Medium: off the photograph
           it is no longer competing with it, and on a national archive the area
           is the thing a reader most needs. */
        .pgv-root[data-density="large"]{
          --pgv-cap-top:12px; --pgv-cap-x:14px; --pgv-cap-bottom:26px;
          --pgv-mark-gap:12px;
          --pcard-title-size:19px;
          --pcard-place-size:11px;
        }
        .pgv-root[data-density="medium"]{
          --pgv-cap-top:10px; --pgv-cap-x:12px; --pgv-cap-bottom:22px;
          --pgv-mark-gap:10px;
          --pcard-title-size:15px;
          --pcard-place-size:10.5px;
        }
        /* ParkCard's own vertical margins are zeroed — the caption grid owns
           the rhythm now, through row-gap and the place gap below. */
        .pgv-cap{ --pcard-mark-gap:0px; }
        .pgv-root[data-density="large"] .pgv-cap{ --pcard-place-gap:5px; }
        .pgv-root[data-density="medium"] .pgv-cap{ --pcard-place-gap:4px; }

        @media (max-width: 639px){
          .pgv-root[data-density="large"]{
            --pgv-cap-top:11px; --pgv-cap-x:14px; --pgv-cap-bottom:24px;
            --pcard-title-size:18px;
          }
          .pgv-root[data-density="medium"]{
            --pgv-cap-top:8px; --pgv-cap-x:10px; --pgv-cap-bottom:18px;
            --pgv-mark-gap:8px;
            --pcard-title-size:13px;
            --pcard-place-size:9.5px;
            --pcard-place-tracking:.05em;
          }
          /* At two columns on a phone the second column is too narrow to hold
             the place line at a readable size, so it gives up the indent and
             takes the caption's full width instead. The hierarchy still reads
             — it is below the name and set in muted mono — and legibility is
             worth more here than the hanging alignment. */
          .pgv-root[data-density="medium"] .pgv-cap .pcard-location{ grid-column:1 / -1; }
        }

        /* No photograph on file. Only the frame is empty — the caption beneath
           still names the park, so the tile holds its place in the sheet and
           stays identifiable rather than leaving a hole. */
        .pgv-plate{
          position:absolute; inset:0;
          background:linear-gradient(135deg, var(--pda-panel), var(--pda-line));
        }

        /* ── ?debug=1 missing-image indicator ─────────────────────────────
           Hazard stripes, not a muted placeholder: this has to stay obvious in
           a sheet that is mostly real photography, at every density, and
           against both themes. Never rendered in production — see debugAllowed. */
        .pgv-missing{
          position:absolute; inset:0; overflow:hidden;
          background:repeating-linear-gradient(
            45deg,
            #ffd400 0 14px,
            #1a1a1a 14px 28px
          );
          display:flex; align-items:center; justify-content:center;
        }
        .pgv-missing-body{
          position:absolute; inset:6px;
          background:#1a1a1a; color:#ffd400;
          border:2px solid #ffd400;
          display:flex; flex-direction:column; justify-content:center; gap:4px;
          padding:8px; overflow:hidden;
          font-family:var(--pda-font-mono); text-align:center;
        }
        .pgv-missing-title{
          font-size:11px; font-weight:500; letter-spacing:.12em; line-height:1.1;
        }
        .pgv-missing-path{
          all:unset; cursor:copy; display:block;
          font-family:var(--pda-font-mono); font-size:9px; line-height:1.35;
          color:#fff; word-break:break-all;
          text-decoration:underline; text-underline-offset:2px;
        }
        .pgv-missing-path:hover{ color:#ffd400; }
        .pgv-missing-path:focus-visible{ outline:2px solid #fff; outline-offset:2px; }
        .pgv-missing-reason{
          font-size:8px; letter-spacing:.06em; color:#ffd400; opacity:.75;
          line-height:1.3;
        }
        /* The block no longer repeats the park name: the caption below the
           frame carries it now, at every density, so the indicator can spend
           all of its room on the path that needs fixing. */
        @media (max-width: 639px){
          .pgv-root[data-density="medium"] .pgv-missing-reason{ display:none; }
          .pgv-root[data-density="medium"] .pgv-missing-title{ font-size:9px; }
          .pgv-root[data-density="medium"] .pgv-missing-path{ font-size:8px; }
        }

        .pgv-empty{
          padding:80px 24px; text-align:center; color:var(--pda-muted);
          font-family:var(--pda-font-mono); font-size:12px;
          text-transform:uppercase; letter-spacing:.12em;
        }
        .pgv-sentinel{ height:1px; }

        @media (prefers-reduced-motion: reduce){
          .pgv-frame img{ transition-duration:.01ms; }
          .pgv-tile:hover .pgv-frame img{ transform:none; }
        }

        /* Column count per breakpoint. Written from the COLS table above so the
           grid and the image sizes hint can never describe different layouts. */
        .pgv-grid{ --pgv-cols:${colMobile}; }
        @media (min-width: 640px){ .pgv-grid{ --pgv-cols:${colTablet}; } }
        @media (min-width: 1100px){ .pgv-grid{ --pgv-cols:${colDesktop}; } }

        ${PARK_CARD_CSS}
      `}</style>

      <div className="pgv-controls">
        <div className="pgv-density" role="group" aria-label="Grid density">
          {DENSITIES.map(d => (
            <button
              key={d}
              type="button"
              aria-pressed={density === d}
              aria-label={`${d} tiles`}
              title={`${d[0].toUpperCase()}${d.slice(1)}`}
              onClick={() => onDensityChange(d)}
            >
              <DensityGlyph density={d} />
            </button>
          ))}
        </div>
      </div>

      <div className="pgv-grid">
        {displayed.slice(0, visible).map(({ park, key }, idx) => (
          <GridTile
            key={key} park={park} idx={idx} density={density}
            // Only the directory slot governs a Grid tile — hero and thumbnail
            // are other surfaces' assets, and flagging them here would light up
            // tiles whose own photograph is fine.
            missing={debug ? findUnmetSlot(audit, park.slug) : null}
          />
        ))}
      </div>

      {visible < displayed.length && <div ref={sentinelRef} className="pgv-sentinel" />}

      {status === "ready" && displayed.length === 0 && (
        <div className="pgv-empty">No parks match your search</div>
      )}
      {status === "error" && (
        <div className="pgv-empty">Could not load the archive</div>
      )}
    </div>
  );
}

// Fetched once per debug session. Returns null when debug is off, so nothing
// is requested and no path ever reaches the browser on a normal visit.
function useImageAudit(enabled: boolean): Record<string, ParkAudit> | null {
  const [audit, setAudit] = useState<Record<string, ParkAudit> | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    fetch("/api/dev/park-images")
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (!cancelled && d && !d.error) setAudit(d); })
      .catch(() => { /* debug affordance — failing to load it is not an error */ });
    return () => { cancelled = true; };
  }, [enabled]);

  return audit;
}

/** The directory slot for this park, when it does not hold a real photograph. */
function findUnmetSlot(audit: Record<string, ParkAudit> | null, slug: string): SlotAudit | null {
  const slot = audit?.[slug]?.slots.find(s => s.key === "directory_image_url");
  if (!slot) return null;
  return slot.status === "ok" || slot.status === "remote" ? null : slot;
}

function GridTile({ park, idx, density, missing }: {
  park: ParkIndexRow; idx: number; density: GridDensity; missing: SlotAudit | null;
}) {
  const candidates = useMemo(() => getParkImageCandidates(park), [park]);
  const [attempt, setAttempt] = useState(0);
  const src = candidates[attempt];

  return (
    <Link
      href={`/parks/${park.slug}`}
      className="pgv-tile"
      // Viewport prefetch across a full sheet would fire a request per tile.
      prefetch={false}
      // No aria-label: the caption is inside the link and is the visible name
      // of this control, so it is already the accessible name. An aria-label
      // here would override the text a sighted reader is looking at.
    >
      <div className="pgv-frame">
        {/* Replaces the photograph rather than sitting over it. The frame would
            otherwise fall back to the park's hero and look perfectly fine,
            which is exactly the case this is meant to catch: the directory
            export is the missing asset, not the photography. */}
        {missing ? (
          <MissingImage slot={missing} />
        ) : src ? (
          <Image
            src={src}
            alt=""
            fill
            sizes={SIZES[density]}
            // The optimiser serves a real per-density tier off this: a medium
            // sheet pulls ~360px files, not a full frame scaled down in CSS.
            loading={idx < 8 ? "eager" : "lazy"}
            // Walks the candidate list — see getParkImageCandidates. Several
            // published parks point at a directory image that does not exist.
            onError={() => setAttempt(a => a + 1)}
          />
        ) : (
          <div className="pgv-plate" />
        )}
      </div>

      {/* The same ParkCard the accordion row and the map list render, in the
          same variant — the sheet cannot drift out of step with how a park is
          named anywhere else on the site. Rendered unconditionally: a tile
          without a photograph is still an identified park. */}
      <div className="pgv-cap">
        <ParkCard park={park} density="standard" />
      </div>
    </Link>
  );
}

// Falls back to execCommand when the async clipboard is unavailable — it is
// refused on insecure origins and whenever the document is not focused, which
// covers a fair share of the dev setups this indicator exists for.
function copyText(text: string): boolean {
  try {
    const el = document.createElement("textarea");
    el.value = text;
    el.setAttribute("readonly", "");
    el.style.cssText = "position:fixed;top:-1000px;opacity:0";
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}

// Dev/preview only — see the debugAllowed() gate at the call site.
function MissingImage({ slot }: { slot: SlotAudit }) {
  const [feedback, setFeedback] = useState<null | "copied" | "failed">(null);

  // Reverts to the path so it can be read and copied again — and so a failure
  // is reported rather than looking like nothing happened.
  useEffect(() => {
    if (!feedback) return;
    const id = setTimeout(() => setFeedback(null), 1400);
    return () => clearTimeout(id);
  }, [feedback]);

  const copy = (e: React.MouseEvent) => {
    // The tile is a link to the park page; copying must not navigate.
    e.preventDefault();
    e.stopPropagation();
    const path = slot.expectedPath;
    const settle = (ok: boolean) => setFeedback(ok ? "copied" : "failed");
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(path).then(() => settle(true), () => settle(copyText(path)));
    } else {
      settle(copyText(path));
    }
  };

  return (
    <div className="pgv-missing">
      <div className="pgv-missing-body">
        <span className="pgv-missing-title">
          {slot.status === "placeholder" ? "PLACEHOLDER IMAGE" : "MISSING IMAGE"}
        </span>
        <button type="button" className="pgv-missing-path" onClick={copy}
          title="Copy path">
          {feedback === "copied" ? "COPIED" : feedback === "failed" ? "COPY FAILED — SELECT MANUALLY" : slot.expectedPath}
        </button>
        {slot.reason && <span className="pgv-missing-reason">{slot.reason}</span>}
      </div>
    </div>
  );
}

function DensityGlyph({ density }: { density: GridDensity }) {
  // 2x2 / 3x3 — the mark reads as how much fits on screen, which is the only
  // thing the control changes.
  const n = density === "large" ? 2 : 3;
  const unit = 24 / n;
  const pad = unit * 0.16;
  const cells = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      cells.push(
        <rect
          key={`${r}-${c}`}
          x={c * unit + pad} y={r * unit + pad}
          width={unit - pad * 2} height={unit - pad * 2}
        />
      );
    }
  }
  return <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">{cells}</svg>;
}

// Windowing note: tiles mount in pages of 60 as the sentinel is reached, and
// content-visibility:auto lets the browser skip layout and paint for every
// tile that is off screen — so an archive several hundred deep costs roughly a
// screenful of work at any moment. What this does not do is unmount tiles
// behind you, so scrolling to the end of a very large archive still leaves
// them all in the DOM. Past roughly a thousand that wants a real windowed list
// keyed on row index; at the archive's current size it would be machinery with
// nothing to do.
