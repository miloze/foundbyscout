"use client";

import { createContext, useContext, useState } from "react";

const NavOverlayContext = createContext<{ overlay: boolean; setOverlay: (v: boolean) => void }>({
  overlay: false, setOverlay: () => {},
});

export function useNavOverlay() {
  return useContext(NavOverlayContext);
}

export default function NavOverlayProvider({ children }: { children: React.ReactNode }) {
  const [overlay, setOverlay] = useState(false);

  return (
    <NavOverlayContext.Provider value={{ overlay, setOverlay }}>
      {children}
    </NavOverlayContext.Provider>
  );
}
