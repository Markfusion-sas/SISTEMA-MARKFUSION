"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import type { MovimientoTipo } from "@/types/database";
import { SERIES_LIGHT } from "@/lib/chart-palette";
import { USER_COLORS } from "@/lib/constants";
import type { CategoryOption } from "@/components/finance/types";
import { ColorPicker } from "@/components/shared/color-picker";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { FormDialog } from "@/components/shared/form-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  createCategoryAction,
  deleteCategoryAction,
  toggleCategoryAction,
  updateCategoryAction,
} from "./actions";

export function CategoriesSettings({ categories }: { categories: CategoryOption[] }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <CategoryColumn tipo="ingreso" title="Ingresos" categories={categories.filter((c) => c.tipo === "ingreso")} />
      <CategoryColumn tipo="gasto" title="Gastos" categories={categories.filter((c) => c.tipo === "gasto")} />
    </div>
  );
}

function CategoryColumn({
  tipo,
  title,
  categories,
}: {
  tipo: MovimientoTipo;
  title: string;
  categories: CategoryOption[];
}) {
  const [nombre, setNombre] = useState("");
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<CategoryOption | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState<CategoryOption | null>(null);

  const sorted = [...categories].sort((a, b) => a.orden - b.orden);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nombre.trim().length < 2) return;
    setAdding(true);
    // Las categorías nuevas toman el siguiente tono de la paleta de gráficas (orden fijo).
    const used = new Set(categories.map((c) => c.color.toLowerCase()));
    const color = SERIES_LIGHT.find((hex) => !used.has(hex)) ?? USER_COLORS[categories.length % USER_COLORS.length];
    const result = await createCategoryAction({ tipo, nombre, color });
    setAdding(false);
    if (!result.ok) return void toast.error(result.error);
    toast.success(`Categoría "${nombre.trim()}" creada`);
    setNombre("");
  };

  const toggle = async (c: CategoryOption, activo: boolean) => {
    setBusy(c.id);
    const result = await toggleCategoryAction(c.id, activo);
    setBusy(null);
    if (!result.ok) return void toast.error(result.error);
    toast.success(activo ? `${c.nombre} activada` : `${c.nombre} desactivada`);
  };

  const handleDelete = async () => {
    if (!deleting) return;
    const result = await deleteCategoryAction(deleting.id);
    if (!result.ok) {
      toast.error(result.error);
      throw new Error(result.error);
    }
    toast.success("Categoría eliminada");
    setDeleting(null);
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="divide-y overflow-hidden rounded-xl border">
        {sorted.map((c) => (
          <div key={c.id} className="flex items-center gap-3 px-3 py-2.5">
            <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
            <div className="min-w-0 flex-1">
              <div className={`truncate text-sm font-medium ${c.activo ? "" : "text-muted-foreground line-through"}`}>
                {c.nombre}
              </div>
              <div className="truncate font-mono text-[11px] text-muted-foreground">{c.slug}</div>
            </div>
            <Switch
              checked={c.activo}
              onCheckedChange={(v) => toggle(c, v)}
              disabled={busy === c.id}
              aria-label={c.activo ? `Desactivar ${c.nombre}` : `Activar ${c.nombre}`}
            />
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => {
                setEditing(c);
                setEditOpen(true);
              }}
              aria-label={`Editar ${c.nombre}`}
            >
              <Pencil />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="hover:text-destructive"
              onClick={() => setDeleting(c)}
              aria-label={`Eliminar ${c.nombre}`}
            >
              <Trash2 />
            </Button>
          </div>
        ))}
        <form onSubmit={add} className="flex items-center gap-2 bg-muted/20 px-3 py-2">
          <Plus className="size-4 shrink-0 text-muted-foreground" />
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder={`Nueva categoría de ${title.toLowerCase()}…`}
            className="h-8 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
            maxLength={60}
            disabled={adding}
          />
          <Button type="submit" size="sm" variant="outline" loading={adding} disabled={nombre.trim().length < 2}>
            Agregar
          </Button>
        </form>
      </div>

      <EditCategoryDialog open={editOpen} onOpenChange={setEditOpen} category={editing} />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(v) => !v && setDeleting(null)}
        title={`¿Eliminar "${deleting?.nombre}"?`}
        description="Solo se puede eliminar si ningún movimiento la usa. Si ya tiene historial, desactívala."
        onConfirm={handleDelete}
      />
    </div>
  );
}

function EditCategoryDialog({
  open,
  onOpenChange,
  category,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: CategoryOption | null;
}) {
  const [nombre, setNombre] = useState("");
  const [color, setColor] = useState("#7c6cf0");
  const [saving, setSaving] = useState(false);
  const [lastId, setLastId] = useState<string | null>(null);

  // Carga los valores de la categoría cada vez que se abre con otra distinta.
  if (open && category && category.id !== lastId) {
    setLastId(category.id);
    setNombre(category.nombre);
    setColor(category.color);
  }
  if (!open && lastId !== null) setLastId(null);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category) return;
    setSaving(true);
    const result = await updateCategoryAction(category.id, { tipo: category.tipo, nombre, color });
    setSaving(false);
    if (!result.ok) return void toast.error(result.error);
    toast.success("Categoría actualizada");
    onOpenChange(false);
  };

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title="Editar categoría" size="sm">
      <form onSubmit={save} className="space-y-5">
        <div className="grid gap-2">
          <Label htmlFor="cat-nombre">Nombre</Label>
          <Input id="cat-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={60} />
          <p className="text-xs text-muted-foreground">
            El identificador interno ({category?.slug}) no cambia, así los movimientos existentes se conservan.
          </p>
        </div>
        <div className="grid gap-2">
          <Label>Color</Label>
          <ColorPicker value={color} onChange={setColor} />
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving} disabled={nombre.trim().length < 2}>
            Guardar
          </Button>
        </div>
      </form>
    </FormDialog>
  );
}
