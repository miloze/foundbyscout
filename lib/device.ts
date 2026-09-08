/**
 * SSR-safe viewport width check. Returns false on the server.
 */
export const isMobileViewport = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768;
};

/**
 * Returns true for phones (iPhone, Android phones).
 * iPads and Android tablets return false — treated like desktop (assumed wifi).
 */
export function isPhone(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  // iPadOS 13+ reports as "Macintosh" but has touch support
  const isIPad = /iPad/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (isIPad) return false;
  const isIPhone = /iPhone|iPod/.test(ua);
  // Android tablets omit "Mobile" from the UA; phones include it
  const isAndroidPhone = /Android/.test(ua) && /Mobile/.test(ua);
  return isIPhone || isAndroidPhone;
}

// getModelTierOverride() lived here — a ?model=low / ?model=high switch for
// testing the two tiers on desktop. Both the tiers and the switch are gone;
// there is one production model per park now. See lib/assets.ts.
