"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";
import { CircleCheck, CircleX, Info, Loader2, TriangleAlert } from "lucide-react";

function Toaster(props: ToasterProps) {
  const { resolvedTheme } = useTheme();

  return (
    <Sonner
      theme={(resolvedTheme as ToasterProps["theme"]) ?? "dark"}
      className="toaster group"
      position="bottom-right"
      gap={8}
      offset={{ bottom: 24, right: 96 }}
      mobileOffset={{ bottom: 152 }}
      icons={{
        success: <CircleCheck className="size-4 text-success" />,
        error: <CircleX className="size-4 text-destructive" />,
        warning: <TriangleAlert className="size-4 text-warning" />,
        info: <Info className="size-4 text-info" />,
        loading: <Loader2 className="size-4 animate-spin text-muted-foreground" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            "!rounded-xl !border !border-border !bg-popover !text-popover-foreground !shadow-float !gap-2.5 !px-4 !py-3 !text-[13px] !font-sans",
          title: "!font-medium",
          description: "!text-muted-foreground",
          actionButton: "!bg-primary !text-primary-foreground !rounded-md",
          cancelButton: "!bg-muted !text-muted-foreground !rounded-md",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
