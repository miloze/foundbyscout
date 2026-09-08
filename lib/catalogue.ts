import type { createServerClient } from "./supabase-server";

/**
 * The two catalogue notations, and the line between them.
 *
 * `001/`      — catalogueMark. A park's persistent identity. Same string on
 *               every surface that names a park: cards, the grid, the map, the
 *               homepage strip, both heroes.
 * `(001) /11` — catalogueIndexLabel. A park's *position* in a sequence you can
 *               actually traverse. The "/11" is only true where there is a
 *               prev and a next to count against.
 *
 * They used to be one thing used for both jobs, which is how `(001) /11` ended
 * up on the homepage hero and in the park page's metadata row — neither of
 * which is a sequence. Anything that merely names a park takes the mark.
 *
 * `SCN/` is stripped in both because the column holds either form depending on
 * when the row was written.
 */

/**
 * The catalogue mark — "001/", a park's persistent identity.
 *
 * Identity comes from the row and only from the row: `catalogue_id` first, then
 * `sort_order`, which is the one other column that is stable across every query
 * and every filter. It is deliberately impossible to pass an array index here.
 * The old helper fell back to `idx + 1`, and because every call site passed a
 * *filtered* index, a park with no catalogue_id changed number as you typed in
 * the search field.
 *
 * Returns undefined rather than inventing a number. A park with neither column
 * set has no catalogue identity yet, and the honest rendering of that is no
 * mark at all.
 *
 * The trailing slash is part of the notation, not punctuation a caller adds —
 * that is what stopped three surfaces rendering "001/", "001" and "(001) /11"
 * for the same fact.
 */
export function catalogueMark(
  catalogueId?: string | null,
  sortOrder?: number | null,
): string | undefined {
  const id = catalogueId?.replace(/^SCN\//i, "").trim();
  if (id) return `${id}/`;
  if (sortOrder != null) return `${String(sortOrder).padStart(3, "0")}/`;
  return undefined;
}

/**
 * The catalogue index badge — "(003) /11", indexed-of-total.
 *
 * Position within a traversable sequence, and nothing else. The only caller
 * that qualifies today is the park page's prev/index/next cluster
 * (ParkHeroShell), where the arrows either side are what make the total mean
 * something. The homepage hero and the park page metadata row used to render
 * this as well; they name a park rather than locate it in a walk, so they take
 * catalogueMark now.
 *
 * The parens are load-bearing, not decoration. A bare number sat next to an
 * address reads as a house number: "003 Dulwich, London".
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
 *
 * No callers at present. The homepage used it twice — for the hero badge's
 * "/11" and later for the collection header — and both were deliberately
 * dropped: the homepage does not state how many parks the archive holds. Kept
 * because the `published` predicate should only ever be written in one place,
 * and the next surface that needs a total should come here rather than
 * restate it.
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
