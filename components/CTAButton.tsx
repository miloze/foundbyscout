"use client";

import Link from "next/link";

/**
 * The site's primary call to action — VIEW SCAN, EXPLORE, and anything that
 * follows. These were two separate implementations that had drifted apart on
 * type size, tracking, corner radius and hover behaviour; this exists so a
 * change to one is a change to all of them.
 *
 * Styling lives in app/globals.css under .fbs-cta, not in an inline <style>
 * here, so the rules are defined once for the document rather than once per
 * render site — the home page alone mounts two of these.
 *
 * The interaction is deliberately not configurable. `variant` reaches only the
 * three colour custom properties; hover timing, easing and the arrow nudge sit
 * on .fbs-cta itself where a variant cannot override them. That's what stops
 * the two CTAs drifting again.
 */

// A variant is a class block in globals.css setting the colour custom
// properties and nothing else.
//   accent — the primary fill (VIEW SCAN, EXPLORE).
//   ghost  — quiet over imagery: translucent at rest with a low-contrast
//            outline, inverting to a white fill on hover. Used where the CTA
//            sits on a photo or a scan rather than on the page ground.
type Variant = "accent" | "ghost";

type Props = {
  label: string;
  /** Renders a Link. */
  href?: string;
  /** Runs on activation, in both forms. On its own it renders a <button> for
   *  CTAs that open something in place; alongside `href` it runs before the
   *  navigation, which is what the park cards need — they sit inside a
   *  click-to-navigate card and have to stop the event reaching it, or the
   *  parent handler pushes the same route a second time. It used to be
   *  documented as mutually exclusive with href and silently dropped in the
   *  Link branch, which is why ParkCard carried its own <a> instead. */
  onClick?: (e: React.MouseEvent) => void;
  variant?: Variant;
};

export default function CTAButton({ label, href, onClick, variant = "accent" }: Props) {
  const className = `fbs-cta fbs-cta--${variant}`;

  // Label and arrow are separate elements: on hover only the arrow moves. The
  // caret is the same glyph the park cards use — it replaced the ↘ that read
  // as too small and sat wrong against the word.
  const content = (
    <>
      <span className="fbs-cta__label">{label}</span>
      <svg className="fbs-cta__arrow"
        width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M9 5l7 7-7 7" />
      </svg>
    </>
  );

  if (href) {
    return <Link href={href} className={className} onClick={onClick}>{content}</Link>;
  }
  return <button type="button" className={className} onClick={onClick}>{content}</button>;
}
