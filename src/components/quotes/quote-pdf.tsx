/* eslint-disable jsx-a11y/alt-text */
import {
  Circle,
  Defs,
  Document,
  Image,
  LinearGradient,
  Page,
  Path,
  Rect,
  Stop,
  StyleSheet,
  Svg,
  Text,
  View,
} from "@react-pdf/renderer";

import { formatDate, formatMoney } from "@/lib/format";
import { itemSubtotal, quoteTotal } from "@/lib/quotes";
import { DOC_COLORS as C, type BrandDoc, type QuoteDocData } from "@/components/quotes/types";

const s = StyleSheet.create({
  page: {
    paddingTop: 0,
    paddingBottom: 56,
    paddingHorizontal: 0,
    fontFamily: "Helvetica",
    fontSize: 9.5,
    color: C.text,
    lineHeight: 1.45,
  },
  topBar: { height: 6, flexDirection: "row" },
  body: { paddingHorizontal: 40, paddingTop: 28 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 },
  brandRow: { flexDirection: "row", alignItems: "center" },
  brandName: { fontSize: 16, fontFamily: "Helvetica-Bold", marginLeft: 8 },
  logo: { height: 38, maxWidth: 170, objectFit: "contain" },
  eyebrow: { fontSize: 8, letterSpacing: 2, fontFamily: "Helvetica-Bold", color: C.brand, textAlign: "right" },
  numero: { fontSize: 13, fontFamily: "Courier-Bold", textAlign: "right", marginTop: 2 },
  meta: { fontSize: 8.5, color: C.muted, textAlign: "right", marginTop: 3 },
  parties: { flexDirection: "row", marginBottom: 20 },
  party: { flex: 1, backgroundColor: C.soft, borderRadius: 4, padding: 10 },
  partyGap: { width: 12 },
  label: { fontSize: 7, letterSpacing: 1.5, fontFamily: "Helvetica-Bold", color: C.muted, marginBottom: 4 },
  partyName: { fontSize: 11, fontFamily: "Helvetica-Bold", marginBottom: 1 },
  mutedText: { color: C.muted },
  tableHead: {
    flexDirection: "row",
    backgroundColor: C.text,
    color: "#ffffff",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.8,
  },
  row: {
    flexDirection: "row",
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  cNum: { width: 20, color: C.muted },
  cDesc: { flex: 1, paddingRight: 8 },
  cQty: { width: 40, textAlign: "right" },
  cUnit: { width: 86, textAlign: "right" },
  cSub: { width: 92, textAlign: "right" },
  totals: { alignItems: "flex-end", marginTop: 10 },
  totalsBox: { width: 220 },
  subtotalRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 8, marginBottom: 4 },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 8,
    color: "#ffffff",
  },
  totalLabel: { fontSize: 8, fontFamily: "Helvetica-Bold", letterSpacing: 1 },
  totalValue: { fontSize: 13, fontFamily: "Helvetica-Bold" },
  feeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 4,
    paddingVertical: 5,
    paddingHorizontal: 8,
    marginTop: 6,
  },
  conditions: { marginTop: 22 },
  footer: {
    position: "absolute",
    bottom: 22,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 8,
    fontSize: 7.5,
    color: C.muted,
    textAlign: "center",
  },
  footerStrong: { color: C.text, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  pageNumber: { position: "absolute", bottom: 22, right: 40, fontSize: 7.5, color: C.muted },
});

function GradientBar() {
  return (
    <Svg style={{ width: "100%", height: 6 }} viewBox="0 0 600 6" preserveAspectRatio="none">
      <Defs>
        <LinearGradient id="bar" x1="0" y1="0" x2="600" y2="0" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={C.brand} />
          <Stop offset="1" stopColor={C.brand2} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="600" height="6" fill="url(#bar)" />
    </Svg>
  );
}

