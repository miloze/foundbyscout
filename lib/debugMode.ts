// Client-safe half of the debug gate. Kept apart from lib/parkImages.ts so a
// client component can ask "may I show debug UI?" without pulling `fs` into the
// browser bundle.
//
// Both values are inlined at build time, so this is a compile-time constant in
// client code — the indicator and its file paths are not merely hidden in
// production, they are not in the bundle at all.
export function debugAllowed(): boolean {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.NEXT_PUBLIC_VERCEL_ENV === "preview"
  );
}
