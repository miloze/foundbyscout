"use client";

// Origins / Local Knowledge — an editorial disclosure.
//
// The row is full width and entirely clickable, but everything visible is
// capped to the editorial reading column (700px). Previously the caret was
// pinned to the far right of the row, which on a wide screen put ~600px of
// nothing between the sentence and the control that opens it — the row read as
// passive. The caret now trails the summary text inline, so it follows the last
// line wherever it wraps and stays part of the heading rather than a utility
// button parked at the edge.
//
// Motion: drawer rows, opacity, the body's vertical travel and the caret
// rotation all run on the same 500ms curve, starting together. Nothing waits
// for the drawer to finish.
//
// Accessibility: a real <button> carrying aria-expanded / aria-controls, and
// the panel as a role="region" that is inert while closed, so its content stays
// out of the tab order and off screen readers until opened. Keyboard works by
// virtue of being a button; :focus-visible draws a ring on the capped inner
// block rather than the full-bleed row.

import { useId, useState } from "react";

type Props = {
  label: string;
  teaser?: string | null;
  body?: string[] | null;
  items?: string[] | null;
};

function Caret() {
  return (
    <span className="eacc-caret" aria-hidden>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9l6 6 6-6" />
      </svg>
    </span>
  );
}

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
        <span className="eacc-inner">
          <span className="eacc-label">
            {label}
            {/* No teaser to trail, so the caret follows the label instead. */}
            {!teaser && <Caret />}
          </span>
          {teaser && (
            <span className="eacc-summary">
              {teaser}
              <Caret />
            </span>
          )}
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
        .eacc-item{
          --eacc-dur: .5s;
          --eacc-ease: cubic-bezier(.22, 1, .36, 1);
          --eacc-col: 700px;
          position:relative;
        }
        /* The divider is the interaction surface, not a permanent rule — a line
           under every row stacked into a ladder, which is why they were removed.
           It fades in on hover/focus and goes solid in the accent when open. */
        /* Full-bleed hit area; the visible content is capped by .eacc-inner.
           The divider lives on the button so :hover and :focus-visible reach it
           directly, with no :has() dependency. */
        .eacc-trigger{
          all:unset; box-sizing:border-box; position:relative;
          display:block; width:100%;
          padding:22px 0; cursor:pointer;
          -webkit-tap-highlight-color:transparent;
        }
        .eacc-trigger::after{
          content:""; position:absolute; left:0; bottom:0;
          width:min(var(--eacc-col), 100%); height:1px;
          background:var(--accent); opacity:0;
          transition:opacity var(--eacc-dur) var(--eacc-ease),
                     height  var(--eacc-dur) var(--eacc-ease);
          pointer-events:none;
        }
        .eacc-item.eacc-open .eacc-trigger::after{ opacity:1; height:2px; }
        .eacc-inner{
          display:block; max-width:var(--eacc-col);
          /* 44px minimum touch target even if the text is a single short line */
          min-height:44px;
        }
        .eacc-trigger:focus-visible .eacc-inner{
          outline:2px solid var(--accent); outline-offset:6px;
        }

        .eacc-label{
          display:block;
          font-family:var(--font-mono); font-size:10px; letter-spacing:.15em;
          text-transform:uppercase; color:var(--muted);
          transition:color var(--eacc-dur) var(--eacc-ease);
        }
        .eacc-summary{
          display:block; margin-top:8px;
          font-size:15px; line-height:1.6; color:var(--foreground);
          opacity:.82;
          transition:opacity var(--eacc-dur) var(--eacc-ease);
        }

        /* Trails the text inline, so it follows the last line wherever that
           falls instead of sitting at the row's right edge. */
        .eacc-caret{
          display:inline-flex; align-items:center;
          margin-left:28px; vertical-align:baseline;
          color:var(--muted);
          transition:transform var(--eacc-dur) var(--eacc-ease),
                     color     var(--eacc-dur) var(--eacc-ease);
        }
        .eacc-caret svg{ width:14px; height:14px; display:block; }
        .eacc-item.eacc-open .eacc-caret{ transform:rotate(180deg); }

        @media (hover: hover){
          .eacc-trigger:hover .eacc-summary{ opacity:1; }
          .eacc-trigger:hover .eacc-label{ color:var(--foreground); }
          .eacc-trigger:hover .eacc-caret{ color:var(--accent); transform:translateY(2px); }
          .eacc-item.eacc-open .eacc-trigger:hover .eacc-caret{ transform:rotate(180deg) translateY(2px); }
          .eacc-item:not(.eacc-open) .eacc-trigger:hover::after{ opacity:.45; }
        }
        /* Keyboard focus gets the same divider cue as hover. */
        .eacc-item:not(.eacc-open) .eacc-trigger:focus-visible::after{ opacity:.45; }

        .eacc-drawer{
          display:grid; grid-template-rows:0fr; opacity:0;
          transition:grid-template-rows var(--eacc-dur) var(--eacc-ease),
                     opacity            var(--eacc-dur) var(--eacc-ease);
        }
        .eacc-item.eacc-open .eacc-drawer{ grid-template-rows:1fr; opacity:1; }
        .eacc-drawer-inner{ overflow:hidden; min-height:0; }
        /* Flush with the summary — no indent — and capped to the same column. */
        .eacc-drawer-body{
          max-width:var(--eacc-col);
          padding:0 0 26px;
          transform:translateY(-8px);
          transition:transform var(--eacc-dur) var(--eacc-ease);
          font-size:15px; line-height:1.75; color:var(--foreground);
        }
        .eacc-item.eacc-open .eacc-drawer-body{ transform:none; }

        .eacc-list{ list-style:none; margin:0; padding:0; }
        .eacc-list li{
          display:grid; grid-template-columns:18px 1fr; gap:4px;
          margin-top:12px;
        }
        .eacc-list li:first-child{ margin-top:0; }
        .eacc-list li::before{ content:"—"; color:var(--accent); line-height:1.75; }

        @media (max-width: 640px){
          .eacc-trigger{ padding:18px 0; }
          /* Keep the caret with the text rather than at the screen edge. */
          .eacc-caret{ margin-left:20px; }
        }

        @media (prefers-reduced-motion: reduce){
          .eacc-item::after, .eacc-label, .eacc-summary, .eacc-caret,
          .eacc-drawer, .eacc-drawer-body{ transition-duration:.01ms; }
        }
      `}</style>
    </div>
  );
}
