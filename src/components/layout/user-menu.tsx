"use client";

import { useTransition } from "react";
import Link from "next/link";
import { LogOut, Moon, Settings, Sun, UserRound } from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";

import { signOut } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/components/layout/current-user";
import { UserAvatar } from "@/components/shared/user-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserMenu({ collapsed = false, variant = "topbar" }: { collapsed?: boolean; variant?: "topbar" | "sidebar" }) {
  const { profile, email } = useCurrentUser();
  const { resolvedTheme, setTheme } = useTheme();
  const [pending, startTransition] = useTransition();

  const handleSignOut = () => {
    startTransition(async () => {
      toast.success("Sesión cerrada");
      await signOut();
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex items-center gap-2.5 rounded-lg outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/40",
          variant === "sidebar" && "w-full p-1.5 hover:bg-sidebar-accent",
          variant === "sidebar" && collapsed && "justify-center",
          variant === "topbar" && "rounded-full",
        )}
        aria-label="Menú de usuario"
      >
        <UserAvatar profile={profile} className={variant === "topbar" ? "size-8" : "size-7"} />
        {variant === "sidebar" && !collapsed && (
          <span className="min-w-0 flex-1 text-left">
            <span className="block truncate text-[13px] font-medium text-sidebar-accent-foreground">{profile.nombre}</span>
            <span className="block truncate text-[11px] text-muted-foreground">{email}</span>
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={variant === "sidebar" ? "start" : "end"} side={variant === "sidebar" ? "top" : "bottom"} className="w-60">
        <DropdownMenuLabel className="flex items-center gap-2.5 py-2">
          <UserAvatar profile={profile} className="size-8" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-foreground">{profile.nombre}</span>
            <span className="block truncate text-xs font-normal">{email}</span>
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/ajustes">
            <UserRound />
            Mi perfil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/ajustes">
            <Settings />
            Ajustes
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
          {resolvedTheme === "dark" ? <Sun /> : <Moon />}
          {resolvedTheme === "dark" ? "Modo claro" : "Modo oscuro"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={handleSignOut} disabled={pending}>
          <LogOut />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
