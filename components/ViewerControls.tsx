"use client";

import Link from "next/link";

// ── Viewer control system ─────────────────────────────────────────────────
// One button primitive and one cluster, shared by every surface that carries
// viewer chrome: the inline hero, the mobile fallback pill and the fullscreen
// modal. Before this, desktop had its own `.fbs-hero-*` buttons that duplicated
// the primitive's values by hand and positioned themselves with a chain of
// right-offsets, each control's position derived from the widths of the ones
// beside it. Adding a fifth control meant editing three expressions; the
// interpretive tools on the roadmap (SCALE / FLOW / FEATURES) would have meant
// editing all of them.
//
// Layout is now flex + gap, so a control's position is a consequence of the
// order it appears in and nothing else.
//
// TWO CLUSTERS, NOT ONE ROW. Navigation moves you to another park; tools change
// how you are looking at this one. They were already independent in the code —
// the catalogue nav deliberately renders whether or not the park has a scan —
// and they are now independent in the layout, separated by a wider gap than
// anything inside either group. That gap is the whole visual statement of the
// split; nothing is boxed or labelled.

/** Visual scale of a cluster's buttons. Both keep the same square, technical,
 *  dark-glass character — they differ only in whether the buttons share one
 *  plate.
 *    spaced — separate bordered squares. The inline hero's existing look.
 *    joined — one plate with hairline dividers. The mobile pill and modal's. */
export type ViewerClusterVariant = "spaced" | "joined";

// ── Icons ─────────────────────────────────────────────────────────────────

// The prop is `filled`, not `active`, because "active" was ambiguous about
// what it referred to — the B&W mode or the icon — and it got bound to the
// wrong one. It means only: draw the half-fill. Callers decide when, and the
// answer is "when colour is on": a solid shape reads as something applied, an
// empty outline as something stripped away.
export function BwIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.4" />
      {filled && <path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" />}
    </svg>
  );
}

/** Enter the scan. Only ever an entry point — exiting is ExitIcon. */
export function ArIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 2l8 4.5v9L12 22l-8-6.5V6.5z" />
      <path d="M12 2v20M4 6.5l8 5.5 8-5.5" />
    </svg>
  );
}

// Automatic rotation, reporting state the way BwIcon does: the icon says what
// the model is doing, the label says what pressing it will do.
//
// The arc is in both states, so the control keeps one identity; what changes is
// a whole glyph, not a colour. That is deliberate — the accent this takes while
// rotating is `is-active` doing its usual job, and it must not be the only
// thing separating the two states for anyone who cannot see it.
//   rotating — the arc closes with an arrowhead: it is turning.
//   paused   — the arc is open and two bars sit in it: it is stopped.
export function OrbitIcon({ rotating }: { rotating: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20.5 12a8.5 8.5 0 1 1-2.49-6.01" />
      {rotating
        ? <polyline points="18.5 1.5 18.5 6.5 13.5 6.5" />
        : <><path d="M10 9v6" /><path d="M14 9v6" /></>}
    </svg>
  );
}

// Exit, everywhere. This replaced ArExitIcon — a wireframe cube with a slash
// through it — which the 7A audit found unreadable: a negated cube says "turn
// off 3D", not "leave this view", and sitting in a plate beside a half-filled
// circle it read as a third rendering toggle. Once SCALE / FLOW / FEATURES join
// that cluster, anything that looks like a layer toggle is actively wrong. A
// cross is the one glyph that cannot be mistaken for a mode.
export function ExitIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function PrevIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 12H4" /><path d="M10 6l-6 6 6 6" />
    </svg>
  );
}

export function NextIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 12h16" /><path d="M14 6l6 6-6 6" />
    </svg>
  );
}

// ── Layout ────────────────────────────────────────────────────────────────

/** The positioned row that holds the clusters. One absolute box; the clusters
 *  inside it are laid out, not placed. */
export function ViewerControlBar({ children, className }: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`vc-bar${className ? ` ${className}` : ""}`}>{children}</div>;
}

export function ViewerCluster({ variant = "joined", label, className, children }: {
  variant?: ViewerClusterVariant;
  /** Names the group for assistive tech — "Catalogue navigation", "Scan
   *  controls". The two clusters are only separated by a gap visually, so
   *  without this the split exists for sighted readers and nobody else. */
  label?: string;
  /** For a mount site that needs to address one cluster — the hero hides the
   *  navigation group below 768. Not for restyling the controls. */
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`vc-cluster vc-cluster--${variant}${className ? ` ${className}` : ""}`}
      role="group"
      aria-label={label}
    >
      {children}
    </div>
  );
}

