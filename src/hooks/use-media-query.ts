"use client";

import { useSyncExternalStore } from "react";

/** Devuelve true si la media query coincide. En el servidor devuelve `serverValue`. */
export function useMediaQuery(query: string, serverValue = false) {
  return useSyncExternalStore(
    (callback) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", callback);
      return () => mql.removeEventListener("change", callback);
    },
    () => window.matchMedia(query).matches,
    () => serverValue,
  );
}

export function useIsDesktop() {
  return useMediaQuery("(min-width: 768px)", true);
}
