import { useId } from "react";

import { cn } from "@/lib/utils";

/** Isotipo de MarkFusion: dos trazos que se fusionan en una "M". */
export function LogoMark({ className }: { className?: string }) {
  const id = useId();
  const gradientId = `mf-gradient-${id}`;
  const shineId = `mf-shine-${id}`;

  return (
    <svg viewBox="0 0 32 32" fill="none" className={cn("size-8", className)} aria-hidden>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--brand)" />
          <stop offset="1" stopColor="var(--brand-2)" />
        </linearGradient>
        <linearGradient id={shineId} x1="16" y1="0" x2="16" y2="18" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="white" stopOpacity="0.28" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#${gradientId})`} />
      <rect width="32" height="32" rx="9" fill={`url(#${shineId})`} />
      <path
        d="M8.5 22.5V10.2c0-.6.7-.9 1.1-.5l5.7 6.1c.4.4 1 .4 1.4 0l5.7-6.1c.4-.4 1.1-.1 1.1.5v12.3"
        stroke="white"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="22.4" r="1.7" fill="white" />
    </svg>
  );
}

export function Logo({
  className,
  markClassName,
  showOS = true,
}: {
  className?: string;
  markClassName?: string;
  showOS?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className={markClassName} />
      <span className="flex items-center gap-1.5 text-[15px] font-semibold tracking-tight">
        MarkFusion
        {showOS && (
          <span className="rounded-md border border-brand/30 bg-brand/10 px-1.5 py-px text-[10px] font-semibold tracking-wider text-brand">
            OS
          </span>
        )}
      </span>
    </span>
  );
}
