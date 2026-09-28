"use client";

import { useEffect, useState } from "react";
import { ClipboardList, Gavel, NotebookPen, Save } from "lucide-react";
import { toast } from "sonner";

import { saveMeetingNotesAction } from "@/app/(app)/reuniones/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Notes = { agenda: string; notas: string; decisiones: string };

const SECTIONS: { key: keyof Notes; label: string; icon: typeof NotebookPen; placeholder: string; rows: number }[] = [
  { key: "agenda", label: "Agenda", icon: ClipboardList, placeholder: "1. Tema\n2. Tema\n3. Próximos pasos", rows: 4 },
  { key: "notas", label: "Notas", icon: NotebookPen, placeholder: "Lo que se habló, dudas del cliente, contexto…", rows: 7 },
  { key: "decisiones", label: "Decisiones", icon: Gavel, placeholder: "- Acuerdo 1\n- Acuerdo 2", rows: 4 },
];

/** Agenda, notas y decisiones con guardado manual (botón o Ctrl/⌘ + S). */
export function MeetingNotes({ meetingId, initial }: { meetingId: string; initial: Notes }) {
  const [values, setValues] = useState<Notes>(initial);
  const [saved, setSaved] = useState<Notes>(initial);
  const [saving, setSaving] = useState(false);

  const dirty = values.agenda !== saved.agenda || values.notas !== saved.notas || values.decisiones !== saved.decisiones;

  const save = async () => {
    if (!dirty || saving) return;
    setSaving(true);
    const result = await saveMeetingNotesAction(meetingId, values);
    setSaving(false);
    if (!result.ok) return void toast.error(result.error);
    setSaved(values);
    toast.success("Notas guardadas");
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void save();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  // Aviso si se intenta salir con cambios sin guardar.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  return (
    <div className="space-y-5">
      {SECTIONS.map(({ key, label, icon: Icon, placeholder, rows }) => (
        <section key={key} className="space-y-2">
          <label htmlFor={`meeting-${key}`} className="flex items-center gap-2 text-sm font-medium">
            <Icon className="size-4 text-muted-foreground" />
            {label}
          </label>
          <Textarea
            id={`meeting-${key}`}
            value={values[key]}
            onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
            placeholder={placeholder}
            rows={rows}
            className="min-h-0 bg-card leading-relaxed"
          />
        </section>
      ))}

      <div className="sticky bottom-20 z-10 flex items-center justify-end gap-3 pr-18 md:bottom-4 md:pr-20">
        <span className="text-xs text-muted-foreground">
          {dirty ? "Cambios sin guardar · Ctrl + S" : "Todo guardado"}
        </span>
        <Button onClick={save} loading={saving} disabled={!dirty} className="shadow-float">
          {!saving && <Save />}
          Guardar notas
        </Button>
      </div>
    </div>
  );
}
