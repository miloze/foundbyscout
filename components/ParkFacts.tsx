"use client";

import { useState } from "react";

// ── Park page detail blocks ────────────────────────────────────────────────
// At a Glance, Opening times, Built by, Getting there — the practical column
// beside the introduction on desktop, stacked in flow above the photos on
// mobile. Built to the "park page detail blocks" handover.
//
// Two things it deliberately does not do:
//  - no max-height drawer. The Getting there accordion uses the same
//    grid-template-rows 0fr → 1fr transition as ParksDirectoryAccordion, on
//    the same .42s curve, so short and long bodies both animate to their real
//    height without a magic number.
//  - no opacity dimming on an absent amenity. The muted state is a full
//    colour swap: `color` is set once on the card and the icon and value
//    inherit it, so the pair never drifts out of step. The caption sits
//    outside that swap and is muted in every state.

export type ParkSetting = "outdoor" | "indoor";
export type ParkEntry   = "free" | "paid";

/** The eight At a Glance fields, kept together as one object so the grid can
 *  be handed to either placement without threading eight props through the
 *  hero as well as the sidebar. */
export type ParkGlance = {
  setting?: ParkSetting | null;
  entry?: ParkEntry | null;
  cafe?: boolean | null;
  toilets?: boolean | null;
  waterFountain?: boolean | null;
  carPark?: boolean | null;
  lighting?: boolean | null;
  seating?: boolean | null;
};

export type TransportLink = {
  type: "tube" | "rail" | "bus" | "tram";
  name: string;
  detail: string;
};

// ── Placement ──────────────────────────────────────────────────────────────
// The handover says two different things about where this grid lives. Its
// Layout section puts it in the side column and states outright that it is
// "not overlaid on the GLB viewer"; its second pre-build check then asks for
// the grid to be tested "over an actual busy scan … to confirm the solid card
// background still reads cleanly", which only makes sense as an overlay. The
// mockup's placeholder hexes point the same way: #141413 is within a shade of
// the hero chip's rgba(20,18,15,0.82), not of any page token.
//
// So both are built and this constant picks one. "sidebar" renders the grid
// inside ParkFacts; "hero" renders it as an overlay in ParkHeroShell instead
// and the side column keeps only the fact rows and the accordion. The two
// share glanceCards() and ParkGlanceGrid, so the cards themselves can never
// drift apart — only the frame around them changes.
//
// The `as GlancePlacement` is load-bearing for the same reason it is in
// ParkHeroMeta's CHIP_VARIANT: without it TypeScript narrows the constant to
// its initialiser and the comparison against the other value reads as
// provably false, which `next build` rejects even though `next dev` does not.
type GlancePlacement = "sidebar" | "hero";
export const GLANCE_PLACEMENT = "sidebar" as GlancePlacement;

type Card = { icon: string; value: string; caption: string; on: boolean };

// Material Symbols Outlined, the only icon set the site loads (see
// app/layout.tsx). `wc` is the two-figure pictogram the design reference uses,
// not the toilet-bowl glyph — that was the open question in the handover's
// pre-build checks, and Material Symbols does ship the right one. The other
// seven are all direct matches.
const SETTING_ICON: Record<ParkSetting, string> = { outdoor: "wb_sunny", indoor: "warehouse" };
const ENTRY_ICON:   Record<ParkEntry,   string> = { free: "money_off",  paid: "payments"  };

// Boolean cards answer the caption rather than restating it: "Yes" / "No"
// under CAFÉ, with the colour carrying the same information a second time.
// The enum cards name the value instead, since there the answer *is* a word.
const YES = "Yes";
const NO  = "No";

// An unanswered field is not a "No". These columns are null only on a park
// whose amenities have never been saved — the admin coerces null to false when
// it loads a row, so after one save they are always a real boolean. Collapsing
// null into "No" made an unfilled park assert it has no cafe, no toilets, no
// water, no parking, no lighting and no seating, which is a claim nobody made
// and is indistinguishable from a park that genuinely has none of them.
const UNKNOWN = "—";

