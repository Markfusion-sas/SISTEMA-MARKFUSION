import type { Profile } from "@/types/database";
import { cn, initials, readableTextColor } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type MiniProfile = Pick<Profile, "nombre" | "color" | "avatar_url">;

export function UserAvatar({
  profile,
  className,
  ring = false,
}: {
  profile: MiniProfile | null | undefined;
  className?: string;
  ring?: boolean;
}) {
  const color = profile?.color ?? "#71717a";

  return (
    <Avatar
      className={cn("size-8", ring && "ring-2 ring-background", className)}
      title={profile?.nombre ?? "Sin asignar"}
    >
      {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt={profile.nombre} />}
      <AvatarFallback
        className="text-[11px] font-semibold"
        style={{ backgroundColor: color, color: readableTextColor(color) }}
      >
        {profile ? initials(profile.nombre) : "?"}
      </AvatarFallback>
    </Avatar>
  );
}

/** Chip con el color de la persona (tareas, reuniones, filtros). */
export function UserChip({ profile, className }: { profile: MiniProfile | null | undefined; className?: string }) {
  if (!profile) {
    return (
      <span className={cn("inline-flex items-center gap-1.5 text-xs text-muted-foreground", className)}>
        <span className="size-2 rounded-full border border-dashed border-muted-foreground/60" />
        Sin asignar
      </span>
    );
  }

  return (
    <span
      className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium", className)}
      style={{
        borderColor: `${profile.color}40`,
        backgroundColor: `${profile.color}14`,
        color: profile.color,
      }}
    >
      <span className="size-1.5 rounded-full" style={{ backgroundColor: profile.color }} />
      {profile.nombre.split(" ")[0]}
    </span>
  );
}
