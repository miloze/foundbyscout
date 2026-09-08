/**
 * The one place a stored date becomes something a page may print.
 *
 * `opened` and `scanned` are free-text columns, so they hold whatever was typed
 * into the admin. Across the published parks that is four different shapes —
 * "1978", "March 2018", the literal "NA", and empty — and the formatter this
 * replaces ended in `return val`, so anything it could not parse went to the
 * page unchanged. Crystal Palace's profile therefore told a visitor it was
 * "Scanned: NA".
 *
 * That is the same failure as the hardcoded SE24 in the found-object config: a
 * value that looks like field notation and is not one. The fix is the same
 * shape too — one function, and it answers null rather than guessing.
 *
 * Null is the important part. A caller cannot print a non-date by accident,
 * because there is nothing to print: the chip, the meta line and the facts row
 * each drop out entirely rather than rendering a label with junk beside it. An
 * absent scan date is a fact about the archive and reads correctly as absence.
 * "NA" is someone answering a text box.
 */

const MONTH_NUMBER: Record<string, string> = {
  january:"01",february:"02",march:"03",april:"04",may:"05",june:"06",
  july:"07",august:"08",september:"09",october:"10",november:"11",december:"12",
};

const MONTH_NAME = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

/** Year always; month only where the source actually established one. */
type FieldDate = { year: string; month?: string };

/**
 * Parse, without deciding how it looks.
 *
 * Both the legacy prose form ("March 2018") and the partial-ISO form the
 * migration writes ("2018-03") are accepted, because the column holds the first
 * until that migration runs and the second afterwards. Reading both means the
 * page is correct on either side of it, so the app never had to be deployed in
 * lockstep with the database.
 *
 * Precision is preserved rather than filled in. Stockwell opened in 1978 and
 * nobody recorded the month; this returns a year with no month rather than
 * inventing a January, which is the same fabrication the SE24 string was.
 *
 * Day precision parses and is then discarded — nothing on the site shows a day,
 * and carrying one through to a display that has no caller would be designing
 * ahead of a need.
 */
function parseFieldDate(val?: string | null): FieldDate | null {
  if (!val) return null;
  const s = val.trim();
  if (!s) return null;

  // Partial ISO: 1978 | 2018-03 | 2026-05-14
  const iso = s.match(/^(\d{4})(?:-(\d{2}))?(?:-\d{2})?$/);
  if (iso) {
    const [, year, month] = iso;
    if (!month) return { year };
    return isMonth(month) ? { year, month } : null;
  }

  // Prose: "March 2018"
  const parts = s.split(/\s+/);
  if (parts.length === 2) {
    const month = MONTH_NUMBER[parts[0].toLowerCase()];
    if (month && /^\d{4}$/.test(parts[1])) return { year: parts[1], month };
  }

  return null;
}

/** Two digits, 01-12. Rejects "2018-13" as firmly as it rejects "NA". */
function isMonth(m: string): boolean {
  const n = Number(m);
  return Number.isInteger(n) && n >= 1 && n <= 12;
}

/**
 * Field notation: `03/2018`, or `1978` where only the year is known.
 *
 * For the hero chip and the condensed meta line, where the surrounding text is
 * already set in mono and uppercased and a spelled-out month would be the only
 * prose in the row.
 */
export function formatFieldDate(val?: string | null): string | null {
  const d = parseFieldDate(val);
  if (!d) return null;
  return d.month ? `${d.month}/${d.year}` : d.year;
}

/**
 * Prose: `March 2018`, or `1978` where only the year is known.
 *
 * For the park page's facts column, which is a read rather than a readout — its
 * rows are labelled "Opening times" and "Built by" and sit in sentences, so
 * `03/2018` would be the one piece of instrument notation in a block that has
 * none.
 */
export function formatFieldDateLong(val?: string | null): string | null {
  const d = parseFieldDate(val);
  if (!d) return null;
  return d.month ? `${MONTH_NAME[Number(d.month) - 1]} ${d.year}` : d.year;
}
