import type { MetadataRoute } from "next";

/** Manifiesto para instalar MarkFusion OS como app (Android, escritorio y "Agregar a Inicio" en iPhone). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "MarkFusion OS",
    short_name: "MarkFusion",
    description: "Sistema interno de gestión de MarkFusion: clientes, proyectos, tareas, reuniones, cotizaciones y finanzas.",
    lang: "es-CO",
    dir: "ltr",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#0b0b0f",
    theme_color: "#0b0b0f",
    categories: ["business", "productivity", "finance"],
    icons: [
      { src: "/app-icons/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/app-icons/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/app-icons/maskable-512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Mi día", url: "/tareas?vista=mi-dia" },
      { name: "Finanzas", url: "/finanzas" },
      { name: "Calendario", url: "/calendario" },
    ],
  };
}