export function ViewerClusterDivider() {
  return <div className="vc-divider" aria-hidden />;
}

/** A readout, not a control — the catalogue index. Same plate as the buttons
 *  so the cluster reads as one object, but no hover, no pointer, no focus. */
export function ViewerReadout({ children, label }: {
  children: React.ReactNode;
  label?: string;
}) {
  return <span className="vc-readout" aria-label={label}>{children}</span>;
}

type ButtonProps = {
  /** The accessible name, and the visible text when `showLabel` is set. Always
   *  describes the ACTION, so it stays correct as a `title` and as an
   *  aria-label — see the note on the B&W control in ParkHeroShell. */
  label: string;
  icon: React.ReactNode;
  /** Renders `label` beside the icon. For entry points where an icon alone has
   *  been shown not to communicate — see the phone's scan entry. */
  showLabel?: boolean;
  /** Tool toggles only: the layer/mode this control governs is on. Draws the
   *  Scout accent. Exit must never set this — see ExitIcon. */
  active?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  href?: string;
  disabled?: boolean;
};

export function ViewerClusterButton({
  label, icon, showLabel = false, active = false, onClick, href, disabled,
}: ButtonProps) {
  const className = `vc-btn${showLabel ? " vc-btn--labelled" : ""}${active ? " is-active" : ""}`;
  const content = (
    <>
      <span className="vc-btn__icon" aria-hidden>{icon}</span>
      {showLabel && <span className="vc-btn__label">{label}</span>}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className} aria-label={label} title={label} onClick={onClick}>
        {content}
      </Link>
    );
  }
  return (
    <button
      type="button"
      className={className}
      aria-label={label}
      title={label}
      aria-pressed={active ? true : undefined}
      onClick={onClick}
      disabled={disabled}
    >
      {content}
    </button>
  );
}

