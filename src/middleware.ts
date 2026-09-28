import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Todo pasa por la sesión excepto los archivos estáticos y lo que el teléfono pide
    // sin sesión al instalar la app (manifiesto e íconos).
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon|manifest.webmanifest|app-icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
