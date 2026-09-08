"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { catalogueMark } from "@/lib/catalogue";
import { randomRenderUrl } from "@/lib/assets";

/**
 * Random Park — a graphic interruption, not a banner.
 *
 * The material is a transparent-alpha chalk render per park, floating directly
 * on the page background with the park's name across it. No panel, no card, no
 * scrim, no gradient, no border, no rounded corner: the absence of a
 * rectangular image edge is the point, so this component sets no background of
 * its own and the site's own ground shows through the alpha in both themes.
 *
 * The motion is a rapid archive scan rather than a dissolve — a burst of hard
 * cuts through the pool, a hold on one park, then another burst. Render, name
 * and catalogue mark cut on the same frame because they are one object, not
 * three animating layers.
 *
 * Only parks that actually have a render take part. The pool is discovered by
 * probing the convention path — no database field, and no photography
 * substituted in, which would break the visual system this exists to establish.
 * With fewer than two renders there is nothing to cut between, so it holds one
 * static composition; the sequence starts working on its own as assets land.
 */

export type RandomParkItem = {
  slug: string;
  name: string;
  catalogue_id: string | null;
  sort_order: number | null;
};

// ── Timing. Exploratory — these are the knobs to turn. ────────────────────
/** One frame during a burst. */
const CUT_MS = 190;
/** How long a burst runs before it settles. */
const BURST_MS = 1200;
/** How long the landed park is held before the next burst. */
const HOLD_MS = 3200;

export default function RandomPark({ parks }: { parks: RandomParkItem[] }) {
  // Which slugs actually have a render. Probed rather than assumed: a park
  // without one is the normal state while the set is being made.
  const [available, setAvailable] = useState<string[]>([]);
  const [index, setIndex] = useState(0);

  const candidates = useMemo(() => parks.map(p => p.slug).join(","), [parks]);

  // Probe and preload in one step — a decoded Image is exactly what the burst
  // needs, so switching later never touches the network.
  useEffect(() => {
    if (parks.length === 0) return;
    let cancelled = false;
    const found = new Set<string>();
    let pending = parks.length;

    const settle = () => {
      if (--pending > 0 || cancelled) return;
      setAvailable(parks.filter(p => found.has(p.slug)).map(p => p.slug));
    };

    parks.forEach(p => {
      const img = new Image();
      img.onload = () => { found.add(p.slug); settle(); };
      img.onerror = settle;
      img.src = randomRenderUrl(p.slug);
    });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidates]);

  const pool = useMemo(
    () => parks.filter(p => available.includes(p.slug)),
    [parks, available],
  );

  // ── burst → hold → burst ────────────────────────────────────────────────
  useEffect(() => {
    if (pool.length < 2) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // One park, chosen at random, held. The randomiser still randomises.
      setIndex(Math.floor(Math.random() * pool.length));
      return;
    }

    let cut: ReturnType<typeof setInterval> | null = null;
    let phase: ReturnType<typeof setTimeout> | null = null;

    const burst = () => {
      cut = setInterval(() => setIndex(i => (i + 1) % pool.length), CUT_MS);
      phase = setTimeout(() => {
        if (cut) clearInterval(cut);
        cut = null;
        // Land somewhere unpredictable rather than wherever the interval
        // happened to stop — otherwise the landing is a property of the timer
        // rather than of the archive.
        setIndex(Math.floor(Math.random() * pool.length));
        phase = setTimeout(burst, HOLD_MS);
      }, BURST_MS);
    };

    phase = setTimeout(burst, HOLD_MS);
    return () => {
      if (cut) clearInterval(cut);
      if (phase) clearTimeout(phase);
    };
  }, [pool.length]);

  if (pool.length === 0) return null;

  const current = pool[index % pool.length];
  const mark = catalogueMark(current.catalogue_id, current.sort_order);

  return (
    <section className="fbs-rp">
      <Link href={`/parks/${current.slug}`} className="fbs-rp-link" aria-label={`Open ${current.name}`}>
        {/* Every render stays mounted and is shown or hidden — a hard cut with
            no network and no decode at switch time. `hidden`, not opacity: an
            opacity swap would still be cross-fading for part of a 190ms frame,
            and the brief is a cut. */}
        <div className="fbs-rp-stage">
          {pool.map(p => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={p.slug}
              src={randomRenderUrl(p.slug)}
              alt=""
              className="fbs-rp-render"
              hidden={p.slug !== current.slug}
              decoding="async"
            />
          ))}

          {/* Across the object rather than beside it, so the two read as one
              graphic. It cuts on the same render pass as the image because both
              come from `current`. */}
          <span className="fbs-rp-name">{current.name}</span>
        </div>

        <div className="contained fbs-rp-meta">
          <span className="fbs-rp-label">
            Random park{mark && <span className="fbs-rp-mark">{mark}</span>}
          </span>
          <span className="fbs-rp-cue">
            Take me somewhere
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </div>
      </Link>

      <style>{`
        /* No background of its own. The section is a hole in the page through
           which the page's own ground shows, in either theme. */
        .fbs-rp{ position:relative; }
        .fbs-rp-link{
          display:block; text-decoration:none; color:inherit;
          padding-block:clamp(2rem, 5vw, 4rem);
        }
        .fbs-rp-stage{
          position:relative;
          display:grid; place-items:center;
          /* Tall enough for the geometry to be worth looking at. The breathing
             room comes from the box being larger than the object, not from
             padding around a rectangle. */
          height:clamp(340px, 46vh, 620px);
        }
        /* contain, never cover: this is a model, and cropping it would be the
           same mistake as framing it. */
        .fbs-rp-render{
          position:absolute; inset:0;
          width:100%; height:100%;
          object-fit:contain; object-position:center;
        }
        /* Scout's display face at poster scale, in --foreground so it is dark
           on the light ground and light on the dark one with no second asset. */
        .fbs-rp-name{
          position:relative; z-index:1;
          font-family:var(--font-display), Arial, sans-serif;
          font-style:italic; font-weight:400; text-transform:uppercase;
          font-size:clamp(2.5rem, 11vw, 9.5rem);
          line-height:.9; letter-spacing:-.02em; text-align:center;
          color:var(--foreground);
          padding-inline:var(--content-padding);
          pointer-events:none;
        }
        /* Small, secondary, and the only chrome here. */
        .fbs-rp-meta{
          display:flex; align-items:baseline; justify-content:space-between;
          gap:clamp(1rem, 4vw, 3rem);
          margin-top:clamp(.75rem, 2vw, 1.25rem);
          font-family:var(--font-mono); font-size:10px; font-weight:500;
          letter-spacing:.16em; text-transform:uppercase;
          color:var(--muted);
        }
        .fbs-rp-mark{ color:var(--accent); margin-left:.75em; }
        .fbs-rp-cue{ display:inline-flex; align-items:center; gap:.5em; flex-shrink:0; }
        @media (hover: hover){
          .fbs-rp-link:hover .fbs-rp-cue{ color:var(--foreground); }
        }
        .fbs-rp-link:focus-visible{ outline:2px solid var(--accent); outline-offset:4px; }

        @media (max-width: 560px){
          .fbs-rp-meta{ flex-direction:column; align-items:flex-start; gap:.5rem; }
        }
      `}</style>
    </section>
  );
}
