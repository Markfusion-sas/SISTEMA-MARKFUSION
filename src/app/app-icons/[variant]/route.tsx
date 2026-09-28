import { renderAppIcon } from "@/lib/app-icon";

// Íconos del manifiesto (Android y escritorio). Se generan una vez en el build.
const VARIANTS: Record<string, { size: number; maskable: boolean }> = {
  "192": { size: 192, maskable: false },
  "512": { size: 512, maskable: false },
  "maskable-512": { size: 512, maskable: true },
};

export const dynamic = "force-static";

export function generateStaticParams() {
  return Object.keys(VARIANTS).map((variant) => ({ variant }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ variant: string }> }) {
  const { variant } = await params;
  const config = VARIANTS[variant];
  if (!config) return new Response("No encontrado", { status: 404 });
  return renderAppIcon(config.size, { maskable: config.maskable });
}
