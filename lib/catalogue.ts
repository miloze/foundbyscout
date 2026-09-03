import type { createServerClient } from "./supabase-server";

/**
 * The catalogue index badge — "(003) /11", indexed-of-total.
 *
 * Both heroes render it: the park page's metadata block and the homepage's
 * random-park hero. The formatting lived inline in ParkHeroDetails first, and
 * the homepage was left showing a bare "003" — the two drifting apart is
 * exactly what this module exists to stop, so neither component should build
 * the string itself again.
 *
 * The parens and the total are load-bearing, not decoration. A bare number sat
 * next to an address reads as a house number: "003 Dulwich, London".
 *
 * `SCN/` is stripped because the column holds either form depending on when
 * the row was written.
 */
export function catalogueIndexLabel(
  catalogueId?: string | null,
  total?: number | null,
): string | undefined {
  const idNumber = catalogueId?.replace(/^SCN\//i, "").trim();
  if (!idNumber) return undefined;
  // Falls back to a bare "(003)" rather than "(003) /0" when the count is
  // missing or still zero — a total of nothing is never true and would only
  // ever be a failed query.
  return total ? `(${idNumber}) /${total}` : `(${idNumber})`;
}

/**
 * How many parks the catalogue publishes — the "/11" half of the badge.
 *
 * Head-only: the caller wants the size of the set, never its rows. The park
 * page does not use this because it already reads the whole published
 * catalogue in index order to find a park's neighbours, and counting that
 * list is free; anywhere that needs only the total should come here rather
 * than restate the `published` predicate.
 */
export async function fetchCatalogueTotal(
  db: ReturnType<typeof createServerClient>,
): Promise<number> {
  const { count } = await db
    .from("parks")
    .select("id", { count: "exact", head: true })
    .eq("published", true);
  return count ?? 0;
}
