import { createClient } from "@supabase/supabase-js";

// Server-only client (service role key — bypasses RLS, never expose to browser).
//
// The throw is the guard. `SUPABASE_SERVICE_ROLE_KEY` has no NEXT_PUBLIC_
// prefix, so in a client bundle Next inlines it as `undefined` rather than
// leaking it — the failure mode is a client that silently authenticates as
// nobody, not a leaked key. That is quiet enough to ship by accident, so
// importing this from a client component now fails loudly instead.
//
// For the same check at build time rather than runtime, `npm i server-only`
// and add `import "server-only"` above.
if (typeof window !== "undefined") {
  throw new Error(
    "lib/supabase-server.ts was imported into a client component. " +
    "Service-role writes belong in a route handler or a server component."
  );
}

export function createServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
