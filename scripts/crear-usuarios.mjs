// Crea (o actualiza) las cuentas de los socios en Supabase Auth.
// Uso: npm run crear-usuarios   (lee .env.local)
//
// Pide nombre, correo y contraseña de cada socio. Usa la SUPABASE_SERVICE_ROLE_KEY,
// así que ejecútalo solo en tu computador; nunca expongas esa llave en el navegador.

import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("\n✖ Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local\n");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const rl = createInterface({ input, output });

const SOCIOS = ["Juan Jose", "Jerónimo"];

async function ask(question, fallback) {
  const answer = (await rl.question(fallback ? `${question} (${fallback}): ` : `${question}: `)).trim();
  return answer || fallback || "";
}

async function findUserByEmail(email) {
  let page = 1;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (found) return found;
    if (data.users.length < 200) return null;
    page += 1;
  }
}

console.log("\nMarkFusion OS · creación de usuarios\n");

for (const nombrePorDefecto of SOCIOS) {
  console.log(`— Socio: ${nombrePorDefecto}`);
  const nombre = await ask("  Nombre", nombrePorDefecto);
  const email = await ask("  Correo");
  const password = await ask("  Contraseña (mínimo 8 caracteres)");

  if (!email || password.length < 8) {
    console.log("  ✖ Correo vacío o contraseña muy corta. Se omite este socio.\n");
    continue;
  }

  const existing = await findUserByEmail(email);

  if (existing) {
    const { error } = await supabase.auth.admin.updateUserById(existing.id, {
      password,
      user_metadata: { nombre },
      email_confirm: true,
    });
    if (error) {
      console.log(`  ✖ No se pudo actualizar: ${error.message}\n`);
      continue;
    }
    await supabase.from("profiles").update({ nombre }).eq("id", existing.id);
    console.log("  ✔ Usuario existente actualizado.\n");
    continue;
  }

  const { error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nombre },
  });

  if (error) {
    console.log(`  ✖ No se pudo crear: ${error.message}\n`);
    continue;
  }
  console.log("  ✔ Usuario creado.\n");
}

rl.close();
console.log("Listo. Ya pueden iniciar sesión en /login.\n");
