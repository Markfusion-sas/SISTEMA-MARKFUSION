import { Suspense } from "react";
import type { Metadata } from "next";
import { Briefcase, CalendarDays, CheckSquare, FileText, Users, Wallet } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Skeleton } from "@/components/ui/skeleton";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Iniciar sesión",
};

const MODULES = [
  { icon: CheckSquare, label: "Tareas" },
  { icon: CalendarDays, label: "Calendario" },
  { icon: Users, label: "Clientes" },
  { icon: Briefcase, label: "Proyectos" },
  { icon: FileText, label: "Cotizaciones" },
  { icon: Wallet, label: "Finanzas" },
];

export default function LoginPage() {
  const year = new Date().getFullYear();

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      {/* Panel de marca */}
      <aside className="relative hidden overflow-hidden border-r bg-[oklch(0.13_0.01_286)] text-white lg:flex lg:flex-col">
        <div className="absolute inset-0 bg-grid opacity-[0.35] [mask-image:radial-gradient(ellipse_at_30%_40%,black_20%,transparent_70%)]" />
        <div className="absolute -top-40 -left-32 size-[520px] rounded-full bg-brand/40 blur-[120px]" />
        <div className="absolute -right-24 -bottom-40 size-[460px] rounded-full bg-brand-2/25 blur-[120px]" />

        <div className="relative flex h-full flex-col justify-between p-12 xl:p-16">
          <Logo className="text-white" markClassName="size-9" />

          <div className="max-w-lg space-y-6">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/70 backdrop-blur">
              <span className="size-1.5 rounded-full bg-emerald-400" />
              Sistema interno · acceso privado
            </p>
            <h1 className="text-4xl leading-[1.1] font-semibold tracking-tight xl:text-5xl">
              Toda la operación de la agencia,{" "}
              <span className="text-brand-gradient">en un solo lugar.</span>
            </h1>
            <p className="text-base text-white/60">
              Clientes, proyectos, tareas, reuniones, cotizaciones y finanzas de MarkFusion. Simple, rápido y hecho a la
              medida de Juan Jose y Jerónimo.
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              {MODULES.map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[13px] text-white/80 backdrop-blur"
                >
                  <Icon className="size-3.5 text-white/60" />
                  {label}
                </span>
              ))}
            </div>
          </div>

          <p className="text-xs text-white/40">© {year} MarkFusion · IA, automatizaciones y desarrollo web · Colombia</p>
        </div>
      </aside>

      {/* Formulario */}
      <main className="relative flex flex-col">
        <div className="absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-brand/10 to-transparent lg:hidden" />
        <div className="relative flex items-center justify-between p-6">
          <Logo className="lg:invisible" markClassName="size-8" />
          <ThemeToggle />
        </div>

        <div className="relative flex flex-1 items-center justify-center px-6 pb-16">
          <div className="w-full max-w-sm space-y-8">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight">Inicia sesión</h2>
              <p className="text-sm text-muted-foreground">Entra con el correo y la contraseña de tu cuenta de socio.</p>
            </div>

            <Suspense
              fallback={
                <div className="space-y-4">
                  <Skeleton className="h-11 w-full" />
                  <Skeleton className="h-11 w-full" />
                  <Skeleton className="h-11 w-full" />
                </div>
              }
            >
              <LoginForm />
            </Suspense>

            <p className="text-center text-xs text-muted-foreground">
              No hay registro público. Si olvidaste tu contraseña, restablécela desde el panel de Supabase.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
