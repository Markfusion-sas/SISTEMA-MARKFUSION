"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Building2,
  Check,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  SearchX,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { deleteCredentialAction, revealCredentialAction } from "@/app/(app)/accesos/actions";
import { ClientAvatar } from "@/components/clients/client-avatar";
import { CredentialFormDialog } from "@/components/credentials/credential-form-dialog";
import type { CredentialRow } from "@/components/credentials/types";
import { useCurrentUser } from "@/components/layout/current-user";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterChips } from "@/components/shared/filter-chips";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput, normalize } from "@/components/shared/search-input";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Filter = "todos" | "internos" | "clientes";

/** Segundos que la contraseña queda visible antes de ocultarse sola. */
const REVEAL_SECONDS = 30;

function hostname(url: string | null) {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function CredentialsView({
  credentials,
  clients,
  cryptoReady,
}: {
  credentials: CredentialRow[];
  clients: { id: string; nombre: string; empresa: string | null; estado?: string }[];
  cryptoReady: boolean;
}) {
  const { team } = useCurrentUser();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("todos");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CredentialRow | null>(null);
  const [deleting, setDeleting] = useState<CredentialRow | null>(null);

  // Contraseñas visibles en este momento (se ocultan solas).
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    const current = timers.current;
    return () => Object.values(current).forEach(clearTimeout);
  }, []);

  const hide = (id: string) => {
    clearTimeout(timers.current[id]);
    setRevealed((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const fetchPassword = async (id: string) => {
    if (revealed[id]) return revealed[id];
    setLoadingId(id);
    const result = await revealCredentialAction(id);
    setLoadingId(null);
    if (!result.ok || !result.data) {
      toast.error(result.ok ? "No se pudo obtener la contraseña" : result.error);
      return null;
    }
    return result.data.password;
  };

  const toggleReveal = async (c: CredentialRow) => {
    if (revealed[c.id]) return hide(c.id);
    const password = await fetchPassword(c.id);
    if (!password) return;
    setRevealed((prev) => ({ ...prev, [c.id]: password }));
    clearTimeout(timers.current[c.id]);
    timers.current[c.id] = setTimeout(() => hide(c.id), REVEAL_SECONDS * 1000);
  };

  const copy = async (key: string, text: string | null, label: string) => {
    if (!text) return;
    if (await copyText(text)) {
      setCopied(key);
      setTimeout(() => setCopied((k) => (k === key ? null : k)), 1500);
      toast.success(`${label} copiado`);
    } else {
      toast.error("El navegador no dejó copiar. Muéstrala y cópiala a mano.");
    }
  };

  const copyPassword = async (c: CredentialRow) => {
    const password = await fetchPassword(c.id);
    await copy(`pw-${c.id}`, password, "Contraseña");
  };

  const filtered = useMemo(() => {
    const q = normalize(search.trim());
    return credentials
      .filter((c) => {
        if (filter === "internos" && c.client_id) return false;
        if (filter === "clientes" && !c.client_id) return false;
        if (!q) return true;
        return [c.plataforma, c.usuario, c.url, c.notas, c.client?.nombre, c.client?.empresa].some((f) =>
          normalize(f).includes(q),
        );
      })
      .sort((a, b) => a.plataforma.localeCompare(b.plataforma, "es", { sensitivity: "base" }));
  }, [credentials, filter, search]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deleting) return;
    const result = await deleteCredentialAction(deleting.id);
    if (!result.ok) {
      toast.error(result.error);
      throw new Error(result.error);
    }
    toast.success(`Acceso a ${deleting.plataforma} eliminado`);
    hide(deleting.id);
    setDeleting(null);
  };

  const internos = credentials.filter((c) => !c.client_id).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Accesos"
        description="Correos y contraseñas de las plataformas de la agencia y de los clientes, guardados cifrados."
        actions={
          <Button onClick={openCreate} disabled={!cryptoReady}>
            <Plus />
            Nuevo acceso
          </Button>
        }
      />

      {!cryptoReady && (
        <div className="flex gap-3 rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm">
          <ShieldAlert className="mt-0.5 size-5 shrink-0 text-warning" />
          <div className="space-y-1">
            <p className="font-medium text-foreground">Falta la llave de cifrado</p>
            <p className="text-muted-foreground">
              Para guardar y ver contraseñas, agrega la variable <code className="font-mono">CREDENTIALS_ENCRYPTION_KEY</code>{" "}
              en Vercel (tipo Secret) con el valor que está en <code className="font-mono">.env.local</code> y vuelve a desplegar.
            </p>
          </div>
        </div>
      )}

      {credentials.length === 0 ? (
        <EmptyState
          icon={KeyRound}
          title="Aún no hay accesos guardados"
          description="Guarda aquí los correos y contraseñas de Hostinger, Meta, Canva, los hostings de los clientes… Todo cifrado."
          action={
            <Button onClick={openCreate} disabled={!cryptoReady}>
              <Plus />
              Guardar el primero
            </Button>
          }
        />
      ) : (
        <>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <FilterChips
              options={[
                { value: "todos" as Filter, label: "Todos", count: credentials.length },
                { value: "internos" as Filter, label: "Internos", count: internos },
                { value: "clientes" as Filter, label: "De clientes", count: credentials.length - internos },
              ]}
              value={filter}
              onChange={setFilter}
            />
            <SearchInput value={search} onChange={setSearch} placeholder="Buscar plataforma, correo o cliente…" className="w-full lg:w-80" />
          </div>

          {filtered.length === 0 ? (
            <EmptyState compact icon={SearchX} title="Sin resultados" description="Prueba con otra búsqueda o cambia el filtro." />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((c) => {
                const host = hostname(c.url);
                const shown = revealed[c.id];
                const editor = team.find((m) => m.id === (c.updated_by ?? c.created_by)) ?? null;
                return (
                  <div key={c.id} className="flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-card">
                    {/* Encabezado */}
                    <div className="flex items-start gap-3">
                      <ClientAvatar nombre={c.plataforma} className="size-10 rounded-xl text-sm" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-semibold">{c.plataforma}</div>
                        {host ? (
                          <a
                            href={c.url!}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex max-w-full items-center gap-1 truncate text-xs text-muted-foreground hover:text-brand"
                          >
                            <span className="truncate">{host}</span>
                            <ExternalLink className="size-3 shrink-0" />
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">Sin enlace</span>
                        )}
                      </div>
                      <DropdownMenu modal={false}>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm" aria-label={`Acciones de ${c.plataforma}`}>
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onSelect={() => {
                              setEditing(c);
                              setFormOpen(true);
                            }}
                          >
                            <Pencil />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(c)}>
                            <Trash2 />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Credenciales */}
                    <div className="space-y-2">
                      <Field label="Correo / usuario">
                        <span className="min-w-0 flex-1 truncate font-mono text-[13px]">{c.usuario}</span>
                        <IconButton
                          label="Copiar correo o usuario"
                          onClick={() => copy(`us-${c.id}`, c.usuario, "Usuario")}
                          icon={copied === `us-${c.id}` ? Check : Copy}
                          active={copied === `us-${c.id}`}
                        />
                      </Field>
                      <Field label="Contraseña">
                        <span className={cn("min-w-0 flex-1 truncate font-mono text-[13px]", !shown && "tracking-widest text-muted-foreground")}>
                          {shown ?? "••••••••••"}
                        </span>
                        <IconButton
                          label={shown ? "Ocultar contraseña" : "Ver contraseña"}
                          onClick={() => toggleReveal(c)}
                          icon={loadingId === c.id ? Loader2 : shown ? EyeOff : Eye}
                          spin={loadingId === c.id}
                          disabled={!cryptoReady}
                        />
                        <IconButton
                          label="Copiar contraseña"
                          onClick={() => copyPassword(c)}
                          icon={copied === `pw-${c.id}` ? Check : Copy}
                          active={copied === `pw-${c.id}`}
                          disabled={!cryptoReady}
                        />
                      </Field>
                    </div>

                    {c.notas && <p className="line-clamp-2 text-xs whitespace-pre-wrap text-muted-foreground">{c.notas}</p>}

                    {/* Pie */}
                    <div className="mt-auto flex items-center justify-between gap-2 border-t pt-3 text-xs text-muted-foreground">
                      {c.client ? (
                        <Link href={`/clientes/${c.client.id}`} className="min-w-0 truncate hover:text-foreground">
                          <Badge tone="info" className="max-w-full truncate">
                            {c.client.empresa || c.client.nombre}
                          </Badge>
                        </Link>
                      ) : (
                        <Badge tone="brand">
                          <Building2 />
                          Interno
                        </Badge>
                      )}
                      <span className="flex shrink-0 items-center gap-1.5" title="Última actualización">
                        <UserAvatar profile={editor} className="size-4 text-[8px]" />
                        {formatDate(c.updated_at, "month")}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Las contraseñas se guardan cifradas y solo se descifran cuando pulsas ver o copiar. Se ocultan solas a los{" "}
            {REVEAL_SECONDS} segundos.
          </p>
        </>
      )}

      <CredentialFormDialog open={formOpen} onOpenChange={setFormOpen} credential={editing} clients={clients} />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(v) => !v && setDeleting(null)}
        title={`¿Eliminar el acceso a ${deleting?.plataforma}?`}
        description="Se borra el correo y la contraseña guardados. No se puede deshacer."
        onConfirm={handleDelete}
      />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-muted/20 px-3 py-2">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="mt-0.5 flex items-center gap-1">{children}</div>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  icon: Icon,
  active = false,
  spin = false,
  disabled = false,
}: {
  label: string;
  onClick: () => void;
  icon: typeof Copy;
  active?: boolean;
  spin?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40",
        active && "text-success",
      )}
    >
      <Icon className={cn("size-4", spin && "animate-spin")} />
    </button>
  );
}
