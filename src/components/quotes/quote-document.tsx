/* eslint-disable @next/next/no-img-element */
import { formatDate, formatMoney } from "@/lib/format";
import { itemSubtotal, quoteTotal } from "@/lib/quotes";
import { DOC_COLORS, type BrandDoc, type QuoteDocData } from "@/components/quotes/types";

/**
 * Vista previa en HTML de la cotización. Replica el diseño del PDF
 * y siempre se ve en claro, como el papel.
 */
export function QuoteDocument({ doc, brand }: { doc: QuoteDocData; brand: BrandDoc }) {
  const total = quoteTotal(doc.items);
  const client = doc.client;
  const contactLine = [brand.nit ? `NIT ${brand.nit}` : null, brand.telefono, brand.email, brand.sitio_web]
    .filter(Boolean)
    .join("  ·  ");

  return (
    <div
      className="relative flex min-h-[700px] w-full flex-col overflow-hidden rounded-lg bg-white font-sans text-[11px] leading-relaxed shadow-float ring-1 ring-black/5"
      style={{ color: DOC_COLORS.text }}
    >
      <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${DOC_COLORS.brand}, ${DOC_COLORS.brand2})` }} />

      <div className="flex flex-1 flex-col gap-6 p-8">
        {/* Encabezado */}
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-center gap-2.5">
            {brand.logoUrl ? (
              <img src={brand.logoUrl} alt={brand.nombre_empresa} className="h-10 max-w-44 object-contain" />
            ) : (
              <>
                <DocLogoMark />
                <span className="text-lg font-bold tracking-tight">{brand.nombre_empresa}</span>
              </>
            )}
          </div>
          <div className="text-right">
            <div className="text-[10px] font-semibold tracking-[0.2em]" style={{ color: DOC_COLORS.brand }}>
              COTIZACIÓN
            </div>
            <div className="mt-0.5 font-mono text-sm font-semibold">{doc.numero ?? "MF-AAAA-MMDD"}</div>
            <div className="mt-1 text-[10px]" style={{ color: DOC_COLORS.muted }}>
              Fecha: {formatDate(doc.fecha, "long")}
              <br />
              Válida hasta: {formatDate(doc.validaHasta, "long")}
            </div>
          </div>
        </div>

        {/* Partes */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-md p-3" style={{ backgroundColor: DOC_COLORS.soft }}>
            <div className="text-[9px] font-semibold tracking-widest" style={{ color: DOC_COLORS.muted }}>
              PREPARADA PARA
            </div>
            {client ? (
              <div className="mt-1 space-y-0.5">
                <div className="text-[12px] font-semibold">{client.empresa || client.nombre}</div>
                {client.empresa && <div>{client.nombre}</div>}
                {client.email && <div style={{ color: DOC_COLORS.muted }}>{client.email}</div>}
                {client.telefono && <div style={{ color: DOC_COLORS.muted }}>{client.telefono}</div>}
                {(client.ciudad || client.pais) && (
                  <div style={{ color: DOC_COLORS.muted }}>{[client.ciudad, client.pais].filter(Boolean).join(", ")}</div>
                )}
              </div>
            ) : (
              <div className="mt-1" style={{ color: DOC_COLORS.muted }}>
                Elige un cliente
              </div>
            )}
          </div>
          <div className="rounded-md p-3" style={{ backgroundColor: DOC_COLORS.soft }}>
            <div className="text-[9px] font-semibold tracking-widest" style={{ color: DOC_COLORS.muted }}>
              DE
            </div>
            <div className="mt-1 space-y-0.5">
              <div className="text-[12px] font-semibold">{brand.nombre_empresa}</div>
              {brand.nit && <div>NIT {brand.nit}</div>}
              {brand.email && <div style={{ color: DOC_COLORS.muted }}>{brand.email}</div>}
              {brand.telefono && <div style={{ color: DOC_COLORS.muted }}>{brand.telefono}</div>}
              {(brand.direccion || brand.ciudad) && (
                <div style={{ color: DOC_COLORS.muted }}>{[brand.direccion, brand.ciudad].filter(Boolean).join(", ")}</div>
              )}
            </div>
          </div>
        </div>

        {/* Ítems */}
        <div>
          <div
            className="grid grid-cols-[24px_1fr_52px_96px_104px] gap-2 rounded-t-md px-3 py-2 text-[9px] font-semibold tracking-wider text-white"
            style={{ backgroundColor: DOC_COLORS.text }}
          >
            <span>#</span>
            <span>DESCRIPCIÓN</span>
            <span className="text-right">CANT.</span>
            <span className="text-right">VALOR UNIT.</span>
            <span className="text-right">SUBTOTAL</span>
          </div>
          {doc.items.length === 0 && (
            <div className="border-b px-3 py-4 text-center" style={{ color: DOC_COLORS.muted, borderColor: DOC_COLORS.border }}>
              Agrega ítems a la cotización
            </div>
          )}
          {doc.items.map((item, i) => (
            <div
              key={i}
              className="grid grid-cols-[24px_1fr_52px_96px_104px] gap-2 border-b px-3 py-2"
              style={{ borderColor: DOC_COLORS.border }}
            >
              <span style={{ color: DOC_COLORS.muted }}>{i + 1}</span>
              <span className="break-words whitespace-pre-wrap">{item.descripcion || "—"}</span>
              <span className="text-right tabular">{item.cantidad || 0}</span>
              <span className="text-right tabular">{formatMoney(item.valor_unitario, doc.moneda)}</span>
              <span className="text-right font-medium tabular">{formatMoney(itemSubtotal(item), doc.moneda)}</span>
            </div>
          ))}

          <div className="mt-3 flex justify-end">
            <div className="w-60 space-y-1">
              <div className="flex justify-between px-3">
                <span style={{ color: DOC_COLORS.muted }}>Subtotal</span>
                <span className="tabular">{formatMoney(total, doc.moneda)}</span>
              </div>
              <div
                className="flex items-center justify-between rounded-md px-3 py-2 text-white"
                style={{ background: `linear-gradient(90deg, ${DOC_COLORS.brand}, ${DOC_COLORS.brand2})` }}
              >
                <span className="text-[10px] font-semibold tracking-wider">TOTAL {doc.moneda}</span>
                <span className="text-[14px] font-bold tabular">{formatMoney(total, doc.moneda)}</span>
              </div>
              {doc.fee_mensual > 0 && (
                <div className="flex justify-between rounded-md border px-3 py-1.5" style={{ borderColor: DOC_COLORS.border }}>
                  <span style={{ color: DOC_COLORS.muted }}>Fee mensual</span>
                  <span className="font-semibold tabular">{formatMoney(doc.fee_mensual, doc.moneda)}/mes</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Condiciones */}
        {doc.condiciones && (
          <div>
            <div className="text-[9px] font-semibold tracking-widest" style={{ color: DOC_COLORS.muted }}>
              CONDICIONES
            </div>
            <p className="mt-1 whitespace-pre-wrap">{doc.condiciones}</p>
          </div>
        )}

        {/* Pie */}
        <div className="mt-auto border-t pt-3 text-center text-[9px]" style={{ borderColor: DOC_COLORS.border, color: DOC_COLORS.muted }}>
          <div className="font-medium" style={{ color: DOC_COLORS.text }}>
            Gracias por confiar en {brand.nombre_empresa}
          </div>
          {contactLine && <div className="mt-0.5">{contactLine}</div>}
        </div>
      </div>
    </div>
  );
}

function DocLogoMark() {
  return (
    <svg viewBox="0 0 32 32" className="size-9" aria-hidden>
      <defs>
        <linearGradient id="doc-mf" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={DOC_COLORS.brand} />
          <stop offset="1" stopColor={DOC_COLORS.brand2} />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#doc-mf)" />
      <path
        d="M8.5 22.5V10.2c0-.6.7-.9 1.1-.5l5.7 6.1c.4.4 1 .4 1.4 0l5.7-6.1c.4-.4 1.1-.1 1.1.5v12.3"
        stroke="white"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="16" cy="22.4" r="1.7" fill="white" />
    </svg>
  );
}
