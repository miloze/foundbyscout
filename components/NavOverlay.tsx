"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

/**
 * What kind of surface the nav is currently sitting on.
 *
 * "themed"  the hero's ground is var(--background), so the nav's own theme
 *           colours are correct over it — the park page, whose scan sits on the
 *           page ground.
 * "photo"   a full-bleed photograph runs under the bar and the theme says
 *           nothing about what is there — the homepage hero.
 *
 * The distinction exists because `overlay` alone cannot answer "is the thing
 * behind PARKS light or dark". Scout's hero photography is concrete: pale in
 * both themes, which is what makes a near-white --foreground label vanish on
 * the homepage while being exactly right on the park page. The hero is the only
 * thing that knows which it is, so it says so.
 */
export type OverlayTone = "themed" | "photo";

const NavOverlayContext = createContext<{
  overlay: boolean;
  overlayTone: OverlayTone;
  setOverlay: (v: boolean, tone?: OverlayTone) => void;
}>({
  overlay: false, overlayTone: "themed", setOverlay: () => {},
});

export function useNavOverlay() {
  return useContext(NavOverlayContext);
}

export default function NavOverlayProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ overlay: boolean; overlayTone: OverlayTone }>({
    overlay: false, overlayTone: "themed",
  });

  const setOverlay = useCallback((v: boolean, tone: OverlayTone = "themed") => {
    setState({ overlay: v, overlayTone: tone });
  }, []);

  const value = useMemo(
    () => ({ overlay: state.overlay, overlayTone: state.overlayTone, setOverlay }),
    [state, setOverlay],
  );

  return (
    <NavOverlayContext.Provider value={value}>
      {children}
    </NavOverlayContext.Provider>
  );
}
