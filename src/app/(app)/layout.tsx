import { cookies } from "next/headers";

import { getSession } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";
import { SIDEBAR_COOKIE } from "@/components/layout/nav-config";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [{ user, profile, team }, cookieStore] = await Promise.all([getSession(), cookies()]);
  const defaultCollapsed = cookieStore.get(SIDEBAR_COOKIE)?.value === "1";

  return (
    <AppShell profile={profile} email={user.email ?? ""} team={team} defaultCollapsed={defaultCollapsed}>
      {children}
    </AppShell>
  );
}
