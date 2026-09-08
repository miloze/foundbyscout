/**
 * The district half of a UK postcode — the outward code.
 *
 * Scout's field notation prints the district rather than the full postcode
 * ("SE27 / SOUTH LONDON"), because the full code identifies a delivery point
 * and the district identifies a place. This derives one from the other rather
 * than storing it twice.
 *
 * A full postcode always ends in a space-separated inward code of the form
 * digit-letter-letter, so the outward code is whatever precedes it. Matching
 * that shape rather than splitting on the space means a value stored without
 * one ("SE279UA") still resolves, which a split would not.
 */
export function postcodeDistrict(postcode?: string | null): string | null {
  if (!postcode) return null;
  const s = postcode.trim().toUpperCase();
  if (!s) return null;

  const full = s.match(/^([A-Z]{1,2}\d[A-Z\d]?)\s*\d[A-Z]{2}$/);
  if (full) return full[1];

  // Not a full postcode. A district on its own is already the answer; anything
  // else falls back to the first token rather than printing something longer
  // than the notation expects.
  const first = s.split(/\s+/)[0];
  return first || null;
}
