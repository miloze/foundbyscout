"use client";

import { useEffect, useState } from "react";

// ── Read-only parks index ────────────────────────────────────────────────
// Added for the Grid view, which needed a parks list without touching the two
// that already exist. Note for whoever unifies this later: there is no shared
// parks hook on this page. ParksDirectoryAccordion and ParksMap each open their
// own Supabase client and run their own near-identical query, and the Grid
// handover's "reuse the same hook" step assumed one already existed. Rather
// than refactor both (the Grid build is deliberately non-destructive), this
// module is the third reader — but it is written to be the one they all move
// to, so the query and the search predicate live in one place from the start.

export type ParkIndexRow = {
  id: string;
  slug: string;
  name: string;
  postcode: string | null;
  address: string[] | null;
  location: string | null;
  catalogue_id: string | null;
  sort_order: number | null;
  type: string | null;
  is_free: boolean | null;
  is_covered: boolean | null;
  directory_image_url: string | null;
  hero_image: string | null;
  thumbnail: string | null;
  gallery_images: string[] | null;
};

export function useParksIndex() {
  const [parks, setParks] = useState<ParkIndexRow[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    import("@supabase/supabase-js").then(({ createClient }) => {
      const db = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      db.from("parks")
        // Inline literal, not a joined const: supabase-js infers the row type from
        // the select string, and only a literal gives it something to infer from.
        .select("id, slug, name, postcode, address, location, catalogue_id, sort_order, type, is_free, is_covered, directory_image_url, hero_image, thumbnail, gallery_images")
        .eq("published", true)
        .order("sort_order", { ascending: true })
        .then(({ data, error }) => {
          if (cancelled) return;
          if (error || !data) { setStatus("error"); return; }
          setParks(data as ParkIndexRow[]);
          setStatus("ready");
        });
    }).catch(() => { if (!cancelled) setStatus("error"); });
    return () => { cancelled = true; };
  }, []);

  return { parks, status };
}

// Same predicate the accordion filters its list with — name, location, postcode
// and any address line. Kept identical so Grid and List can never disagree
// about what a given search term matches.
export function filterParks<T extends Pick<ParkIndexRow, "name" | "location" | "postcode" | "address">>(
  parks: T[],
  search: string,
): T[] {
  const q = search.trim().toLowerCase();
  if (!q) return parks;
  return parks.filter(p =>
    p.name.toLowerCase().includes(q) ||
    (p.location ?? "").toLowerCase().includes(q) ||
    (p.postcode ?? "").toLowerCase().includes(q) ||
    (p.address ?? []).some(a => a.toLowerCase().includes(q))
  );
}

// Ordered image candidates for a park, best editorial crop first.
//
// Grid is photograph-first, so a single source is not enough: as of this
// writing `directory_image_url` is set on every published park but the file
// only exists for one of them (swanley), and two parks — southbank and
// folkstone-gardens — have no working image at any of these keys. Tiles walk
// this list on load error and fall back to a catalogue plate if it runs out.
export function getParkImageCandidates(park: ParkIndexRow): string[] {
  return [
    park.directory_image_url,
    park.hero_image,
    park.gallery_images?.[0],
    park.thumbnail,
  ].filter((u): u is string => typeof u === "string" && u.trim().length > 0);
}
