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
const COLS: Record<GridDensity, [number, number, number]> = {
  large:  [1, 2, 3],
  medium: [2, 3, 4],
  small:  [3, 5, 7],
};

// Matches COLS: <640 mobile, <1100 tablet, else desktop.
const SIZES: Record<GridDensity, string> = {
  large:  "(max-width: 639px) 100vw, (max-width: 1099px) 50vw, 33vw",
  medium: "(max-width: 639px) 50vw,  (max-width: 1099px) 33vw, 25vw",
  small:  "(max-width: 639px) 33vw,  (max-width: 1099px) 20vw, 15vw",
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

             Keep in step with .pda-figure and .pcard-thumb-map if that ratio
             ever moves. */
          --pgv-ratio: 16 / 10;
          font-family:var(--pda-font-ui);
        }

        /* The control row is the only chrome the sheet carries. */
        .pgv-controls{
          display:flex; justify-content:flex-end; align-items:center;
          padding:0 0 10px;
        }
        .pgv-density{
          display:flex; align-items:center; height:28px;
          border:1px solid var(--pda-line); border-radius:14px; overflow:hidden;
        }
        .pgv-density button{
          height:100%; width:34px; display:flex; align-items:center; justify-content:center;
          background:transparent; border:none; cursor:pointer;
          color:var(--pda-muted);
          transition:background .15s var(--pda-ease), color .15s var(--pda-ease);
        }
        .pgv-density button:hover{ color:var(--pda-fg); }
        .pgv-density button[aria-pressed="true"]{ background:var(--pda-accent); color:#fff; }
        .pgv-density button:focus-visible{ outline:2px solid var(--pda-accent); outline-offset:-2px; }
        .pgv-density svg{ width:13px; height:13px; }

        .pgv-grid{
          display:grid; gap:var(--pgv-gap);
          grid-template-columns:repeat(var(--pgv-cols), minmax(0, 1fr));
        }

        /* The tile is the whole interface: no border, no plate, no button. The
           photograph is the control, and the only thing drawn over it is the
           catalogue block. */
        .pgv-tile{
          position:relative; display:block;
          aspect-ratio:var(--pgv-ratio);
          overflow:hidden; background:var(--pda-panel);
          /* Lets the browser skip layout and paint for tiles that are scrolled
             out. The aspect ratio still resolves from the grid track, so a
             skipped tile keeps its exact height and nothing shifts. */
          content-visibility:auto;
        }
        .pgv-tile:focus-visible{ outline:2px solid var(--pda-accent); outline-offset:-2px; z-index:2; }
        .pgv-tile img{
          object-fit:cover;
          /* No filter. Park photography runs in colour, matching the homepage
             thumbnail strip — the b/w treatment read as too grungy against the
             current palette. The interactive B&W toggles (hero/3D viewer,
             gallery) are a separate concern and are untouched.
             Legibility of the catalogue block is the scrim's job below, not a
             brightness knock-down on the photograph. */
          transition:transform .45s var(--pda-ease);
        }

        /* Scrim carries the text, not a box around it. Only as tall as the
           block it protects. */
        .pgv-scrim{
          position:absolute; left:0; right:0; bottom:0; height:62%;
          /* Raised from .72 when the hover brightness(.62) was removed: that
             knock-down was doing part of the work of making the white block
             readable, and over a bright colour frame the scrim now has to do
             all of it. */
          background:linear-gradient(to top, rgba(0,0,0,.82), rgba(0,0,0,0));
          opacity:0; transition:opacity .2s var(--pda-ease); pointer-events:none;
        }
        .pgv-meta{
          position:absolute; left:0; right:0; bottom:0;
          padding:var(--pgv-meta-pad, 12px);
          opacity:0; transform:translateY(4px);
          transition:opacity .2s var(--pda-ease), transform .2s var(--pda-ease);
          pointer-events:none;
        }
        .pgv-meta .pcard-id{ color:rgba(255,255,255,.72); }
        .pgv-meta .pcard-title .pcard-name{ color:#fff; }
        .pgv-meta .pcard-title .pcard-postcode{ color:var(--pda-accent); }
        .pgv-meta .pcard-location{ color:rgba(255,255,255,.72); }

        @media (hover: hover){
          .pgv-tile:hover .pgv-meta, .pgv-tile:hover .pgv-scrim{ opacity:1; }
          .pgv-tile:hover .pgv-meta{ transform:none; }
          .pgv-tile:hover img{ transform:scale(1.02); }
          .pgv-tile:focus-visible .pgv-meta, .pgv-tile:focus-visible .pgv-scrim{ opacity:1; }
        }
        /* Touch: the block is permanent. Tap-to-reveal would put a park page
           two taps away, and the sheet is meant to be scanned, not probed. */
        @media (hover: none){
          .pgv-meta, .pgv-scrim{ opacity:1; transform:none; }
        }

        /* Density only changes scale — the type steps down with the cell so a
           dense sheet stays a sheet rather than a wall of labels. Below medium
           the location line goes: at 7 columns it is the first thing to become
           unreadable, and the catalogue no. plus name still identify the park. */
        .pgv-root[data-density="large"]{ --pgv-meta-pad:16px; }
        .pgv-root[data-density="medium"] .pgv-meta .pcard-title{ font-size:15px; }
        .pgv-root[data-density="small"]{ --pgv-meta-pad:8px; }
        .pgv-root[data-density="small"] .pgv-meta .pcard-id{ font-size:9px; letter-spacing:.06em; }
        .pgv-root[data-density="small"] .pgv-meta .pcard-title{ font-size:12px; margin-top:2px; }
        .pgv-root[data-density="small"] .pgv-meta .pcard-location{ display:none; }
        @media (max-width: 639px){
          .pgv-root[data-density="medium"]{ --pgv-meta-pad:8px; }
          .pgv-root[data-density="medium"] .pgv-meta .pcard-title{ font-size:13px; }
          .pgv-root[data-density="medium"] .pgv-meta .pcard-location{ display:none; }
          .pgv-root[data-density="small"] .pgv-meta .pcard-title{ font-size:10px; }
        }

        /* No photograph on file. The tile still holds its place in the sheet
           and still identifies the park, rather than leaving a hole. */
        .pgv-plate{
          position:absolute; inset:0; display:flex; align-items:flex-end;
          padding:var(--pgv-meta-pad, 12px);
          background:linear-gradient(135deg, var(--pda-panel), var(--pda-line));
        }
        .pgv-plate .pcard-id{ color:var(--pda-accent); }
        .pgv-plate .pcard-title .pcard-name{ color:var(--pda-fg); }
        .pgv-plate .pcard-location{ color:var(--pda-muted); }
        .pgv-root[data-density="small"] .pgv-plate .pcard-location{ display:none; }

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
        .pgv-missing-id{
          margin-top:2px; opacity:.6;
        }
        .pgv-missing-id .pcard-id,
        .pgv-missing-id .pcard-title .pcard-name,
        .pgv-missing-id .pcard-title .pcard-postcode,
        .pgv-missing-id .pcard-location{ color:#fff; }
        .pgv-missing-id .pcard-title{ font-size:11px; margin:0; }
        .pgv-missing-id .pcard-id{ font-size:9px; }
        .pgv-missing-id .pcard-location{ display:none; }
        /* Dense sheets have no room for the path or the park name; the stripes
           and the title still carry the signal. */
        .pgv-root[data-density="small"] .pgv-missing-path,
        .pgv-root[data-density="small"] .pgv-missing-reason,
        .pgv-root[data-density="small"] .pgv-missing-id{ display:none; }
        .pgv-root[data-density="small"] .pgv-missing-title{ font-size:9px; letter-spacing:.06em; }
        @media (max-width: 639px){
          .pgv-root[data-density="medium"] .pgv-missing-reason,
          .pgv-root[data-density="medium"] .pgv-missing-id{ display:none; }
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
          .pgv-tile img, .pgv-meta, .pgv-scrim{ transition-duration:.01ms; }
          .pgv-tile:hover img{ transform:none; }
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

  // The catalogue block is the same ParkCard the accordion row and the map
  // list render, in the same variant — the sheet cannot drift out of step with
  // how a park is named anywhere else on the site.
  const label = <ParkCard park={park} idx={idx} variant="archive" showTags={false} showLocation />;

  return (
    <Link
      href={`/parks/${park.slug}`}
      className="pgv-tile"
      // Viewport prefetch across a full sheet would fire a request per tile.
      prefetch={false}
      aria-label={`${park.name}${park.location ? `, ${park.location}` : ""}`}
    >
      {/* Replaces the photograph rather than sitting over it. The tile would
          otherwise fall back to the park's hero and look perfectly fine, which
          is exactly the case this is meant to catch: the directory export is
          the missing asset, not the photography. */}
      {missing ? (
        <MissingImage slot={missing} label={label} />
      ) : src ? (
        <>
          <Image
            src={src}
            alt=""
            fill
            sizes={SIZES[density]}
            // The optimiser serves a real per-density tier off this: a small
            // sheet pulls ~200px files, not a full frame scaled down in CSS.
            loading={idx < 8 ? "eager" : "lazy"}
            // Walks the candidate list — see getParkImageCandidates. Several
            // published parks point at a directory image that does not exist.
            onError={() => setAttempt(a => a + 1)}
          />
          <div className="pgv-scrim" />
          <div className="pgv-meta">{label}</div>
        </>
      ) : (
        <div className="pgv-plate">{label}</div>
      )}
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
function MissingImage({ slot, label }: { slot: SlotAudit; label: React.ReactNode }) {
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
        {/* Which park this is, still — the sheet has to stay readable as an
            index while it is full of these. */}
        <span className="pgv-missing-id">{label}</span>
      </div>
    </div>
  );
}

function DensityGlyph({ density }: { density: GridDensity }) {
  // 2x2 / 3x3 / 4x4 — the mark reads as how much fits on screen, which is the
  // only thing the control changes.
  const n = density === "large" ? 2 : density === "medium" ? 3 : 4;
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
