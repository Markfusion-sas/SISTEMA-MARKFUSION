import type { Moneda } from "@/types/database";

export const TIMEZONE = "America/Bogota";
export const LOCALE = "es-CO";

const integerFmt = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 });
const decimalFmt = new Intl.NumberFormat(LOCALE, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const compactFmt = new Intl.NumberFormat(LOCALE, { notation: "compact", maximumFractionDigits: 1 });

/**
 * Formatea dinero: COP → "$1.500.000", USD → "US$1.500,50".
 * Con `compact` → "$1,5 M" (útil en gráficas).
 */
export function formatMoney(
  amount: number | string | null | undefined,
  moneda: Moneda = "COP",
  opts: { compact?: boolean; signed?: boolean } = {},
) {
  const value = Number(amount ?? 0);
  const abs = Math.abs(value);
  const prefix = moneda === "USD" ? "US$" : "$";
  const body = opts.compact
    ? compactFmt.format(abs)
    : moneda === "USD"
      ? decimalFmt.format(abs)
      : integerFmt.format(Math.round(abs));
  const sign = value < 0 ? "-" : opts.signed && value > 0 ? "+" : "";
  return `${sign}${prefix}${body}`;
}

export function formatNumber(value: number) {
  return integerFmt.format(value);
}

export function formatPercent(value: number, opts: { signed?: boolean } = {}) {
  const fmt = new Intl.NumberFormat(LOCALE, { style: "percent", maximumFractionDigits: 1 });
  const text = fmt.format(value);
  return opts.signed && value > 0 ? `+${text}` : text;
}

/**
 * Convierte una fecha "YYYY-MM-DD" en Date sin corrimiento de zona:
 * se ancla al mediodía UTC, que en Bogotá (UTC-5) cae el mismo día.
 */
export function parseDateOnly(value: string) {
  return new Date(`${value.slice(0, 10)}T12:00:00Z`);
}

function toDate(value: string | Date) {
  if (value instanceof Date) return value;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? parseDateOnly(value) : new Date(value);
}

/** Hoy en Bogotá como "YYYY-MM-DD". */
export function todayISO(date: Date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Suma días a una fecha "YYYY-MM-DD". */
export function addDaysISO(iso: string, days: number) {
  const d = parseDateOnly(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Suma meses a un mes "YYYY-MM". */
export function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Diferencia en días entre dos fechas "YYYY-MM-DD" (b - a). */
export function diffDaysISO(a: string, b: string) {
  return Math.round((parseDateOnly(b).getTime() - parseDateOnly(a).getTime()) / 86_400_000);
}

type DateStyle = "short" | "medium" | "long" | "full" | "weekday" | "month" | "monthYear";

const DATE_OPTIONS: Record<DateStyle, Intl.DateTimeFormatOptions> = {
  short: { day: "2-digit", month: "2-digit", year: "numeric" },
  medium: { day: "numeric", month: "short", year: "numeric" },
  long: { day: "numeric", month: "long", year: "numeric" },
  full: { weekday: "long", day: "numeric", month: "long", year: "numeric" },
  weekday: { weekday: "short", day: "numeric", month: "short" },
  month: { day: "numeric", month: "short" },
  monthYear: { month: "long", year: "numeric" },
};

export function formatDate(value: string | Date | null | undefined, style: DateStyle = "medium") {
  if (!value) return "—";
  const text = new Intl.DateTimeFormat(LOCALE, { ...DATE_OPTIONS[style], timeZone: TIMEZONE }).format(toDate(value));
  return text.replace(/\./g, "");
}

export function formatTime(value: string | Date | null | undefined) {
  if (!value) return "";
  return new Intl.DateTimeFormat(LOCALE, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: TIMEZONE,
  })
    .format(toDate(value))
    .replace(/\s?a\.\s?m\./i, " a. m.")
    .replace(/\s?p\.\s?m\./i, " p. m.");
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return "—";
  return `${formatDate(value, "medium")} · ${formatTime(value)}`;
}

/** "Hoy", "Mañana", "Ayer", "En 3 días", "Hace 2 días". */
export function formatRelativeDay(iso: string | null | undefined) {
  if (!iso) return "—";
  const diff = diffDaysISO(todayISO(), iso.slice(0, 10));
  if (diff === 0) return "Hoy";
  if (diff === 1) return "Mañana";
  if (diff === -1) return "Ayer";
  if (diff > 1 && diff <= 6) return `En ${diff} días`;
  if (diff < -1 && diff >= -6) return `Hace ${Math.abs(diff)} días`;
  return formatDate(iso, "month");
}

/** Saludo según la hora en Bogotá. */
export function greeting(date: Date = new Date()) {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: TIMEZONE }).format(date),
  );
  if (hour < 12) return "Buenos días";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

/**
 * Partes de fecha y hora en Bogotá de un instante ISO: { date: "YYYY-MM-DD", time: "HH:mm" }.
 */
export function bogotaParts(value: string | Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(toDate(value));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}` };
}

/** Fecha + hora de Bogotá → ISO con offset (Colombia no tiene horario de verano: siempre -05:00). */
export function bogotaISO(date: string, time: string) {
  return `${date}T${time}:00-05:00`;
}

/** Hora "de pared" de Bogotá sin zona ("YYYY-MM-DDTHH:mm:00"), usada por el calendario. */
export function bogotaFloating(value: string | Date) {
  const { date, time } = bogotaParts(value);
  return `${date}T${time}:00`;
}

/** Duración legible entre dos instantes: "45 min", "1 h 30 min". */
export function formatDuration(start: string, end: string | null) {
  if (!end) return "";
  const minutes = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
  if (minutes <= 0) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
