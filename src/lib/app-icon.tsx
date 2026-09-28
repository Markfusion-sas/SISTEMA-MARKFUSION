import { ImageResponse } from "next/og";

const BRAND = "#6d5ef0";
const BRAND_2 = "#2cb8d8";

/**
 * Ícono de la app (isotipo MF sobre el degradado de la marca) como PNG.
 * - `maskable`: el isotipo queda dentro de la zona segura (Android recorta el ícono en círculo o gota).
 * iOS redondea las esquinas por su cuenta, así que el fondo va a sangre completa.
 */
export function renderAppIcon(size: number, { maskable = false }: { maskable?: boolean } = {}) {
  const glyph = Math.round(size * (maskable ? 0.5 : 0.64));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: `linear-gradient(135deg, ${BRAND} 0%, ${BRAND_2} 100%)`,
          position: "relative",
        }}
      >
        {/* Brillo sutil en la parte superior */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "55%",
            background: "linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 100%)",
          }}
        />
        <svg width={glyph} height={glyph} viewBox="6 7 20 19" fill="none">
          <path
            d="M8.5 22.5V10.2c0-.6.7-.9 1.1-.5l5.7 6.1c.4.4 1 .4 1.4 0l5.7-6.1c.4-.4 1.1-.1 1.1.5v12.3"
            stroke="white"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="16" cy="22.4" r="1.7" fill="white" />
        </svg>
      </div>
    ),
    { width: size, height: size },
  );
}
