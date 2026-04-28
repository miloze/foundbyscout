import { createServerClient } from "@/lib/supabase-server";
import CuratedByAdmin from "./CuratedByAdmin";

export default async function AdminCuratedByPage() {
  const db = createServerClient();
  const { data: issues } = await db
    .from("curated_by")
    .select("id, slug, vol, curator, location, bio, published")
    .order("sort_order", { ascending: true });

  return <CuratedByAdmin issues={issues ?? []} />;
}
