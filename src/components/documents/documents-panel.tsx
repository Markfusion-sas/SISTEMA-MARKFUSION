"use client";

import { useRef, useState } from "react";
import { Download, FileImage, FileSpreadsheet, FileText, FolderOpen, Loader2, Paperclip, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import type { DocumentFile, DocumentoTipo } from "@/types/database";
import { DOCUMENTO_TIPOS, DOCUMENTO_TIPO_OPTIONS } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { createDocumentAction, deleteDocumentAction, getDocumentUrlAction } from "@/lib/actions/documents";
import { useCurrentUser } from "@/components/layout/current-user";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { FormDialog } from "@/components/shared/form-dialog";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const MAX_BYTES = 50 * 1024 * 1024;
const NONE = "__none__";

export type DocumentRow = DocumentFile & { project?: { id: string; nombre: string } | null };

function iconFor(path: string) {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  if (["png", "jpg", "jpeg", "webp", "gif", "heic", "svg"].includes(ext)) return FileImage;
  if (["xls", "xlsx", "csv"].includes(ext)) return FileSpreadsheet;
  return FileText;
}

function safeFileName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(-80);
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Lista y subida de documentos. Los archivos van al bucket privado "documentos"
 * y se descargan con URLs firmadas temporales.
 */
export function DocumentsPanel({
  documents,
  clientId,
  projectId,
  projects = [],
}: {
  documents: DocumentRow[];
  clientId: string | null;
  projectId: string | null;
  /** Proyectos del cliente, para elegir a cuál ligar el documento (solo en la ficha del cliente). */
  projects?: { id: string; nombre: string }[];
}) {
  const { team } = useCurrentUser();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleting, setDeleting] = useState<DocumentRow | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  const author = (id: string | null) => team.find((m) => m.id === id) ?? null;

  const handleDownload = async (doc: DocumentRow) => {
    setDownloading(doc.id);
    const tab = window.open("", "_blank");
    const result = await getDocumentUrlAction(doc.id);
    setDownloading(null);
    if (!result.ok || !result.data) {
      tab?.close();
      toast.error(result.ok ? "No se pudo abrir el documento" : result.error);
      return;
    }
    if (tab) tab.location.href = result.data.url;
    else window.location.href = result.data.url;
  };

  const handleDelete = async () => {
    if (!deleting) return;
    const result = await deleteDocumentAction(deleting.id);
    if (!result.ok) {
      toast.error(result.error);
      throw new Error(result.error);
    }
    toast.success("Documento eliminado");
    setDeleting(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {documents.length
            ? `${documents.length} ${documents.length === 1 ? "documento" : "documentos"}`
            : "Contratos, briefs, entregables y facturas."}
        </p>
        <Button size="sm" onClick={() => setUploadOpen(true)}>
          <Upload />
          Subir documento
        </Button>
      </div>

      {documents.length === 0 ? (
        <EmptyState
          compact
          icon={FolderOpen}
          title="Sin documentos"
          description="Sube el contrato, el brief o los entregables para tenerlos a la mano."
          action={
            <Button variant="outline" onClick={() => setUploadOpen(true)}>
              <Paperclip />
              Subir el primero
            </Button>
          }
        />
      ) : (
        <div className="divide-y overflow-hidden rounded-xl border bg-card">
          {documents.map((doc) => {
            const Icon = iconFor(doc.file_url);
            const tipo = DOCUMENTO_TIPOS[doc.tipo];
            return (
              <div key={doc.id} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/30">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{doc.nombre}</div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <Badge tone={tipo.tone} className="px-1.5 py-0 text-[11px]">
                      {tipo.label}
                    </Badge>
                    {doc.project && <span className="truncate">{doc.project.nombre}</span>}
                    <span>{formatDate(doc.created_at, "medium")}</span>
                  </div>
                </div>
                <UserAvatar profile={author(doc.subido_por)} className="hidden size-6 sm:flex" />
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleDownload(doc)}
                  disabled={downloading === doc.id}
                  aria-label={`Descargar ${doc.nombre}`}
                >
                  {downloading === doc.id ? <Loader2 className="animate-spin" /> : <Download />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setDeleting(doc)}
                  className="hover:text-destructive"
                  aria-label={`Eliminar ${doc.nombre}`}
                >
                  <Trash2 />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <UploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        clientId={clientId}
        projectId={projectId}
        projects={projects}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`¿Eliminar "${deleting?.nombre}"?`}
        description="El archivo se borrará del almacenamiento y no se puede recuperar."
        onConfirm={handleDelete}
      />
    </div>
  );
}

function UploadDialog({
  open,
  onOpenChange,
  clientId,
  projectId,
  projects,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string | null;
  projectId: string | null;
  projects: { id: string; nombre: string }[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState<DocumentoTipo>("contrato");
  const [linkedProject, setLinkedProject] = useState<string>(projectId ?? NONE);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);

  const reset = () => {
    setFile(null);
    setNombre("");
    setTipo("contrato");
    setLinkedProject(projectId ?? NONE);
    if (inputRef.current) inputRef.current.value = "";
  };

  const pick = (selected: File | undefined) => {
    if (!selected) return;
    if (selected.size > MAX_BYTES) {
      toast.error("El archivo supera los 50 MB");
      return;
    }
    setFile(selected);
    if (!nombre) setNombre(selected.name.replace(/\.[^.]+$/, ""));
  };

  const handleUpload = async () => {
    if (!file) return void toast.error("Elige un archivo");
    if (!nombre.trim()) return void toast.error("Escribe un nombre para el documento");

    setUploading(true);
    const supabase = createClient();
    const project = linkedProject === NONE ? null : linkedProject;
    const folder = `${clientId ?? "sin-cliente"}/${project ?? "general"}`;
    const path = `${folder}/${crypto.randomUUID()}-${safeFileName(file.name)}`;

    const { error: uploadError } = await supabase.storage
      .from("documentos")
      .upload(path, file, { contentType: file.type || undefined, upsert: false });

    if (uploadError) {
      setUploading(false);
      toast.error("No se pudo subir el archivo. Revisa tu conexión.");
      return;
    }

    const result = await createDocumentAction({
      nombre: nombre.trim(),
      tipo,
      client_id: clientId,
      project_id: project,
      file_url: path,
    });
    setUploading(false);

    if (!result.ok) return void toast.error(result.error);
    toast.success("Documento subido");
    reset();
    onOpenChange(false);
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={(value) => {
        if (uploading) return;
        if (!value) reset();
        onOpenChange(value);
      }}
      title="Subir documento"
      description="PDF, imágenes, hojas de cálculo o cualquier archivo de hasta 50 MB."
    >
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            pick(e.dataTransfer.files?.[0]);
          }}
          className={`flex w-full flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-8 text-center transition-colors ${
            dragging ? "border-brand bg-brand/5" : "hover:border-foreground/25 hover:bg-muted/30"
          }`}
        >
          <span className="flex size-10 items-center justify-center rounded-full bg-brand/10 text-brand">
            <Upload className="size-5" />
          </span>
          {file ? (
            <>
              <span className="max-w-full truncate text-sm font-medium">{file.name}</span>
              <span className="text-xs text-muted-foreground">{formatBytes(file.size)} · toca para cambiarlo</span>
            </>
          ) : (
            <>
              <span className="text-sm font-medium">Arrastra el archivo o toca para elegirlo</span>
              <span className="text-xs text-muted-foreground">Máximo 50 MB</span>
            </>
          )}
        </button>
        <input ref={inputRef} type="file" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="doc-nombre">Nombre</Label>
            <Input id="doc-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Contrato firmado" />
          </div>
          <div className="grid gap-2">
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as DocumentoTipo)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENTO_TIPO_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {!projectId && projects.length > 0 && (
            <div className="grid gap-2">
              <Label>Proyecto</Label>
              <Select value={linkedProject} onValueChange={setLinkedProject}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>General del cliente</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={uploading}>
            Cancelar
          </Button>
          <Button onClick={handleUpload} loading={uploading} disabled={!file}>
            {uploading ? "Subiendo…" : "Subir documento"}
          </Button>
        </div>
      </div>
    </FormDialog>
  );
}
