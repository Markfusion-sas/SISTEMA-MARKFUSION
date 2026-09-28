/**
 * Paleta categórica de las gráficas (orden fijo, validada para daltonismo con
 * scripts de dataviz: ΔE CVD adyacente ≥ 8 y visión normal ≥ 15 en claro y oscuro).
 * El modo oscuro usa los mismos tonos con pasos ajustados a la superficie oscura.
 */
export const SERIES_LIGHT = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948"];
export const SERIES_DARK = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300", "#9085e9", "#e66767"];

/** Gris neutro para "Otros" (no compite con los tonos categóricos). */
export const NEUTRAL = { light: "#8a8a94", dark: "#6e6e78" };

/**
 * Colores de estado (reservados: nunca se usan como "serie 4"). Siempre van con
 * ícono y texto, nunca solos. Mismos pasos en claro y oscuro.
 */
export const STATUS = {
  good: "#0ca30c",
  warning: "#fab219",
  serious: "#ec835a",
  critical: "#d03b3b",
};

/** Tinta y líneas de las gráficas por tema. */
export const CHART_INK = {
  light: { grid: "#ececef", axis: "#8a8a94", text: "#15151c", muted: "#6b6b78", surface: "#ffffff", cursor: "rgba(21,21,28,0.05)" },
  dark: { grid: "#2a2a30", axis: "#7c7c86", text: "#f4f4f6", muted: "#a1a1ab", surface: "#19191d", cursor: "rgba(255,255,255,0.05)" },
};

const LIGHT_TO_DARK = new Map(SERIES_LIGHT.map((hex, i) => [hex, SERIES_DARK[i]]));

/**
 * Color de una entidad (p. ej. una categoría) en el tema actual: si es uno de
 * los pasos claros de la paleta, usa su par oscuro; si es un color personalizado, se respeta.
 */
export function themedColor(hex: string, dark: boolean) {
  const key = hex.toLowerCase();
  if (key === NEUTRAL.light) return dark ? NEUTRAL.dark : NEUTRAL.light;
  return dark ? (LIGHT_TO_DARK.get(key) ?? hex) : hex;
}
