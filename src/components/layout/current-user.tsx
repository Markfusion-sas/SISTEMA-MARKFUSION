"use client";

import { createContext, useContext } from "react";

import type { Profile } from "@/types/database";

interface CurrentUser {
  profile: Profile;
  email: string;
  team: Profile[];
}

const CurrentUserContext = createContext<CurrentUser | null>(null);

export function CurrentUserProvider({ value, children }: { value: CurrentUser; children: React.ReactNode }) {
  return <CurrentUserContext.Provider value={value}>{children}</CurrentUserContext.Provider>;
}

/** Perfil del socio que tiene la sesión abierta y el equipo completo. */
export function useCurrentUser() {
  const ctx = useContext(CurrentUserContext);
  if (!ctx) throw new Error("useCurrentUser debe usarse dentro de <CurrentUserProvider>");
  return ctx;
}
