"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { useMounted } from "@/hooks/use-mounted";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();
  const isDark = !mounted || resolvedTheme === "dark";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setTheme(isDark ? "light" : "dark")}
          aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
        >
          {isDark ? <Sun /> : <Moon />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{isDark ? "Modo claro" : "Modo oscuro"}</TooltipContent>
    </Tooltip>
  );
}