// Setting and Entry have no category glyph of their own — wb_sunny *is* the
// outdoor answer and money_off *is* the free one, so falling back to either
// drew the answer on a card that has none.
const UNKNOWN_ICON = "help";

function boolCard(icon: string, caption: string, v: boolean | null | undefined): Card {
  return { icon, caption, value: v == null ? UNKNOWN : v ? YES : NO, on: !!v };
}

// Reading order is the handover's data-model table, which is also the mockup's
// grid order: two columns of four on desktop, three of three on mobile with
// the ninth cell left as bare panel.
function glanceCards(g: ParkGlance): Card[] {
  return [
    {
      icon: g.setting ? SETTING_ICON[g.setting] : UNKNOWN_ICON,
      value: g.setting ? (g.setting === "indoor" ? "Indoor" : "Outdoor") : UNKNOWN,
      caption: "Setting",
      on: !!g.setting,
    },
    boolCard("local_cafe",    "Café",     g.cafe),
    boolCard("wc",            "Toilets",  g.toilets),
    boolCard("water_drop",    "Water",    g.waterFountain),
    boolCard("local_parking", "Car park", g.carPark),
    boolCard("lightbulb",     "Lighting", g.lighting),
    {
      icon: g.entry ? ENTRY_ICON[g.entry] : UNKNOWN_ICON,
      value: g.entry ? (g.entry === "paid" ? "Paid" : "Free") : UNKNOWN,
      caption: "Entry",
      // Paid entry is a fact, not an absence — both enum values read as
      // present. Only an unset field is muted.
      on: !!g.entry,
    },
    boolCard("chair",         "Seating",  g.seating),
  ];
}

