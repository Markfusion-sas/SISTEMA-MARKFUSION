"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import type { Profile } from "@/types/database";
import { useCurrentUser } from "@/components/layout/current-user";
import { ColorPicker } from "@/components/shared/color-picker";
import { UserAvatar, UserChip } from "@/components/shared/user-avatar";
import { updateMemberColor } from "./actions";

export function TeamColors() {
  const { team, profile } = useCurrentUser();

  return (
    <div className="divide-y rounded-xl border">
      {team.map((member) => (
        <MemberRow key={member.id} member={member} isMe={member.id === profile.id} />
      ))}
    </div>
  );
}

function MemberRow({ member, isMe }: { member: Profile; isMe: boolean }) {
  const [color, setColor] = useState(member.color);
  const [pending, startTransition] = useTransition();

  const handleChange = (next: string) => {
    const previous = color;
    setColor(next);
    startTransition(async () => {
      const result = await updateMemberColor(member.id, next);
      if (!result.ok) {
        setColor(previous);
        toast.error(result.error);
        return;
      }
      toast.success(`Color de ${member.nombre.split(" ")[0]} actualizado`);
    });
  };

  return (
    <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <UserAvatar profile={{ ...member, color }} className="size-10" />
        <div>
          <div className="flex items-center gap-2 font-medium">
            {member.nombre}
            {isMe && <span className="text-xs font-normal text-muted-foreground">(tú)</span>}
          </div>
          <div className="mt-1">
            <UserChip profile={{ ...member, color }} />
          </div>
        </div>
      </div>
      <ColorPicker value={color} onChange={handleChange} disabled={pending} />
    </div>
  );
}
