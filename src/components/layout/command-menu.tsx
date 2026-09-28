"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, CheckSquare, Loader2, LogOut, Moon, Sun, Users, Video } from "lucide-react";
import { useTheme } from "next-themes";

import { signOut } from "@/lib/actions/auth";
import { getSearchIndexAction, type SearchIndex } from "@/lib/actions/global";
import { CLIENTE_ESTADOS, PROYECTO_ESTADOS, TAREA_ESTADOS } from "@/lib/constants";
import { formatDate, formatRelativeDay } from "@/lib/format";
import { ALL_NAV_ITEMS } from "@/components/layout/nav-config";
import { useQuickCreate } from "@/components/layout/quick-create";
import { QUICK_ACTIONS } from "@/components/layout/quick-create-fab";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";

const MIN_QUERY = 2;
const CACHE_MS = 60_000;

/** Buscador global (Ctrl/⌘ + K): páginas, acciones y datos de clientes, proyectos, tareas y reuniones. */
export function CommandMenu({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const quickCreate = useQuickCreate();
  const [, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState<SearchIndex | null>(null);
  const [loading, setLoading] = useState(false);
  const fetchedAt = useRef(0);

  // Carga el índice al abrir (se reutiliza durante un minuto).
  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    if (index && Date.now() - fetchedAt.current < CACHE_MS) return;
    let cancelled = false;
    setLoading(true);
    getSearchIndexAction()
      .then((data) => {
        if (cancelled) return;
        fetchedAt.current = Date.now();
        setIndex(data);
      })
      .catch(() => undefined)
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [open, index]);

  const run = (fn: () => void) => {
    onOpenChange(false);
    fn();
  };

  const searching = query.trim().length >= MIN_QUERY;

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Busca clientes, proyectos, tareas, reuniones o páginas…" value={query} onValueChange={setQuery} />
      <CommandList>
        <CommandEmpty>
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" />
              Buscando…
            </span>
          ) : (
            "Sin resultados."
          )}
        </CommandEmpty>

        {searching && index && (
          <>
            {index.clients.length > 0 && (
              <CommandGroup heading="Clientes">
                {index.clients.map((c) => (
                  <CommandItem
                    key={c.id}
                    value={`cliente ${c.empresa ?? ""} ${c.nombre} ${c.ciudad ?? ""} ${c.id}`}
                    onSelect={() => run(() => router.push(`/clientes/${c.id}`))}
                  >
                    <Users />
                    <span className="truncate">{c.empresa || c.nombre}</span>
                    {c.empresa && <span className="truncate text-xs text-muted-foreground">{c.nombre}</span>}
                    <CommandShortcut className="tracking-normal">
                      {CLIENTE_ESTADOS[c.estado as keyof typeof CLIENTE_ESTADOS]?.label}
                    </CommandShortcut>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {index.projects.length > 0 && (
              <CommandGroup heading="Proyectos">
                {index.projects.map((p) => (
                  <CommandItem
                    key={p.id}
                    value={`proyecto ${p.nombre} ${p.cliente ?? ""} ${p.id}`}
                    onSelect={() => run(() => router.push(`/proyectos/${p.id}`))}
                  >
                    <Briefcase />
                    <span className="truncate">{p.nombre}</span>
                    {p.cliente && <span className="truncate text-xs text-muted-foreground">{p.cliente}</span>}
                    <CommandShortcut className="tracking-normal">
                      {PROYECTO_ESTADOS[p.estado as keyof typeof PROYECTO_ESTADOS]?.label}
                    </CommandShortcut>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {index.tasks.length > 0 && (
              <CommandGroup heading="Tareas">
                {index.tasks.map((t) => (
                  <CommandItem
                    key={t.id}
                    value={`tarea ${t.titulo} ${t.proyecto ?? ""} ${t.id}`}
                    onSelect={() => run(() => router.push(`/tareas?vista=lista&tarea=${t.id}`))}
                  >
                    <CheckSquare />
                    <span className={t.estado === "hecha" ? "truncate text-muted-foreground line-through" : "truncate"}>
                      {t.titulo}
                    </span>
                    {t.proyecto && <span className="truncate text-xs text-muted-foreground">{t.proyecto}</span>}
                    <CommandShortcut className="tracking-normal">
                      {t.estado !== "hecha" && t.fecha_limite
                        ? formatRelativeDay(t.fecha_limite)
                        : TAREA_ESTADOS[t.estado as keyof typeof TAREA_ESTADOS]?.label}
                    </CommandShortcut>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {index.meetings.length > 0 && (
              <CommandGroup heading="Reuniones">
                {index.meetings.map((m) => (
                  <CommandItem
                    key={m.id}
                    value={`reunion reunión ${m.titulo} ${m.id}`}
                    onSelect={() => run(() => router.push(`/reuniones/${m.id}`))}
                  >
                    <Video />
                    <span className="truncate">{m.titulo}</span>
                    <CommandShortcut className="tracking-normal">{formatDate(m.fecha_inicio, "month")}</CommandShortcut>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            <CommandSeparator />
          </>
        )}

        <CommandGroup heading="Crear">
          {QUICK_ACTIONS.map(({ kind, createLabel, icon: Icon, tone }) => (
            <CommandItem
              key={kind}
              value={`crear nuevo nueva ${createLabel}`}
              onSelect={() => run(() => quickCreate.open(kind))}
            >
              <Icon className={tone} />
              {createLabel}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />
        <CommandGroup heading="Ir a">
          {ALL_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <CommandItem
                key={item.href}
                value={`ir ${item.label} ${(item.keywords ?? []).join(" ")}`}
                onSelect={() => run(() => router.push(item.href))}
              >
                <Icon />
                {item.label}
              </CommandItem>
            );
          })}
        </CommandGroup>

        <CommandSeparator />
        <CommandGroup heading="Preferencias">
          <CommandItem
            value="cambiar tema modo claro oscuro"
            onSelect={() => run(() => setTheme(resolvedTheme === "dark" ? "light" : "dark"))}
          >
            {resolvedTheme === "dark" ? <Sun /> : <Moon />}
            {resolvedTheme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
          </CommandItem>
          <CommandItem value="cerrar sesión salir" onSelect={() => run(() => startTransition(async () => { await signOut(); }))}>
            <LogOut />
            Cerrar sesión
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
