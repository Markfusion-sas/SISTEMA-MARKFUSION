import type { Metadata } from "next";

import { getMeetingOptions } from "@/lib/meeting-options";
import { createClient } from "@/lib/supabase/server";
import { MeetingsView, type MeetingRow } from "@/components/meetings/meetings-view";

export const metadata: Metadata = { title: "Reuniones" };

export default async function ReunionesPage() {
  const supabase = await createClient();

  const [meetingsRes, options] = await Promise.all([
    supabase
      .from("meetings")
      .select("*, client:clients(id, nombre, empresa), project:projects(id, nombre), tasks(estado)")
      .order("fecha_inicio", { ascending: true }),
    getMeetingOptions(supabase),
  ]);

  if (meetingsRes.error) throw new Error(meetingsRes.error.message);

  return (
    <MeetingsView
      meetings={(meetingsRes.data ?? []) as unknown as MeetingRow[]}
      clients={options.clients}
      projects={options.projects}
    />
  );
}
