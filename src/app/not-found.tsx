import Link from "next/link";
import { Compass } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <EmptyState
        icon={Compass}
        title="Esta página no existe"
        description="Puede que el registro se haya eliminado o que el enlace esté mal escrito."
        action={
          <Button asChild>
            <Link href="/dashboard">Volver al dashboard</Link>
          </Button>
        }
        className="w-full max-w-lg"
      />
    </div>
  );
}
