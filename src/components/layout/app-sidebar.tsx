"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { cn } from "@/lib/utils";
import { Logo, LogoMark } from "@/components/brand/logo";
import { NAV_GROUPS, SETTINGS_ITEM, isActivePath, type NavItem } from "@/components/layout/nav-config";
import { UserMenu } from "@/components/layout/user-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export const SIDEBAR_WIDTH = 248;
export const SIDEBAR_WIDTH_COLLAPSED = 68;

export function AppSidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const pathname = usePathname();

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className="sticky top-0 z-30 hidden h-dvh shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex"
    >
      {/* Marca */}
      <div className={cn("flex h-14 items-center px-4", collapsed && "justify-center px-0")}>
        <Link href="/dashboard" className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring/40">
          {collapsed ? <LogoMark className="size-7" /> : <Logo markClassName="size-7" />}
        </Link>
      </div>

      {/* Navegación */}
      <nav className="flex-1 space-y-5 overflow-x-hidden overflow-y-auto px-3 py-3">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="space-y-0.5">
            <div
              className={cn(
                "h-6 px-2.5 text-[11px] font-medium tracking-wide text-muted-foreground/70 uppercase transition-opacity",
                collapsed && "opacity-0",
              )}
            >
              {!collapsed && group.label}
            </div>
            {group.items.map((item) => (
              <SidebarLink key={item.href} item={item} active={isActivePath(pathname, item.href)} collapsed={collapsed} />
            ))}
          </div>
        ))}
      </nav>

      {/* Pie */}
      <div className="space-y-1 border-t border-sidebar-border p-3">
        <SidebarLink item={SETTINGS_ITEM} active={isActivePath(pathname, SETTINGS_ITEM.href)} collapsed={collapsed} />
        <SidebarButton
          label={collapsed ? "Expandir menú" : "Contraer menú"}
          shortcut="Ctrl B"
          collapsed={collapsed}
          onClick={onToggle}
          icon={collapsed ? PanelLeftOpen : PanelLeftClose}
        />
        <div className="pt-1">
          <UserMenu variant="sidebar" collapsed={collapsed} />
        </div>
      </div>
    </motion.aside>
  );
}

function SidebarLink({ item, active, collapsed }: { item: NavItem; active: boolean; collapsed: boolean }) {
  const Icon = item.icon;

  const link = (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex h-9 items-center gap-3 rounded-lg px-2.5 text-[13.5px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/40",
        active
          ? "text-sidebar-accent-foreground"
          : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
        collapsed && "justify-center px-0",
      )}
    >
      {active && (
        <motion.span
          layoutId="sidebar-active"
          className="absolute inset-0 rounded-lg border border-foreground/[0.06] bg-sidebar-accent"
          transition={{ type: "spring", stiffness: 500, damping: 38 }}
        />
      )}
      {active && (
        <motion.span
          layoutId="sidebar-active-bar"
          className="absolute top-2 bottom-2 -left-3 w-[3px] rounded-r-full bg-brand"
          transition={{ type: "spring", stiffness: 500, damping: 38 }}
        />
      )}
      <Icon
        className={cn(
          "relative size-[18px] shrink-0 transition-colors",
          active ? "text-brand" : "text-muted-foreground group-hover:text-foreground",
        )}
        strokeWidth={active ? 2.2 : 1.9}
      />
      {!collapsed && <span className="relative truncate">{item.label}</span>}
    </Link>
  );

  if (!collapsed) return link;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}

function SidebarButton({
  label,
  shortcut,
  collapsed,
  onClick,
  icon: Icon,
}: {
  label: string;
  shortcut?: string;
  collapsed: boolean;
  onClick: () => void;
  icon: NavItem["icon"];
}) {
  const button = (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-9 w-full items-center gap-3 rounded-lg px-2.5 text-[13.5px] font-medium text-sidebar-foreground outline-none transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-ring/40",
        collapsed && "justify-center px-0",
      )}
      aria-label={label}
    >
      <Icon className="size-[18px] shrink-0 text-muted-foreground" strokeWidth={1.9} />
      {!collapsed && (
        <>
          <span className="truncate">{label}</span>
          {shortcut && (
            <kbd className="ml-auto rounded border bg-background/50 px-1.5 font-mono text-[10px] text-muted-foreground">
              {shortcut}
            </kbd>
          )}
        </>
      )}
    </button>
  );

  if (!collapsed) return button;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}
