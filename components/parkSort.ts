export type SortMode = "az" | "date" | "nearest";

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

export function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

type Sortable = { name: string; opened?: string | null; lat: number | null; lng: number | null };

export function sortParks<T extends Sortable>(
  parks: T[],
  sortMode: SortMode,
  userCoords: { lat: number; lng: number } | null
): T[] {
  const sorted = [...parks];
  if (sortMode === "az") {
    sorted.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sortMode === "date") {
    sorted.sort((a, b) => parseOpenedForSort(b.opened) - parseOpenedForSort(a.opened));
  } else if (sortMode === "nearest" && userCoords) {
    sorted.sort((a, b) => {
      const da = a.lat != null && a.lng != null ? haversine(userCoords.lat, userCoords.lng, a.lat, a.lng) : Infinity;
      const db = b.lat != null && b.lng != null ? haversine(userCoords.lat, userCoords.lng, b.lat, b.lng) : Infinity;
      return da - db;
    });
  }
  return sorted;
}
