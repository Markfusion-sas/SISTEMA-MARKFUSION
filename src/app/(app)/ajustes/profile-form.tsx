"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { profileSchema, type ProfileInput } from "@/lib/validations/profile";
import { useCurrentUser } from "@/components/layout/current-user";
import { ColorPicker } from "@/components/shared/color-picker";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { updateMyProfile } from "./actions";

export function ProfileForm() {
  const { profile, email } = useCurrentUser();

  const form = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: { nombre: profile.nombre, color: profile.color },
  });

  const preview = form.watch();

  const onSubmit = async (values: ProfileInput) => {
    const result = await updateMyProfile(values);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Perfil actualizado");
    form.reset(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex items-center gap-4 rounded-xl border bg-muted/20 p-4">
          <UserAvatar
            profile={{ nombre: preview.nombre || profile.nombre, color: preview.color, avatar_url: profile.avatar_url }}
            className="size-12 text-sm"
          />
          <div className="min-w-0">
            <div className="truncate font-medium">{preview.nombre || profile.nombre}</div>
            <div className="truncate text-sm text-muted-foreground">{email}</div>
          </div>
        </div>

        <FormField
          control={form.control}
          name="nombre"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre</FormLabel>
              <FormControl>
                <Input placeholder="Tu nombre" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="color"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tu color</FormLabel>
              <FormControl>
                <ColorPicker value={field.value} onChange={field.onChange} />
              </FormControl>
              <FormDescription>Se usa en tu avatar y en los chips de tus tareas y reuniones.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            disabled={!form.formState.isDirty || form.formState.isSubmitting}
            onClick={() => form.reset()}
          >
            Descartar
          </Button>
          <Button type="submit" loading={form.formState.isSubmitting} disabled={!form.formState.isDirty}>
            Guardar cambios
          </Button>
        </div>
      </form>
    </Form>
  );
}
