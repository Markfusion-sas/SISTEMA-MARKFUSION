"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { LayoutGrid } from "lucide-react";

import { cn } from "@/lib/utils";
import { ALL_NAV_ITEMS, MOBILE_PRIMARY, isActivePath } from "@/components/layout/nav-config";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const PRIMARY = MOBILE_PRIMARY.map((href) => ALL_NAV_ITEMS.find((i) => i.href === href)!);
const SECONDARY = ALL_NAV_ITEMS.filter((i) => !MOBILE_PRIMARY.includes(i.href));

/** Menú inferior para el celular: 4 accesos fijos + "Más". */
export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const moreActive = SECONDARY.some((i) => isActivePath(pathname, i.href));

  return (
    <>
      <nav
        aria-label="Navegación principal"
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/85 pb-safe backdrop-blur-xl md:hidden"
      >
        <div className="mx-auto grid h-16 max-w-md grid-cols-5">
          {PRIMARY.map((item) => {
            const active = isActivePath(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className="relative flex flex-col items-center justify-center gap-1 text-[10.5px] font-medium"
              >
                {active && (
                  <motion.span
                    layoutId="mobile-active"
                    className="absolute top-0 h-0.5 w-8 rounded-b-full bg-brand"
                    transition={{ type: "spring", stiffness: 500, damping: 38 }}
                  />
                )}
                <Icon className={cn("size-5", active ? "text-brand" : "text-muted-foreground")} strokeWidth={active ? 2.2 : 1.9} />
                <span className={active ? "text-foreground" : "text-muted-foreground"}>{item.label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="relative flex flex-col items-center justify-center gap-1 text-[10.5px] font-medium"
          >
            {moreActive && <span className="absolute top-0 h-0.5 w-8 rounded-b-full bg-brand" />}
            <LayoutGrid className={cn("size-5", moreActive ? "text-brand" : "text-muted-foreground")} />
            <span className={moreActive ? "text-foreground" : "text-muted-foreground"}>Más</span>
          </button>
        </div>
      </nav>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" showCloseButton={false}>
          <SheetHeader className="pt-2">
            <SheetTitle>Más módulos</SheetTitle>
            <SheetDescription className="sr-only">Accesos al resto de módulos</SheetDescription>
          </SheetHeader>
          <div className="grid grid-cols-3 gap-2 px-5 pb-6">
            {SECONDARY.map((item) => {
              const active = isActivePath(pathname, item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-xl border px-2 py-4 text-xs font-medium transition-colors",
                    active ? "border-brand/40 bg-brand/10 text-foreground" : "bg-muted/30 text-muted-foreground",
                  )}
                >
                  <Icon className={cn("size-5", active && "text-brand")} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
