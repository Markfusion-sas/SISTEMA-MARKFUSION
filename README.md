# MarkFusion OS

Sistema interno de gestión de **MarkFusion** (IA, automatizaciones y desarrollo web · Colombia).
Lo usan dos socios, Juan Jose y Jerónimo, para registrar y consultar la operación de la agencia: clientes, proyectos, tareas, reuniones, cotizaciones y finanzas.

Es una herramienta 100 % manual: no usa IA, automatizaciones, bots ni integraciones externas.

- **Stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · shadcn/ui · Supabase (Auth, Postgres con RLS y Storage)
- **Moneda:** COP por defecto (formato `$1.500.000`) con soporte para USD
- **Zona horaria:** America/Bogota
- **Dominio:** `os.zenixmachine.com`

## Módulos

| Módulo | Qué hace |
| --- | --- |
| **Dashboard** | Ingresos, gastos, utilidad y por cobrar del mes con variación frente al mes anterior; ingresos vs gastos de 6 meses; gastos por categoría; tareas de la semana por persona; reuniones; próximos cobros y gastos recurrentes del mes. |
| **Tareas** | Kanban con arrastrar y soltar, vista de lista agrupada por vencimiento y "Mi día". Filtros por responsable, proyecto y prioridad. |
| **Reuniones** | Próximas, por cerrar, realizadas y canceladas. Agenda, notas y decisiones, y tareas que nacen en la reunión y van al kanban. |
| **Calendario** | Mes, semana y día con reuniones, entregas, tareas, cobros y gastos recurrentes. Arrastra reuniones y tareas para reprogramarlas. |
| **Clientes** | Tabla con búsqueda y estados; ficha con proyectos, cotizaciones, reuniones, pagos, documentos y saldo pendiente. |
| **Proyectos** | Tarjetas con avance; ficha con tareas, reuniones, finanzas (cobrado, por cobrar, gastos y margen) y documentos. |
| **Cotizaciones** | Editor de ítems con vista previa en vivo, PDF con la marca y "Convertir en proyecto" con sus cuentas por cobrar. |
| **Finanzas** | Movimientos con soportes (foto o PDF), cuentas por cobrar con "Marcar como pagado", gastos recurrentes y reportes (P&L mensual y CSV). |
| **Ajustes** | Perfil, color de cada socio, categorías de ingresos y gastos, datos de la marca para el PDF y tema. |

En cualquier pantalla: botón flotante **+** para crear un gasto, ingreso, tarea, reunión o cliente, y buscador global con **Ctrl/⌘ + K**.

---

## 1. Requisitos

