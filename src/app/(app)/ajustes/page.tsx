import type { Metadata } from "next";
import { Building2, Palette, Tags, UserRound, Users } from "lucide-react";

import { getBrand } from "@/lib/brand";
import { createClient } from "@/lib/supabase/server";
import type { CategoryOption } from "@/components/finance/types";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Appearance } from "./appearance";
import { BrandSettingsForm } from "./brand-settings";
import { CategoriesSettings } from "./categories-settings";
import { ProfileForm } from "./profile-form";
import { TeamColors } from "./team-colors";

export const metadata: Metadata = { title: "Ajustes" };

const TABS = ["perfil", "equipo", "categorias", "marca", "apariencia"];

export default async function AjustesPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const supabase = await createClient();
  const [{ data: categories }, { brand, logoSignedUrl }] = await Promise.all([
    supabase.from("categories").select("id, tipo, slug, nombre, color, activo, orden").order("orden"),
    getBrand(supabase),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Ajustes"
        description="Tu perfil, el equipo, las categorías de dinero, los datos de la marca y la apariencia."
      />

      <Tabs defaultValue={TABS.includes(tab ?? "") ? tab : "perfil"}>
        <TabsList>
          <TabsTrigger value="perfil">
            <UserRound />
            Perfil
          </TabsTrigger>
          <TabsTrigger value="equipo">
            <Users />
            Equipo
          </TabsTrigger>
          <TabsTrigger value="categorias">
            <Tags />
            Categorías
          </TabsTrigger>
          <TabsTrigger value="marca">
            <Building2 />
            Marca
          </TabsTrigger>
          <TabsTrigger value="apariencia">
            <Palette />
            Apariencia
          </TabsTrigger>
        </TabsList>

        <TabsContent value="perfil">
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle>Perfil</CardTitle>
              <CardDescription>Así te ven en tareas, reuniones y movimientos.</CardDescription>
            </CardHeader>
            <CardContent>
              <ProfileForm />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="equipo">
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle>Color de cada socio</CardTitle>
              <CardDescription>Los cambios se guardan al instante y se ven en toda la app.</CardDescription>
            </CardHeader>
            <CardContent>
              <TeamColors />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categorias">
          <Card>
            <CardHeader>
              <CardTitle>Categorías de ingresos y gastos</CardTitle>
              <CardDescription>
                Se usan en Finanzas, en los reportes y en la gráfica de gastos. Desactiva las que no uses para ocultarlas
                de los formularios sin perder el historial.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CategoriesSettings categories={(categories ?? []) as CategoryOption[]} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="marca">
          <Card className="max-w-3xl">
            <CardHeader>
              <CardTitle>Datos de la marca</CardTitle>
              <CardDescription>Aparecen en el encabezado y el pie del PDF de cada cotización.</CardDescription>
            </CardHeader>
            <CardContent>
              <BrandSettingsForm brand={brand} logoUrl={logoSignedUrl} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="apariencia">
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle>Tema</CardTitle>
              <CardDescription>El modo oscuro es el predeterminado. La preferencia se guarda en este navegador.</CardDescription>
            </CardHeader>
            <CardContent>
              <Appearance />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
