// Page scroll lock, shared so the two things that need it cannot drift apart.
//
// Locking `body` alone is not enough. The viewport scrollbar stays drawn, and
// a `position: fixed` element's containing block stops at it — so a full-bleed
// overlay lands ~15px short and its right edge looks clipped. Locking the
// scrolling element removes the bar, which would then shift the page under it,
// so the width is handed back as padding.
//
// Returns the undo. Call it exactly once; calling it twice is harmless but the
// second call restores values that are already restored.
export function lockPageScroll(
  { reclaimScrollbar = true }: { reclaimScrollbar?: boolean } = {},
): () => void {
  if (typeof document === "undefined") return () => {};

  const doc = document.documentElement;
  const body = document.body;

  // Only worth reclaiming for something that covers the viewport. An in-page
  // element does not: taking the scrollbar away widens the page by its width,
  // and anything sized to --vw (every .full-bleed on the site) stays at the
  // old width, leaving a strip of page background down the right-hand side.
  // Locking the body alone stops the scroll and leaves the bar where it is.
  if (!reclaimScrollbar) {
    const prevBody = body.style.overflow;
    body.style.overflow = "hidden";
    return () => { body.style.overflow = prevBody; };
  }

  const barWidth = window.innerWidth - doc.clientWidth;
  const prev = {
    html: doc.style.overflow,
    body: body.style.overflow,
    pad: body.style.paddingRight,
  };
  const basePad = parseFloat(getComputedStyle(body).paddingRight) || 0;

  doc.style.overflow = "hidden";
  body.style.overflow = "hidden";
  if (barWidth > 0) body.style.paddingRight = `${basePad + barWidth}px`;

  return () => {
    doc.style.overflow = prev.html;
    body.style.overflow = prev.body;
    body.style.paddingRight = prev.pad;
  };
}
