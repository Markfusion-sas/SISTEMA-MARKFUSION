"use client";

import { useEffect } from "react";
import { RotateCcw, ServerCrash } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <EmptyState
      icon={ServerCrash}
      title="Algo salió mal"
      description="No pudimos cargar esta sección. Revisa tu conexión e inténtalo de nuevo."
      action={
        <Button onClick={reset}>
          <RotateCcw />
          Reintentar
        </Button>
      }
    />
  );
}
