"use client";

// Origins / Local Knowledge — a disclosure that behaves exactly like the
// archive accordion on /parks.
//
// The interaction states here are ported verbatim from ParksDirectoryAccordion
// (.pda-item / .pda-trigger / .pda-chevron / .pda-drawer) so the two accordions
// on the site feel identical:
//
//   · quiet grey hover plate on the row (real pointers only — on touch a hover
//     state sticks after tap), with static padding/negative margin so nothing
//     reflows and only background-color moves
//   · the circular chevron's border is the only coloured affordance on hover
//   · 2px coral edge along the bottom when open, riding over the divider so
//     opening never shifts the row
//   · drawer opens on grid-template-rows 0fr → 1fr, .42s cubic-bezier(.22,1,.36,1)
//   · :active scale(.995), :focus-visible 2px coral outline, reduced-motion opt-out
//
// Accessibility follows the same shape too: a real <button> trigger carrying
// aria-expanded / aria-controls, and the drawer as role="region" that is inert
// while closed, so its content stays out of the tab order and off screen
// readers until the row is open.
//
// (Native <details> was the earlier draft. It is fewer lines, but it cannot
// reproduce these states — so consistency wins. If a third accordion ever
// appears, this CSS and ParksDirectoryAccordion's should be extracted into one
// shared ACCORDION_CSS constant rather than copied a third time.)

import { useId, useState } from "react";

type Props = {
  label: string;
  teaser?: string | null;
  body?: string[] | null;
  items?: string[] | null;
};

export default function EditorialAccordion({ label, teaser, body, items }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const uid = useId();

  const paragraphs = (body ?? []).map(p => p?.trim()).filter(Boolean) as string[];
  const bullets    = (items ?? []).map(p => p?.trim()).filter(Boolean) as string[];
  if (paragraphs.length === 0 && bullets.length === 0) return null;

  const panelId   = `eacc-panel-${uid}`;
  const triggerId = `eacc-trigger-${uid}`;

  return (
    <div className={`eacc-item${isOpen ? " eacc-open" : ""}`}>
      <button
        type="button" className="eacc-trigger" id={triggerId}
        aria-expanded={isOpen} aria-controls={panelId}
        onClick={() => setIsOpen(o => !o)}
      >
        <span className="eacc-trigger-content">
          <span className="eacc-label">{label}</span>
          {teaser && <span className="eacc-teaser">{teaser}</span>}
        </span>
        <span className="eacc-chevron" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      </button>

      <div className="eacc-drawer" id={panelId} role="region" aria-labelledby={triggerId} inert={!isOpen}>
        <div className="eacc-drawer-inner">
          <div className="eacc-drawer-body">
            {paragraphs.map((p, i) => (
              <p key={i} style={{ marginTop: i > 0 ? 14 : 0 }}>{p}</p>
            ))}

            {bullets.length > 0 && (
              <ul className="eacc-list" style={{ marginTop: paragraphs.length ? 18 : 0 }}>
                {bullets.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <style>{`
        /* ── ported from ParksDirectoryAccordion — keep the two in step ── */
        /* No per-row rule: a divider under every row stacked up into a ladder
           of repeating lines. Whitespace, the hover plate and the chevron carry
           the structure instead; the coral edge still marks the open row. The
           section's own bottom border stays — that is a block divider, a
           different job. Kept in step with .pda-item in ParksDirectoryAccordion. */
        .eacc-item{
          --eacc-ease: cubic-bezier(0.16, 1, 0.3, 1);
          position:relative;
          padding:26px 16px; margin:0 -16px;
          transition:background-color .18s ease;
        }
        .eacc-item::after{
          content:""; position:absolute; left:0; right:0; bottom:0; height:2px;
          background:var(--accent); opacity:0;
          transition:opacity .18s ease; pointer-events:none;
        }
        .eacc-item.eacc-open::after{ opacity:1; }
        @media (hover: hover){
          .eacc-item:not(.eacc-open):hover{ background-color:var(--card); }
          .eacc-item:not(.eacc-open):hover .eacc-chevron{ border-color:var(--accent); }
        }

        .eacc-trigger{
          all:unset; box-sizing:border-box;
          display:grid; grid-template-columns:1fr 28px; gap:16px; align-items:center;
          width:100%; cursor:pointer;
          transition:transform .12s var(--eacc-ease);
        }
        .eacc-trigger:active{ transform:scale(.995); }
        .eacc-trigger:focus-visible{ outline:2px solid var(--accent); outline-offset:4px; }
        .eacc-trigger-content{ padding-left:12px; min-width:0; display:block; }

        .eacc-label{
          display:block;
          font-family:var(--font-mono); font-size:10px; letter-spacing:.15em;
          text-transform:uppercase; color:var(--muted);
        }
        .eacc-teaser{
          display:block; margin-top:8px;
          font-size:15px; line-height:1.6; color:var(--foreground);
        }

        .eacc-chevron{
          width:28px; height:28px; border-radius:50%;
          border:0.5px solid var(--border);
          display:flex; align-items:center; justify-content:center;
          color:var(--muted);
          transition:border-color .18s ease;
        }
        .eacc-chevron svg{
          width:12px; height:12px;
          transition:transform .28s cubic-bezier(.2,.8,.2,1);
        }
        .eacc-item.eacc-open .eacc-chevron svg{ transform:rotate(180deg); }

        .eacc-drawer{
          display:grid; grid-template-rows:0fr; opacity:0;
          transition:grid-template-rows .42s cubic-bezier(.22,1,.36,1), opacity .25s ease;
        }
        .eacc-item.eacc-open .eacc-drawer{ grid-template-rows:1fr; opacity:1; }
        .eacc-drawer-inner{ overflow:hidden; min-height:0; }
        .eacc-drawer-body{
          padding:18px 12px 4px;
          transform:translateY(-6px);
          transition:transform .42s cubic-bezier(.22,1,.36,1);
          font-size:15px; line-height:1.75; color:var(--foreground);
          max-width:62ch;
        }
        .eacc-item.eacc-open .eacc-drawer-body{ transform:none; }

        .eacc-list{ list-style:none; margin:0; padding:0; }
        .eacc-list li{
          display:grid; grid-template-columns:18px 1fr; gap:4px;
          margin-top:12px;
        }
        .eacc-list li:first-child{ margin-top:0; }
        .eacc-list li::before{ content:"—"; color:var(--accent); line-height:1.75; }

        @media (prefers-reduced-motion: reduce){
          .eacc-item, .eacc-trigger, .eacc-chevron svg,
          .eacc-drawer, .eacc-drawer-body{ transition-duration:.01ms; }
          .eacc-trigger:active{ transform:none; }
        }
      `}</style>
    </div>
  );
}