- Node.js **20.6 o superior** (`node -v`)
- Una cuenta en [Supabase](https://supabase.com) y otra en [Vercel](https://vercel.com)
- Acceso al panel DNS de Hostinger donde está `zenixmachine.com`

## 2. Crear el proyecto en Supabase

1. Entra a <https://supabase.com/dashboard> → **New project**.
2. Nombre: `markfusion-os`. Región recomendada: **East US (North Virginia)**, la más cercana a Colombia.
3. Guarda la contraseña de la base de datos en un lugar seguro.
4. Cuando termine de crearse, ve a **Project Settings → API** y copia:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY` (**secreta**: nunca la subas a git ni la uses en el navegador)

### Cerrar el registro público

En **Authentication → Sign In / Providers**:

- Deja activo **Email**.
- Desactiva **Allow new users to sign up**. Así nadie puede crear cuentas desde fuera.
- Puedes desactivar **Confirm email**; el script de usuarios ya crea las cuentas confirmadas.

### Configurar las URLs

En **Authentication → URL Configuration**:

- **Site URL:** `https://os.zenixmachine.com`
- **Redirect URLs:** agrega `http://localhost:3000/**` y `https://os.zenixmachine.com/**`

## 3. Correr las migraciones

Las migraciones están en `supabase/migrations/`. Crean las tablas, los tipos, los triggers, las políticas RLS y los buckets privados `soportes`, `documentos` y `marca`.

### Opción A: desde el panel (la más simple)

Ejecuta los archivos **en orden**, uno por consulta:

1. Abre **SQL Editor → New query**.
2. Pega el contenido de `supabase/migrations/20260928000000_esquema_inicial.sql` y haz clic en **Run**. Debe terminar con `Success. No rows returned`.
3. En otra consulta, pega y ejecuta `supabase/migrations/20261001000000_colores_categorias.sql` (ajusta los colores de las categorías a la paleta de las gráficas).
4. En otra consulta, pega y ejecuta `supabase/migrations/20261002000000_seguridad_funciones.sql` (endurece las funciones; deja el Security Advisor sin avisos).

### Opción B: con la CLI de Supabase

```bash
npx supabase login
npx supabase link --project-ref TU_PROJECT_REF
npx supabase db push
```

> `TU_PROJECT_REF` es el identificador que aparece en la URL del proyecto (`https://TU_PROJECT_REF.supabase.co`).

## 4. Variables de entorno

Copia el archivo de ejemplo y completa los valores:

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## 5. Crear los 2 usuarios

Instala las dependencias y corre el script. Te pedirá el nombre, el correo y la contraseña de cada socio:

```bash
npm install
npm run crear-usuarios
```

Cada usuario recibe un perfil automático (tabla `profiles`) con un color propio, que luego se puede cambiar en **Ajustes**.

<details>
<summary>Alternativa: crearlos desde el panel de Supabase</summary>

1. **Authentication → Users → Add user → Create new user**.
2. Escribe el correo y la contraseña y marca **Auto Confirm User**.
3. Repite para el otro socio.
4. En **SQL Editor**, pon el nombre de cada uno:

```sql
update public.profiles set nombre = 'Juan Jose' where id = (select id from auth.users where email = 'correo-de-juan@ejemplo.com');
update public.profiles set nombre = 'Jerónimo'  where id = (select id from auth.users where email = 'correo-de-jeronimo@ejemplo.com');
```

</details>

## 6. Cargar los datos de ejemplo (opcional)

**Después** de crear los usuarios, abre **SQL Editor**, pega el contenido de `supabase/seed.sql` y ejecútalo.
Carga 5 clientes, 5 proyectos, 25 tareas, 6 reuniones, 30 movimientos, 3 cotizaciones, cuentas por cobrar y gastos recurrentes. Las fechas son relativas al día de hoy, así que el dashboard siempre tiene datos recientes.

El seed no se ejecuta si ya hay clientes en la base. Para empezar de cero con datos reales, simplemente no lo corras.

## 7. Correr en local

```bash
npm run dev
```

Abre <http://localhost:3000> e inicia sesión con uno de los usuarios.

Otros comandos útiles:

| Comando             | Qué hace                                  |
| ------------------- | ----------------------------------------- |
| `npm run build`     | Compila para producción                   |
| `npm run start`     | Sirve la compilación de producción        |
| `npm run typecheck` | Revisa los tipos de TypeScript            |
| `npm run lint`      | Revisa el código con ESLint               |

## 8. Deploy en Vercel

1. Sube el proyecto a un repositorio privado de GitHub.
2. En <https://vercel.com/new>, importa el repositorio. Vercel detecta Next.js automáticamente.
3. En **Environment Variables**, agrega las 4 variables:

   | Variable                        | Valor                                     |
   | ------------------------------- | ----------------------------------------- |
   | `NEXT_PUBLIC_SUPABASE_URL`      | la URL del proyecto                       |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | la llave `anon`                           |
   | `SUPABASE_SERVICE_ROLE_KEY`     | la llave `service_role`                   |
   | `NEXT_PUBLIC_SITE_URL`          | `https://os.zenixmachine.com`            |

4. Haz clic en **Deploy**.
5. Ve a **Settings → Domains**, agrega `os.zenixmachine.com` y deja la pantalla abierta: Vercel te mostrará el registro DNS que debes crear.

## 9. Configurar el CNAME en Hostinger

1. Entra a **hPanel → Dominios → zenixmachine.com → DNS / Nameservers**.
2. En **Administrar registros DNS**, crea un registro nuevo:

   | Tipo  | Nombre | Apunta a                                 | TTL  |
   | ----- | ------ | ---------------------------------------- | ---- |
   | CNAME | `os`   | `1d07a2e2db379f36.vercel-dns-017.com`    | 3600 |

   > Ese es el valor que asignó Vercel a este proyecto. Si algún día cambias de proyecto en Vercel, usa exactamente el valor que te muestre en **Settings → Domains**. No toques los registros `@` y `www`: son del sitio principal zenixmachine.com.

3. Si ya existía un registro `A` o `CNAME` con el nombre `os`, elimínalo antes.
4. Espera unos minutos (puede tardar hasta unas horas). Cuando Vercel muestre **Valid Configuration**, el certificado SSL se emite solo.
5. Abre <https://os.zenixmachine.com>.

## Instalar como app (celular y computador)

MarkFusion OS se puede instalar como una app: abre a pantalla completa, sin barras del navegador y con su propio ícono. Requiere el sitio en **HTTPS** (el dominio `os.zenixmachine.com` ya desplegado).

- **iPhone / iPad (Safari):** abre `https://os.zenixmachine.com` → botón **Compartir** → **Agregar a Inicio** → **Agregar**.
- **Android (Chrome):** menú ⋮ → **Instalar app** (o **Agregar a pantalla principal**).
- **Computador (Chrome o Edge):** ícono de instalar en la barra de direcciones, o menú → **Instalar MarkFusion OS**.

La primera vez que abras la app instalada te pedirá iniciar sesión: en iPhone, la app instalada guarda su sesión aparte de Safari. Mantener presionado el ícono (Android y escritorio) muestra accesos directos a Mi día, Finanzas y Calendario.

## 10. Personalización

### Color de marca

Todo el acento de la app sale de dos variables en `src/app/globals.css`:

```css
:root {
  --brand: oklch(0.62 0.2 282);   /* color principal */
  --brand-2: oklch(0.72 0.15 205); /* segundo color de los degradados */
}
```

Cambia esos valores (aceptan cualquier color CSS, por ejemplo `#6d5ef0`) y se actualizan botones, focos, indicadores, gráficas y el logo.

### Tema

El modo oscuro es el predeterminado. Cada usuario puede cambiarlo desde la topbar, el menú de usuario, `Ctrl + K` o **Ajustes → Apariencia**.

## 11. Estructura del proyecto

```
src/
  app/
    login/              Pantalla de inicio de sesión
    (app)/              Rutas protegidas (layout con sidebar y topbar)
      dashboard/ tareas/ reuniones/ calendario/
      clientes/ proyectos/ cotizaciones/ finanzas/ ajustes/
  components/
    ui/                 Componentes base (shadcn/ui)
    layout/             Sidebar, topbar, menú inferior móvil, Ctrl+K
    shared/             Empty states, confirmaciones, formularios en modal/drawer
    brand/              Logo
  lib/
    supabase/           Clientes de Supabase (navegador, servidor, middleware)
    validations/        Esquemas Zod
    format.ts           Moneda COP/USD y fechas en America/Bogota
    constants.ts        Etiquetas y colores de estados
  middleware.ts         Protege todas las rutas excepto /login
supabase/
  migrations/           Esquema SQL
  seed.sql              Datos de ejemplo
scripts/
  crear-usuarios.mjs    Crea las cuentas de los socios
```

## 12. Atajos de teclado

| Atajo              | Acción                                                      |
| ------------------ | ----------------------------------------------------------- |
| `Ctrl/⌘ + K`       | Buscador global (clientes, proyectos, tareas, reuniones)    |
| `Ctrl/⌘ + B`       | Contraer/expandir la sidebar                                |
| `Ctrl/⌘ + S`       | Guardar las notas de una reunión                            |
| `Espacio` / flechas | Tomar y mover una tarjeta del kanban con el teclado        |
| `Enter`            | Abrir la tarea enfocada en el kanban                        |

## 13. Seguridad

- Todas las tablas tienen **RLS activo**: solo los usuarios autenticados pueden leer o escribir.
- Los buckets de Storage son **privados**; los archivos se sirven con URLs firmadas temporales.
- El registro público está cerrado; las cuentas solo se crean con la `service_role` o desde el panel.
- `SUPABASE_SERVICE_ROLE_KEY` solo se usa en el script local y en el servidor, nunca en el navegador.
