import { cache } from "react";
import { redirect } from "next/navigation";

import type { Profile } from "@/types/database";
import { createClient } from "@/lib/supabase/server";

/**
 * Usuario autenticado + su perfil + el equipo (los 2 socios).
 * Se memoriza por request con `cache`, así layout y páginas comparten la consulta.
 */
export const getSession = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: team } = await supabase.from("profiles").select("*").order("created_at", { ascending: true });
  const members = (team ?? []) as Profile[];

  const profile: Profile = members.find((p) => p.id === user.id) ?? {
    id: user.id,
    nombre: (user.user_metadata?.nombre as string | undefined) ?? user.email?.split("@")[0] ?? "Usuario",
    avatar_url: null,
    color: "#7c6cf0",
    created_at: user.created_at,
    updated_at: user.created_at,
  };

  return { user, profile, team: members.length ? members : [profile], supabase };
});
