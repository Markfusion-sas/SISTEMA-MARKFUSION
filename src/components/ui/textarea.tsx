import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-20 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow,border-color] outline-none dark:bg-input/20",
        "placeholder:text-muted-foreground/70",
        "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
