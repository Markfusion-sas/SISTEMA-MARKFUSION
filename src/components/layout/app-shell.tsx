"use client";

import { useCallback, useEffect, useState } from "react";

import type { Profile } from "@/types/database";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { CommandMenu } from "@/components/layout/command-menu";
import { CurrentUserProvider } from "@/components/layout/current-user";
import { MobileNav } from "@/components/layout/mobile-nav";
import { SIDEBAR_COOKIE } from "@/components/layout/nav-config";
import { QuickCreateProvider } from "@/components/layout/quick-create";
import { QuickCreateFab } from "@/components/layout/quick-create-fab";
import { Topbar } from "@/components/layout/topbar";

export function AppShell({
  profile,
  email,
  team,
  defaultCollapsed,
  children,
}: {
  profile: Profile;
  email: string;
  team: Profile[];
  defaultCollapsed: boolean;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [searchOpen, setSearchOpen] = useState(false);

  const toggleSidebar = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      document.cookie = `${SIDEBAR_COOKIE}=${next ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`;
      return next;
    });
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey;
      if (mod && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen((open) => !open);
      }
      const target = event.target as HTMLElement | null;
      const typing = target?.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName ?? "");
      if (mod && event.key.toLowerCase() === "b" && !typing) {
        event.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggleSidebar]);

  return (
    <CurrentUserProvider value={{ profile, email, team }}>
      <QuickCreateProvider>
        <div className="flex min-h-dvh">
          <AppSidebar collapsed={collapsed} onToggle={toggleSidebar} />
          <div className="flex min-w-0 flex-1 flex-col">
            <Topbar onOpenSearch={() => setSearchOpen(true)} />
            {/* El padding inferior deja espacio al menú móvil y al botón "+" */}
            <main className="flex-1 px-4 pt-6 pb-40 sm:px-6 md:pb-24 lg:px-8 lg:pt-8">
              <div className="mx-auto w-full max-w-[1400px]">{children}</div>
            </main>
          </div>
        </div>
        <MobileNav />
        <QuickCreateFab />
        <CommandMenu open={searchOpen} onOpenChange={setSearchOpen} />
      </QuickCreateProvider>
    </CurrentUserProvider>
  );
}