// ── At a Glance grid ───────────────────────────────────────────────────────
// Owns its own stylesheet, so whichever placement is switched on ships the
// grid CSS exactly once and the other ships none of it.
export function ParkGlanceGrid({ glance, variant = "sidebar" }: {
  glance: ParkGlance;
  variant?: GlancePlacement;
}) {
  return (
    <div className={`pfacts-glance pfacts-glance--${variant}`}>
      <p className="pfacts-eyebrow">At a glance</p>
      <div className="pfacts-grid">
        {glanceCards(glance).map(c => (
          <div key={c.caption} className={`pfacts-card${c.on ? " is-on" : ""}`}>
            <span className="material-symbols-outlined" aria-hidden="true">{c.icon}</span>
            <div>
              <div className="pfacts-value">{c.value}</div>
              <div className="pfacts-caption">{c.caption}</div>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .pfacts-eyebrow{
          font-family:var(--font-mono); font-size:10px; letter-spacing:0.15em;
          text-transform:uppercase; color:var(--muted); margin-bottom:12px;
        }

        /* The 2px gap is the grid line: the cards are --card and the gap shows
           the page's --background through, which is a step darker in dark mode
           and a step lighter in light. No borders, no radius — depth on this
           site is always a background-colour step (see the design system's
           Cards note). */
        .pfacts-grid{ display:grid; grid-template-columns:1fr 1fr; gap:2px; }
        .pfacts-card{
          background:var(--card); padding:14px 12px; min-width:0;
          display:flex; flex-direction:column; gap:10px;
          /* the one place state is expressed — icon, value and caption all
             inherit, so present/absent is a single flat colour swap */
          color:var(--muted);
        }
        .pfacts-card.is-on{ color:var(--accent); }
        .pfacts-card .material-symbols-outlined{ font-size:20px; }
        /* DM Mono, not the body sans. Metadata values are metadata: the type
           hierarchy on this site puts MSCHN on park names, DM Mono on every
           piece of metadata and Rubik on UI chrome only, so "Outdoor" / "Yes"
           belongs in the same face as the caption under it. 500 is the
           heaviest DM Mono weight loaded (see app/layout.tsx) — hierarchy
           against the caption comes from size and weight, never a typeface
           swap. */
        .pfacts-value{
          font-family:var(--font-mono); font-size:13px; font-weight:500;
          line-height:1.15; letter-spacing:-0.01em; color:inherit;
        }
        /* Captions never take the state colour. The value and its icon carry
           present/absent on their own; an orange caption said the same thing
           a third time and left the grid with no fixed reading line. */
        .pfacts-caption{
          font-family:var(--font-mono); font-size:8.5px; letter-spacing:0.1em;
          text-transform:uppercase; margin-top:4px; color:var(--muted);
        }

        /* ── Hero variant ───────────────────────────────────────────────
           Over the scan the page tokens stop applying: the hero is dark in
           both themes, so the panel takes the mockup's literal values, which
           sit a shade off the hero chip's rgba(20,18,15,0.82) and read as the
           same family of plate. Solid, not translucent — the whole point of
           pre-build check 2 is that a solid card survives a busy mesh. */
        .pfacts-glance--hero{ background:#141413; padding:12px; }
        .pfacts-glance--hero .pfacts-eyebrow{ color:rgba(243,239,236,0.55); margin-bottom:10px; }
        .pfacts-glance--hero .pfacts-card{ background:#232220; color:#5a5a56; }
        .pfacts-glance--hero .pfacts-card.is-on{ color:var(--accent); }
        /* page tokens don't apply over the scan, so the always-muted caption
           takes the hero's own grey rather than --muted */
        .pfacts-glance--hero .pfacts-caption{ color:#5a5a56; }

        /* ── Mobile ─────────────────────────────────────────────────────
           Three across instead of two, so eight cards fill three short rows
           instead of four tall ones and the photo gallery stays reachable.
           The ninth cell is left bare on purpose — panel background, no
           card — pending a decision on what belongs there. Padding and type
           flex down with the column count rather than the card being one
           fixed size at both breakpoints. */
        @media (max-width: 768px){
          .pfacts-grid{ grid-template-columns:repeat(3, 1fr); }
          .pfacts-card{ padding:11px 9px; gap:8px; }
          .pfacts-card .material-symbols-outlined{ font-size:18px; }
          .pfacts-value{ font-size:12px; }
          .pfacts-caption{ font-size:8px; letter-spacing:0.08em; }
        }
      `}</style>
    </div>
  );
}

// ── At a Glance, overlaid on the hero ──────────────────────────────────────
// Mounted inside ParkHeroShell's clipped hero box. Renders nothing at all
// under the sidebar placement, so the hero is untouched unless the flag is
// flipped.
//
// Desktop only, gated by media query rather than by ParkHeroShell's isMobile
// state: that state is false on the server and correct only after mount, and
// this hero already has one hydration mismatch without adding a second.
export function ParkGlanceHeroOverlay({ glance }: { glance: ParkGlance }) {
  if (GLANCE_PLACEMENT !== "hero") return null;
  return (
    <div className="pfacts-hero-slot">
      <div className="contained pfacts-hero-inner">
        <ParkGlanceGrid glance={glance} variant="hero" />
      </div>

      <style>{`
        /* Between the scrim (z 2) and the hero copy (z 5). Pointer-transparent
           throughout — nothing in the grid is clickable, and anything that
           took events here would swallow orbit drags across the whole top
           right of the viewer. */
        .pfacts-hero-slot{
          display:none;
          position:absolute; top:0; left:0; right:0; z-index:4;
          pointer-events:none;
        }
        @media (min-width: 769px){ .pfacts-hero-slot{ display:block; } }
        /* .contained supplies the horizontal inset, so the panel's right edge
           lines up with the park name and the editorial column below rather
           than with the hero's full-bleed edge. */
        .pfacts-hero-inner{
          display:flex; justify-content:flex-end;
          padding-top:calc(var(--nav-height, 44px) + 28px);
        }
        .pfacts-hero-slot .pfacts-glance{ width:280px; }
      `}</style>
    </div>
  );
}

function TransportBadge({ type }: { type: TransportLink["type"] }) {
  const bg: Record<string, string> = { tube: "#e32017", rail: "var(--foreground)", bus: "#e32017", tram: "#84b817" };
  const fg: Record<string, string> = { tube: "#fff", rail: "var(--background)", bus: "#fff", tram: "#fff" };
  const label: Record<string, string> = { tube: "LU", rail: "RL", bus: "B", tram: "T" };
  return (
    <div className="pfacts-tbadge" style={{ background: bg[type], color: fg[type] }}>
      {label[type]}
    </div>
  );
}

type Props = {
  glance: ParkGlance;
  openingTimes?: string | null;
  builtBy?: string | null;
  opened?: string | null;
  gettingThere?: string | null;
  /** Street address lines. The hero only carries area + postcode, so the full
   *  address still has to live somewhere — it sits under the prose. */
  address?: string[] | null;
  postcode?: string | null;
  transport?: TransportLink[] | null;
};

export default function ParkFacts({
  glance, openingTimes, builtBy, opened, gettingThere, address, postcode, transport,
}: Props) {
  const [open, setOpen] = useState(false);

  const factRows: { icon: string; label: string; value: string }[] = [];
  if (openingTimes) factRows.push({ icon: "schedule",       label: "Opening times", value: openingTimes });
  if (builtBy)      factRows.push({ icon: "handyman",       label: "Built by",      value: builtBy });
  if (opened)       factRows.push({ icon: "calendar_month", label: "Opened",        value: opened });

  const addressLines = (address ?? []).filter(Boolean);
  const links = transport ?? [];
  const hasGettingThere = !!gettingThere || addressLines.length > 0 || !!postcode || links.length > 0;

  return (
    <div className="pfacts">
      {GLANCE_PLACEMENT === "sidebar" && <ParkGlanceGrid glance={glance} />}

      {factRows.length > 0 && (
        <div className={`pfacts-rows${GLANCE_PLACEMENT === "sidebar" ? " pfacts-rows--after-grid" : ""}`}>
          {factRows.map(r => (
            <div key={r.label} className="pfacts-row">
              <span className="pfacts-row-label">
                <span className="material-symbols-outlined" aria-hidden="true">{r.icon}</span>
                {r.label}
              </span>
              <span className="pfacts-row-value">{r.value}</span>
            </div>
          ))}
        </div>
      )}

      {hasGettingThere && (
        <div className={`pfacts-acc${open ? " is-open" : ""}`}>
          <button
            type="button"
            className="pfacts-acc-trigger"
            id="pfacts-getting-there-trigger"
            aria-expanded={open}
            aria-controls="pfacts-getting-there"
            onClick={() => setOpen(v => !v)}
          >
            <span className="pfacts-row-label">
              <span className="material-symbols-outlined" aria-hidden="true">directions</span>
              Getting there
            </span>
            <span className="pfacts-chevron" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </span>
          </button>

          {/* inert while closed so the address and transport list stay out of
              the tab order and off screen readers until the row is open —
              same contract as the Directory accordion's drawer. */}
          <div
            className="pfacts-drawer"
            id="pfacts-getting-there"
            role="region"
            aria-labelledby="pfacts-getting-there-trigger"
            inert={!open}
          >
            <div className="pfacts-drawer-inner">
              <div className="pfacts-drawer-body">
                {gettingThere && (
                  <div className="pfacts-prose">
                    {gettingThere.split("\n").map(s => s.trim()).filter(Boolean).map((p, i) => (
                      <p key={i}>{p}</p>
                    ))}
                  </div>
                )}

                {(addressLines.length > 0 || postcode) && (
                  <div className="pfacts-address">
                    {addressLines.map((l, i) => <span key={i}>{l}<br /></span>)}
                    {postcode && <span className="pfacts-postcode">{postcode}</span>}
                  </div>
                )}

                {links.length > 0 && (
                  <div className="pfacts-transport">
                    {links.map((t, i) => (
                      <div key={i} className="pfacts-transport-row">
                        <TransportBadge type={t.type} />
                        <div>
                          <div className="pfacts-transport-name">{t.name}</div>
                          <div className="pfacts-transport-detail">{t.detail}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        /* ── Fact rows ──────────────────────────────────────────────────
           Mono uppercase label left, bold value right, hairline above —
           the same metadata language as the hero's address chips. */
        .pfacts-rows--after-grid{ margin-top:24px; }
        .pfacts-row{
          display:flex; align-items:center; justify-content:space-between;
          gap:16px; padding:13px 0; border-top:1px solid var(--border);
        }
        .pfacts-row-label{
          display:flex; align-items:center; gap:9px; min-width:0;
          font-family:var(--font-mono); font-size:10px; letter-spacing:0.12em;
          text-transform:uppercase; color:var(--muted);
        }
        .pfacts-row-label .material-symbols-outlined{ font-size:16px; }
        /* Same rule as .pfacts-value above: the label is DM Mono, so the
           value it answers is too. Every piece of type on this panel is now
           one face. */
        .pfacts-row-value{
          font-family:var(--font-mono); font-size:13px; font-weight:500;
          letter-spacing:-0.01em; text-align:right;
          color:var(--foreground); line-height:1.3;
        }

        /* ── Getting there ──────────────────────────────────────────────
           Chevron geometry and timing match .pda-chevron in
           ParksDirectoryAccordion so the two accordions read as one control. */
        .pfacts-acc{ border-top:1px solid var(--border); }
        .pfacts-acc-trigger{
          all:unset; box-sizing:border-box; width:100%; cursor:pointer;
          display:flex; align-items:center; justify-content:space-between; gap:16px;
          padding:11px 0;
        }
        .pfacts-acc-trigger:focus-visible{ outline:2px solid var(--accent); outline-offset:2px; }
        .pfacts-chevron{
          flex-shrink:0; width:28px; height:28px; border-radius:50%;
          border:0.5px solid var(--border);
          display:flex; align-items:center; justify-content:center;
          color:var(--muted); transition:border-color .18s ease;
        }
        .pfacts-chevron svg{
          width:12px; height:12px;
          transition:transform .28s cubic-bezier(.2,.8,.2,1);
        }
        .pfacts-acc.is-open .pfacts-chevron svg{ transform:rotate(180deg); }
        @media (hover: hover){
          .pfacts-acc-trigger:hover .pfacts-chevron{ border-color:var(--accent); }
        }

        .pfacts-drawer{
          display:grid; grid-template-rows:0fr; opacity:0;
          transition:grid-template-rows .42s cubic-bezier(.22,1,.36,1), opacity .25s ease;
        }
        .pfacts-acc.is-open .pfacts-drawer{ grid-template-rows:1fr; opacity:1; }
        .pfacts-drawer-inner{ overflow:hidden; min-height:0; }
        .pfacts-drawer-body{
          display:flex; flex-direction:column; gap:16px;
          padding:4px 0 18px;
          transform:translateY(-6px);
          transition:transform .42s cubic-bezier(.22,1,.36,1);
        }
        .pfacts-acc.is-open .pfacts-drawer-body{ transform:none; }

        .pfacts-prose p{ font-size:13px; line-height:1.7; color:var(--foreground); margin:0 0 10px; }
        .pfacts-prose p:last-child{ margin-bottom:0; }
        .pfacts-address{ font-size:13px; line-height:1.6; color:var(--foreground); }
        .pfacts-postcode{ color:var(--muted); }
        .pfacts-transport{ display:flex; flex-direction:column; gap:10px; }
        .pfacts-transport-row{ display:flex; align-items:flex-start; gap:10px; }
        .pfacts-tbadge{
          width:26px; height:26px; border-radius:3px; flex-shrink:0;
          display:flex; align-items:center; justify-content:center;
          font-family:var(--font-mono); font-size:10px; font-weight:700;
          letter-spacing:0.05em;
        }
        .pfacts-transport-name{ font-size:13px; font-weight:500; line-height:1.2; color:var(--foreground); }
        .pfacts-transport-detail{
          font-family:var(--font-mono); font-size:10px; letter-spacing:0.04em;
          color:var(--muted); margin-top:2px;
        }

        @media (prefers-reduced-motion: reduce){
          .pfacts-drawer, .pfacts-drawer-body, .pfacts-chevron svg{ transition-duration:.01ms; }
        }
      `}</style>
    </div>
  );
}
