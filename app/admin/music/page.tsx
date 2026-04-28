import { createServerClient } from "@/lib/supabase-server";
import MusicAdmin from "./MusicAdmin";

export default async function AdminMusicPage() {
  const db = createServerClient();
  const { data: mixes } = await db
    .from("music")
    .select("id, vol, region, curator, bio, mixcloud_url, published")
    .order("sort_order", { ascending: true });

  return <MusicAdmin mixes={mixes ?? []} />;
}
