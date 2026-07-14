const MONTHS: Record<string, number> = {
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
};

export function parseOpenedForSort(opened: string | null | undefined): number {
  if (!opened) return -Infinity;
  const parts = opened.trim().split(/\s+/);
  if (parts.length === 2) {
    const m = MONTHS[parts[0].toLowerCase()];
    const y = parseInt(parts[1], 10);
    if (m !== undefined && !Number.isNaN(y)) return Date.UTC(y, m, 1);
  }
  if (parts.length === 1 && /^\d{4}$/.test(parts[0])) return Date.UTC(parseInt(parts[0], 10), 0, 1);
  return -Infinity;
}
