import { cn, initials } from "@/lib/utils";

const HUES = [282, 205, 160, 25, 340, 60, 240, 120];

function hueFor(text: string) {
  let hash = 0;
  for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) | 0;
  return HUES[Math.abs(hash) % HUES.length];
}

/** Avatar cuadrado de cliente/empresa con un tono estable según el nombre. */
export function ClientAvatar({
  nombre,
  empresa,
  className,
}: {
  nombre: string;
  empresa?: string | null;
  className?: string;
}) {
  const label = empresa || nombre;
  const hue = hueFor(label);

  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-lg border text-xs font-semibold",
        className,
      )}
      style={{
        backgroundColor: `oklch(0.62 0.13 ${hue} / 0.14)`,
        borderColor: `oklch(0.62 0.13 ${hue} / 0.25)`,
        color: `oklch(0.7 0.14 ${hue})`,
      }}
      aria-hidden
    >
      {initials(label)}
    </span>
  );
}