function LogoMark() {
  return (
    <Svg style={{ width: 30, height: 30 }} viewBox="0 0 32 32">
      <Defs>
        <LinearGradient id="mf" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={C.brand} />
          <Stop offset="1" stopColor={C.brand2} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="32" height="32" rx="9" ry="9" fill="url(#mf)" />
      <Path
        d="M8.5 22.5V10.2c0-.6.7-.9 1.1-.5l5.7 6.1c.4.4 1 .4 1.4 0l5.7-6.1c.4-.4 1.1-.1 1.1.5v12.3"
        stroke="#ffffff"
        strokeWidth={2.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Circle cx="16" cy="22.4" r="1.7" fill="#ffffff" />
    </Svg>
  );
}

/** Documento PDF de la cotización con la marca MarkFusion. */
export function QuotePdfDocument({ doc, brand }: { doc: QuoteDocData; brand: BrandDoc }) {
  const total = quoteTotal(doc.items);
  const client = doc.client;
  const clientName = client ? client.empresa || client.nombre : "Cliente";
  const contactLine = [brand.nit ? `NIT ${brand.nit}` : null, brand.telefono, brand.email, brand.sitio_web]
    .filter(Boolean)
    .join("   ·   ");

  return (
    <Document
      title={`Cotización ${doc.numero ?? ""} · ${clientName}`}
      author={brand.nombre_empresa}
      creator="MarkFusion OS"
      language="es"
    >
      <Page size="A4" style={s.page}>
        <View style={s.topBar} fixed>
          <GradientBar />
        </View>

        <View style={s.body}>
          {/* Encabezado */}
          <View style={s.header}>
            <View style={s.brandRow}>
              {brand.logoUrl ? (
                <Image src={brand.logoUrl} style={s.logo} />
              ) : (
                <>
                  <LogoMark />
                  <Text style={s.brandName}>{brand.nombre_empresa}</Text>
                </>
              )}
            </View>
            <View>
              <Text style={s.eyebrow}>COTIZACIÓN</Text>
              <Text style={s.numero}>{doc.numero ?? "Borrador"}</Text>
              <Text style={s.meta}>Fecha: {formatDate(doc.fecha, "long")}</Text>
              <Text style={[s.meta, { marginTop: 0 }]}>Válida hasta: {formatDate(doc.validaHasta, "long")}</Text>
            </View>
          </View>

          {/* Partes */}
          <View style={s.parties}>
            <View style={s.party}>
              <Text style={s.label}>PREPARADA PARA</Text>
              <Text style={s.partyName}>{clientName}</Text>
              {client?.empresa ? <Text>{client.nombre}</Text> : null}
              {client?.email ? <Text style={s.mutedText}>{client.email}</Text> : null}
              {client?.telefono ? <Text style={s.mutedText}>{client.telefono}</Text> : null}
              {client && (client.ciudad || client.pais) ? (
                <Text style={s.mutedText}>{[client.ciudad, client.pais].filter(Boolean).join(", ")}</Text>
              ) : null}
            </View>
            <View style={s.partyGap} />
            <View style={s.party}>
              <Text style={s.label}>DE</Text>
              <Text style={s.partyName}>{brand.nombre_empresa}</Text>
              {brand.nit ? <Text>NIT {brand.nit}</Text> : null}
              {brand.email ? <Text style={s.mutedText}>{brand.email}</Text> : null}
              {brand.telefono ? <Text style={s.mutedText}>{brand.telefono}</Text> : null}
              {brand.direccion || brand.ciudad ? (
                <Text style={s.mutedText}>{[brand.direccion, brand.ciudad].filter(Boolean).join(", ")}</Text>
              ) : null}
            </View>
          </View>

          {/* Ítems */}
          <View style={s.tableHead} fixed>
            <Text style={s.cNum}>#</Text>
            <Text style={s.cDesc}>DESCRIPCIÓN</Text>
            <Text style={s.cQty}>CANT.</Text>
            <Text style={s.cUnit}>VALOR UNIT.</Text>
            <Text style={s.cSub}>SUBTOTAL</Text>
          </View>
          {doc.items.map((item, i) => (
            <View key={i} style={s.row} wrap={false}>
              <Text style={s.cNum}>{i + 1}</Text>
              <Text style={s.cDesc}>{item.descripcion}</Text>
              <Text style={s.cQty}>{String(item.cantidad)}</Text>
              <Text style={s.cUnit}>{formatMoney(item.valor_unitario, doc.moneda)}</Text>
              <Text style={[s.cSub, { fontFamily: "Helvetica-Bold" }]}>{formatMoney(itemSubtotal(item), doc.moneda)}</Text>
            </View>
          ))}

          {/* Totales */}
          <View style={s.totals} wrap={false}>
            <View style={s.totalsBox}>
              <View style={s.subtotalRow}>
                <Text style={s.mutedText}>Subtotal</Text>
                <Text>{formatMoney(total, doc.moneda)}</Text>
              </View>
              <View style={[s.totalRow, { backgroundColor: C.brand }]}>
                <Text style={s.totalLabel}>TOTAL {doc.moneda}</Text>
                <Text style={s.totalValue}>{formatMoney(total, doc.moneda)}</Text>
              </View>
              {doc.fee_mensual > 0 ? (
                <View style={s.feeRow}>
                  <Text style={s.mutedText}>Fee mensual</Text>
                  <Text style={{ fontFamily: "Helvetica-Bold" }}>{formatMoney(doc.fee_mensual, doc.moneda)}/mes</Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Condiciones */}
          {doc.condiciones ? (
            <View style={s.conditions} wrap={false}>
              <Text style={s.label}>CONDICIONES</Text>
              <Text>{doc.condiciones}</Text>
            </View>
          ) : null}
        </View>

        <View style={s.footer} fixed>
          <Text style={s.footerStrong}>Gracias por confiar en {brand.nombre_empresa}</Text>
          {contactLine ? <Text>{contactLine}</Text> : null}
        </View>
        <Text
          style={s.pageNumber}
          fixed
          render={({ pageNumber, totalPages }) => (totalPages > 1 ? `${pageNumber} / ${totalPages}` : "")}
        />
      </Page>
    </Document>
  );
}