// ── Stylesheet ────────────────────────────────────────────────────────────
// Injected by each mount site, the same way PARK_CARD_CSS is. Duplicate
// identical rules are harmless and it keeps the values in one file.
export const VIEWER_CONTROLS_CSS = `
  /* The bar positions; the clusters lay out. No control computes its own
     offset from its neighbours' widths. */
  .vc-bar, .vc-cluster{
    /* Declared on the containers, not on the button: the joined variant paints
       the plate on the cluster itself, so a token scoped to .vc-btn resolved to
       nothing there and the phone pill lost its background entirely. */
    --vc-fill:rgba(20,18,15,0.82);
    --vc-fill-hover:rgba(46,42,37,0.92);
  }
  .vc-bar{
    display:flex; align-items:center;
    /* The split. Deliberately wider than any gap inside a cluster, so
       "navigate away" and "change this view" read as two groups without a
       box, a rule or a label around either. */
    gap:var(--vc-group-gap, 20px);
  }

  .vc-cluster{ display:flex; align-items:center; }
  /* Separate flat plates. */
  .vc-cluster--spaced{ gap:var(--vc-gap, 8px); }
  /* One plate, with a hairline divider between controls — the phone pill and
     the modal. The divider stays because it is structural: it separates two
     controls that share a surface. */
  .vc-cluster--joined{ background:var(--vc-fill); overflow:hidden; border-radius:3px; }
  .vc-divider{ width:1px; align-self:stretch; background:rgba(255,255,255,0.14); }

  /* ── The button ────────────────────────────────────────────────────────
     One box for every viewer control on the site. --vc-btn is the VISIBLE
     square; the touch target is a separate concern below. */
  .vc-btn, .vc-readout{
    --vc-btn:34px;
    /* ── Surface ────────────────────────────────────────────────────────
       These are .fbs-field-tag--chip's values, not new ones: the same flat
       near-black plate, the same 3px radius, no perimeter stroke. That chip is
       Scout's existing treatment for a small surface carrying mono notation
       over a scan, and it is already on this hero — the park name's catalogue
       mark, coordinates, address and scanned date are all sitting in it a few
       hundred pixels below these controls.

       What this replaced was a 1px rgba(255,255,255,0.34) outline on a lighter
       0.66 fill. A row of outlined utility squares is CAD-viewer vocabulary,
       not Scout's; the site is flat surfaces, sharp geometry and notation, and
       it does not otherwise draw perimeter strokes around buttons. Matching the
       chip means the controls read as the same family of object as the
       metadata they sit above, rather than as an embedded third-party 3D app.
       The two fill tokens are declared on .vc-bar / .vc-cluster above. */
    appearance:none; -webkit-appearance:none; margin:0;
    position:relative;
    display:inline-flex; align-items:center; justify-content:center;
    height:var(--vc-btn); padding:0;
    color:#F3EFEC;
    font-family:var(--font-mono); font-size:11px; font-weight:500; letter-spacing:.08em;
    text-transform:uppercase; text-decoration:none; white-space:nowrap;
    transition:color .18s ease, border-color .18s ease, background-color .18s ease;
  }
  .vc-btn{ width:var(--vc-btn); cursor:pointer; }
  .vc-btn__icon{ display:flex; align-items:center; justify-content:center; }
  /* A labelled control is auto-width: icon, then text. Used where an icon
     alone has been shown not to carry the meaning. */
  .vc-btn--labelled{ width:auto; padding:0 12px 0 10px; gap:8px; }
  .vc-readout{ padding:0 10px; cursor:default; }

  /* The spaced variant draws the plate per button; the joined variant draws it
     once on the cluster, so its buttons are transparent. */
  .vc-cluster--spaced .vc-btn,
  .vc-cluster--spaced .vc-readout{ background:var(--vc-fill); border-radius:3px; }
  .vc-cluster--joined .vc-btn,
  .vc-cluster--joined .vc-readout{ background:none; }

  /* ── Touch target ──────────────────────────────────────────────────────
     Same principle the Grid density control uses: the visible square stays
     compact — this is a photographic surface and its chrome should not read as
     a toolbar — and a transparent ::after extends the hit area to 44x44 where
     the pointer is coarse. The audit measured these at 34x34 on iPad, under
     the minimum in both axes.

     Only on coarse pointers: on a mouse a 34px square is already an easy
     target, and an invisible 44px box would overlap its neighbours for no
     benefit. */
  @media (pointer: coarse){
    .vc-btn::after{
      content:""; position:absolute; top:50%; left:50%;
      transform:translate(-50%, -50%);
      width:max(100%, 44px); height:max(100%, 44px);
    }
    /* The hit areas are 44px on a 34px button, so they would overlap at the
       8px resting gap — and in the nav cluster the neighbours are PREV and
       NEXT, which leave the park. A 12px gap puts the pitch at 46px and the
       targets fully clear of each other. */
    .vc-cluster--spaced{ --vc-gap:12px; }
    .vc-bar{ --vc-group-gap:24px; }
    /* On a coarse pointer the visible control IS the target, in every variant.
       This used to apply to joined clusters alone, because their overflow:hidden
       clips an oversized ::after so their buttons had to carry the size
       themselves. Spaced buttons stayed 34px with an invisible 44px box, which
       was fine while every cluster on a surface was the same variant — and
       stopped being fine the moment one was not: the hero now joins its
       catalogue stepper and spaces its tool toggles, and the two sat 10px apart
       in height on iPad, one plate visibly taller than the other beside it.

       Sizing every control the same way removes the variant from the question.
       The ::after is left in place and simply stops doing anything, since
       max(100%, 44px) on a 44px button is the button. */
    .vc-btn, .vc-readout{ --vc-btn:44px; }
  }

  /* ── States ────────────────────────────────────────────────────────────
     A tonal response, not an inversion. The old treatment flipped the button to
     a solid white fill with dark type, which on a flat plate reads as a second
     state of the surface rather than a hover — and with the outline gone there
     is no longer an edge for it to resolve against. Lifting the fill one step
     and taking the type to full white is enough to answer the pointer.
     Guarded on hover capability so a tap cannot leave a control stuck lit. */
  @media (hover: hover){
    .vc-cluster--spaced .vc-btn:hover{ color:#fff; background:var(--vc-fill-hover); }
    .vc-cluster--joined .vc-btn:hover{ color:#fff; background:rgba(255,255,255,0.10); }
  }
  .vc-btn:focus-visible{ outline:2px solid var(--accent); outline-offset:2px; z-index:1; }
  /* Tool toggles only. Exit never takes this — a neutral exit is what keeps it
     out of the "active layer" vocabulary the interpretive tools will use. */
  /* Orange is identity and active state — nowhere else in this chrome. */
  .vc-btn.is-active{ color:var(--accent); }
  @media (hover: hover){
    .vc-btn.is-active:hover{ color:var(--accent); }
  }
  .vc-btn[disabled]{ opacity:.4; cursor:default; pointer-events:none; }

  @media (prefers-reduced-motion: reduce){
    .vc-btn{ transition-duration:.01ms; }
  }
`;
