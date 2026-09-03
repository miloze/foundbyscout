import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { auditParks, debugAllowed, type ParkImageRow } from "@/lib/parkImages";

// Feeds the Grid's ?debug=1 missing-image indicator, which runs in the browser
// and so cannot stat files itself.
//
// The route refuses outright outside dev and preview. The Grid also gates the
// indicator on the same check before it ever calls this, so the filesystem
// paths in the response are behind two independent locks — a real visitor who
// guesses the URL gets a 404, not a map of the image tree.
export const dynamic = "force-dynamic";

export async function GET() {
  if (!debugAllowed()) {
    return new NextResponse("Not found", { status: 404 });
  }

  const db = createServerClient();
  const { data, error } = await db
    .from("parks")
    .select("slug, name, published, directory_image_url, hero_image, thumbnail")
    .order("sort_order", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const audits = auditParks((data ?? []) as ParkImageRow[]);
  // Keyed by slug — the Grid looks up one tile at a time.
  return NextResponse.json(Object.fromEntries(audits.map(a => [a.slug, a])));
}
