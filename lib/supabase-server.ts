import { createClient } from "@supabase/supabase-js";

// Server-only client (service role key — bypasses RLS, never expose to browser)
export function createServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
