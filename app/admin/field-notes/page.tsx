import { createServerClient } from "@/lib/supabase-server";
import FieldNotesAdmin from "./FieldNotesAdmin";

export default async function AdminFieldNotesPage() {
  const db = createServerClient();
  const { data: notes } = await db
    .from("field_notes")
    .select("id, slug, title, category, blurb, published")
    .order("sort_order", { ascending: true });

  return <FieldNotesAdmin notes={notes ?? []} />;
}
