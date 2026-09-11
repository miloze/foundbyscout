/**
 * Where a park is, as a label a reader recognises.
 *
 * Both heroes used to answer this with `address[1]` — the second line of the
 * postal address — on the reasonable-sounding assumption that a London address
 * puts the neighbourhood there. It does for five of the eleven published parks
 * (West Norwood, South Bank, Dulwich, Brixton, Mitcham) and it does not for
 * three: Wandle Park's second line is "Cornwall Road", Crystal Palace's is
 * "Ledrington Road", Folkstone Gardens' is "Rolt Street". Those three rendered
 * a street name where the design says neighbourhood.
 *
 * The bug is in the question, not the data. A postal address has no reserved
 * slot for an area, so no index into it is the area — position can only ever
 * approximate the thing. `parks.area` is the field that actually holds it
 * (migration 010), and this reads that field and nothing else.
 *
 * Falls back to `borough`, which is populated for every row. Two reasons it is
 * the right fallback and `address[1]` is not: a borough is genuinely a place
 * the park is in, so it is never wrong, only broader; and it is visibly a
 * borough — "Croydon" rather than "Cornwall Road" — so a row whose area has
 * not been filled in reads as less specific instead of reading as incorrect.
 *
 * Returns undefined when neither is set, so the caller drops the label rather
 * than rendering an empty separator. Nothing here invents a value and nothing
 * here touches `address`, which stays intact for "Getting there".
 */
export function parkAreaLabel(
  area?: string | null,
  borough?: string | null,
): string | undefined {
  return area?.trim() || borough?.trim() || undefined;
}
