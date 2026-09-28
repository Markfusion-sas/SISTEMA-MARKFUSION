"use client";

import { useIsDesktop } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

/**
 * Contenedor de formularios rápidos: modal centrado en escritorio y
 * drawer inferior en el celular.
 */
export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
  size = "md",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const isDesktop = useIsDesktop();
  const sizes = { sm: "sm:max-w-md", md: "sm:max-w-lg", lg: "sm:max-w-2xl", xl: "sm:max-w-4xl" };

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={cn(sizes[size], className)}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description ? (
              <DialogDescription>{description}</DialogDescription>
            ) : (
              <DialogDescription className="sr-only">{title}</DialogDescription>
            )}
          </DialogHeader>
          {children}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className={cn("gap-0", className)}>
        <SheetHeader className="pb-4">
          <SheetTitle>{title}</SheetTitle>
          {description ? (
            <SheetDescription>{description}</SheetDescription>
          ) : (
            <SheetDescription className="sr-only">{title}</SheetDescription>
          )}
        </SheetHeader>
        <div className="overflow-y-auto px-5 pb-5">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
