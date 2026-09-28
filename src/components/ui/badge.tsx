import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-colors [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      tone: {
        neutral: "border-border bg-muted/60 text-muted-foreground",
        brand: "border-brand/25 bg-brand/10 text-brand",
        success: "border-success/25 bg-success/10 text-success",
        warning: "border-warning/30 bg-warning/10 text-warning",
        danger: "border-destructive/25 bg-destructive/10 text-destructive",
        info: "border-info/25 bg-info/10 text-info",
        pink: "border-pink/25 bg-pink/10 text-pink",
        solid: "border-transparent bg-primary text-primary-foreground",
        outline: "border-border text-foreground",
      },
    },
    defaultVariants: {
      tone: "neutral",
    },
  },
);

function Badge({
  className,
  tone,
  dot = false,
  asChild = false,
  children,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants> & { asChild?: boolean; dot?: boolean }) {
  const Comp = asChild ? Slot : "span";

  return (
    <Comp data-slot="badge" className={cn(badgeVariants({ tone }), className)} {...props}>
      {dot && !asChild && <span className="size-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </Comp>
  );
}

export { Badge, badgeVariants };
