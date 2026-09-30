"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Wand2 } from "lucide-react";
import { toast } from "sonner";

import { clientOptionLabel } from "@/lib/clients";
import { credentialSchema, type CredentialInput } from "@/lib/validations/credential";
import { createCredentialAction, updateCredentialAction } from "@/app/(app)/accesos/actions";
import type { CredentialRow } from "@/components/credentials/types";
import { FormDialog } from "@/components/shared/form-dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const NONE = "__none__";
const PLATAFORMAS = [
  "Google Workspace",
  "Gmail",
  "Meta Business",
  "Instagram",
  "Facebook",
  "TikTok",
  "LinkedIn",
  "Hostinger",
  "Vercel",
  "GitHub",
  "Supabase",
  "WordPress",
  "Shopify",
  "Canva",
  "Figma",
  "Google Ads",
  "Google Analytics",
  "Mailchimp",
  "Wix",
  "Railway",
];

/** Contraseña segura de 20 caracteres con letras, números y símbolos. */
function generatePassword(length = 20) {
  const sets = ["ABCDEFGHJKLMNPQRSTUVWXYZ", "abcdefghijkmnopqrstuvwxyz", "23456789", "!@#$%&*?-_+="];
  const all = sets.join("");
  const random = (max: number) => {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return buf[0] % max;
  };
  const chars = sets.map((s) => s[random(s.length)]);
  while (chars.length < length) chars.push(all[random(all.length)]);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = random(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

function toInput(c: CredentialRow | null | undefined): CredentialInput {
  return {
    plataforma: c?.plataforma ?? "",
    url: c?.url ?? "",
    usuario: c?.usuario ?? "",
    password: "",
    client_id: c?.client_id ?? null,
    notas: c?.notas ?? "",
  };
}

export function CredentialFormDialog({
  open,
  onOpenChange,
  credential,
  clients,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  credential?: CredentialRow | null;
  clients: { id: string; nombre: string; empresa: string | null; estado?: string }[];
}) {
  const isEdit = Boolean(credential);
  const [showPassword, setShowPassword] = useState(false);
  const form = useForm<CredentialInput>({ resolver: zodResolver(credentialSchema), defaultValues: toInput(credential) });

  // Reinicia solo al abrir, para no perder lo escrito si la página se refresca.
  useEffect(() => {
    if (open) {
      form.reset(toInput(credential));
      setShowPassword(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const onSubmit = async (values: CredentialInput) => {
    if (!isEdit && !values.password) {
      form.setError("password", { message: "Escribe la contraseña" });
      return;
    }
    const result = credential ? await updateCredentialAction(credential.id, values) : await createCredentialAction(values);
    if (!result.ok) return void toast.error(result.error);
    toast.success(credential ? "Acceso actualizado" : `Acceso a ${values.plataforma} guardado`);
    onOpenChange(false);
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? `Editar acceso · ${credential?.plataforma}` : "Nuevo acceso"}
      description={isEdit ? undefined : "La contraseña se guarda cifrada; solo se ve cuando la pides."}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" autoComplete="off">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="plataforma"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plataforma *</FormLabel>
                  <FormControl>
                    <Input list="plataformas-acceso" placeholder="Hostinger, Meta, Canva…" autoFocus={!isEdit} {...field} />
                  </FormControl>
                  <datalist id="plataformas-acceso">
                    {PLATAFORMAS.map((p) => (
                      <option key={p} value={p} />
                    ))}
                  </datalist>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Enlace de acceso</FormLabel>
                  <FormControl>
                    <Input placeholder="hpanel.hostinger.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="usuario"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Correo o usuario *</FormLabel>
                <FormControl>
                  {/* autoComplete off: que el navegador no lo llene con tu propia cuenta */}
                  <Input placeholder="correo@empresa.com" autoComplete="off" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contraseña {isEdit ? "" : "*"}</FormLabel>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <FormControl>
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder={isEdit ? "Déjala vacía para no cambiarla" : "••••••••"}
                        autoComplete="new-password"
                        className="pr-10 font-mono"
                        {...field}
                      />
                    </FormControl>
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                      aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      form.setValue("password", generatePassword(), { shouldDirty: true });
                      setShowPassword(true);
                    }}
                    title="Generar una contraseña segura"
                  >
                    <Wand2 />
                    <span className="hidden sm:inline">Generar</span>
                  </Button>
                </div>
                {isEdit && <FormDescription>Solo escribe aquí si quieres reemplazar la contraseña guardada.</FormDescription>}
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="client_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>¿De quién es este acceso?</FormLabel>
                <Select value={field.value ?? NONE} onValueChange={(v) => field.onChange(v === NONE ? null : v)}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={NONE}>Interno (de MarkFusion)</SelectItem>
                    {clients.length > 0 && <SelectSeparator />}
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {clientOptionLabel(c)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="notas"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notas</FormLabel>
                <FormControl>
                  <Textarea rows={2} placeholder="Verificación en dos pasos al celular de Juan Jose, códigos de respaldo…" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={form.formState.isSubmitting}>
              {isEdit ? "Guardar cambios" : "Guardar acceso"}
            </Button>
          </div>
        </form>
      </Form>
    </FormDialog>
  );
}
