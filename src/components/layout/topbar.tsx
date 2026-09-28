"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Search } from "lucide-react";

import { useMounted } from "@/hooks/use-mounted";
import { LogoMark } from "@/components/brand/logo";
import { findNavItem } from "@/components/layout/nav-config";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import { Button } from "@/components/ui/button";

export function Topbar({ onOpenSearch }: { onOpenSearch: () => void }) {
  const pathname = usePathname();
  const current = findNavItem(pathname);
  const isDetail = current ? pathname !== current.href : false;
  const mounted = useMounted();
  const isMac = mounted && /Mac|iPhone|iPad/.test(navigator.userAgent);

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b bg-background/75 px-4 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 sm:px-6">
      {/* Logo en móvil */}
      <Link href="/dashboard" className="md:hidden" aria-label="Ir al dashboard">
        <LogoMark className="size-7" />
      </Link>

      {/* Migas de pan */}
      <nav aria-label="Ubicación" className="flex min-w-0 items-center gap-1.5 text-sm">
        <span className="hidden text-muted-foreground lg:inline">MarkFusion</span>
        <ChevronRight className="hidden size-3.5 text-muted-foreground/50 lg:inline" />
        {current ? (
          <Link
            href={current.href}
            className={isDetail ? "truncate text-muted-foreground hover:text-foreground" : "truncate font-medium"}
          >
            {current.label}
          </Link>
        ) : (
          <span className="font-medium">Inicio</span>
        )}
        {isDetail && (
          <>
            <ChevronRight className="size-3.5 text-muted-foreground/50" />
            <span className="truncate font-medium">Detalle</span>
          </>
        )}
      </nav>

      <div className="ml-auto flex items-center gap-1.5">
        {/* Buscador (escritorio) */}
        <button
          type="button"
          onClick={onOpenSearch}
          className="hidden h-8 w-64 items-center gap-2 rounded-lg border bg-muted/40 px-2.5 text-[13px] text-muted-foreground outline-none transition-colors hover:border-foreground/15 hover:bg-muted/70 focus-visible:ring-2 focus-visible:ring-ring/40 sm:flex lg:w-72"
        >
          <Search className="size-3.5" />
          <span>Buscar…</span>
          <kbd className="ml-auto flex items-center gap-0.5 rounded border bg-background/60 px-1.5 font-mono text-[10px]">
            {isMac ? "⌘" : "Ctrl"} K
          </kbd>
        </button>
        {/* Buscador (móvil) */}
        <Button variant="ghost" size="icon-sm" className="sm:hidden" onClick={onOpenSearch} aria-label="Buscar">
          <Search />
        </Button>

        <ThemeToggle />
        <div className="md:hidden">
          <UserMenu variant="topbar" />
        </div>
      </div>
    </header>
  );
}
