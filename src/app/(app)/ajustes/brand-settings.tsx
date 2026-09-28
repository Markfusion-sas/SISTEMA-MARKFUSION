"use client";

/* eslint-disable @next/next/no-img-element */
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ImagePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import type { BrandSettings } from "@/types/database";
import { createClient } from "@/lib/supabase/client";
import { brandSchema, type BrandInput } from "@/lib/validations/quote";
import { LogoMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { setBrandLogoAction, updateBrandAction } from "./actions";

const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"];
const LOGO_MAX = 2 * 1024 * 1024;

function toInput(brand: BrandSettings): BrandInput {
  return {
    nombre_empresa: brand.nombre_empresa,
    nit: brand.nit ?? "",
    telefono: brand.telefono ?? "",
    email: brand.email ?? "",
    direccion: brand.direccion ?? "",
    ciudad: brand.ciudad ?? "",
    sitio_web: brand.sitio_web ?? "",
    condiciones_default: brand.condiciones_default ?? "",
  };
}

export function BrandSettingsForm({ brand, logoUrl }: { brand: BrandSettings; logoUrl: string | null }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(logoUrl);
  const [uploading, setUploading] = useState(false);

  const form = useForm<BrandInput>({ resolver: zodResolver(brandSchema), defaultValues: toInput(brand) });

  const onSubmit = async (values: BrandInput) => {
    const result = await updateBrandAction(values);
    if (!result.ok) return void toast.error(result.error);
    toast.success("Datos de la marca guardados");
    form.reset(values);
  };

  const uploadLogo = async (file: File | undefined) => {
    if (!file) return;
    if (!LOGO_TYPES.includes(file.type)) return void toast.error("Usa un logo en PNG, JPG o WEBP");
    if (file.size > LOGO_MAX) return void toast.error("El logo debe pesar menos de 2 MB");

    setUploading(true);
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `logo/${crypto.randomUUID()}.${ext}`;
    const supabase = createClient();
    const { error } = await supabase.storage.from("marca").upload(path, file, { contentType: file.type });
    if (error) {
      setUploading(false);
      return void toast.error("No se pudo subir el logo");
    }
    const result = await setBrandLogoAction(path);
    setUploading(false);
    if (!result.ok) {
      await supabase.storage.from("marca").remove([path]);
      return void toast.error(result.error);
    }
    setPreview(URL.createObjectURL(file));
    toast.success("Logo actualizado");
  };

  const removeLogo = async () => {
    setUploading(true);
    const result = await setBrandLogoAction(null);
    setUploading(false);
    if (!result.ok) return void toast.error(result.error);
    setPreview(null);
    toast.success("Logo eliminado: el PDF usará el isotipo de MarkFusion");
  };

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex h-20 w-44 items-center justify-center rounded-xl border bg-white p-3">
          {preview ? (
            <img src={preview} alt="Logo" className="max-h-full max-w-full object-contain" />
          ) : (
            <div className="flex items-center gap-2 text-sm font-bold text-zinc-900">
              <LogoMark className="size-8" />
              {brand.nombre_empresa}
            </div>
          )}
        </div>
        <div className="space-y-2">
          <div className="text-sm font-medium">Logo del PDF</div>
          <p className="text-xs text-muted-foreground">PNG con fondo transparente, máximo 2 MB. Sin logo se usa el isotipo.</p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} loading={uploading}>
              {!uploading && <ImagePlus />}
              {preview ? "Cambiar logo" : "Subir logo"}
            </Button>
            {preview && (
              <Button type="button" variant="ghost" size="sm" onClick={removeLogo} disabled={uploading} className="hover:text-destructive">
                <Trash2 />
                Quitar
              </Button>
            )}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept={LOGO_TYPES.join(",")}
            className="hidden"
            onChange={(e) => {
              void uploadLogo(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>
      </section>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="nombre_empresa"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre de la empresa *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="nit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>NIT</FormLabel>
                  <FormControl>
                    <Input placeholder="901.234.567-8" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="telefono"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono</FormLabel>
                  <FormControl>
                    <Input type="tel" placeholder="+57 300 000 0000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Correo</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="hola@markfusion.com.co" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="direccion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dirección</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="ciudad"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ciudad</FormLabel>
                  <FormControl>
                    <Input placeholder="Medellín, Colombia" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="sitio_web"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Sitio web</FormLabel>
                  <FormControl>
                    <Input placeholder="markfusion.com.co" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="condiciones_default"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Condiciones por defecto</FormLabel>
                <FormControl>
                  <Textarea rows={3} {...field} />
                </FormControl>
                <FormDescription>Se precargan en cada cotización nueva; puedes cambiarlas en cada una.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => form.reset()} disabled={!form.formState.isDirty}>
              Descartar
            </Button>
            <Button type="submit" loading={form.formState.isSubmitting} disabled={!form.formState.isDirty}>
              Guardar datos
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
