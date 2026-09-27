"use client";

import Image from "next/image";
import {
  ArrowDownToLine,
  CalendarDays,
  Check,
  ChevronRight,
  LogOut,
  LockKeyhole,
  FilePlus2,
  FileText,
  History,
  ImagePlus,
  LoaderCircle,
  Plus,
  Printer,
  Save,
  Search,
  Shapes,
  Trash2,
  CircleAlert,
} from "lucide-react";
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";

type InvoiceItemDraft = {
  id: string;
  description: string;
  unitPrice: string;
  quantity: string;
};

type InvoiceDraft = {
  headerTitle: string;
  brandName: string;
  issuerTaxId: string;
  issuerAddress: string;
  logoDataUrl: string;
  invoiceNumber: string;
  invoiceDate: string;
  customerName: string;
  customerNumber: string;
  customerAddress: string;
  customerCity: string;
  customerPhone: string;
  servicePeriod: string;
  paymentTerms: string;
  observations: string;
  contactEmail: string;
  contactPhone: string;
  contactWebsite: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  discountPercent: string;
  items: InvoiceItemDraft[];
};

type SavedInvoice = {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  customerName: string;
  totalCents: number;
  itemCount: number;
};

type InvoiceRecord = Omit<InvoiceDraft, "items" | "discountPercent"> & {
  discountPercent: number;
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  items: Array<{
    id: string;
    description: string;
    unitPriceCents: number;
    quantity: number;
  }>;
};

type PageView = "editor" | "history" | "detail";
const LAST_LOGO_STORAGE_KEY = "cuenta-clara:last-logo";
const BUSINESS_PREFERENCES_KEY = "cuenta-clara:business-preferences";
const BUSINESS_PREFERENCE_FIELDS = [
  "headerTitle",
  "brandName",
  "issuerTaxId",
  "issuerAddress",
  "contactEmail",
  "contactPhone",
  "contactWebsite",
  "bankName",
  "accountName",
  "accountNumber",
] as const;

type BusinessPreferences = Pick<InvoiceDraft, typeof BUSINESS_PREFERENCE_FIELDS[number] | "logoDataUrl">;

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createDraft(): InvoiceDraft {
  const date = localDateString();
  return {
    headerTitle: "Cuenta de cobro",
    brandName: "L'M CONFECCIONES",
    issuerTaxId: "",
    issuerAddress: "",
    logoDataUrl: "",
    invoiceNumber: `CC-${date.replaceAll("-", "")}-001`,
    invoiceDate: date,
    customerName: "",
    customerNumber: "",
    customerAddress: "",
    customerCity: "",
    customerPhone: "",
    servicePeriod: "",
    paymentTerms: "",
    observations: "",
    contactEmail: "hola@tumarca.com",
    contactPhone: "",
    contactWebsite: "www.tumarca.com",
    bankName: "Banco Ejemplo",
    accountName: "Nombre del titular",
    accountNumber: "",
    discountPercent: "0",
    items: [
      { id: "initial-item-1", description: "Servicio profesional", unitPrice: "120000", quantity: "1" },
      { id: "initial-item-2", description: "Consultoría", unitPrice: "85000", quantity: "1" },
      { id: "initial-item-3", description: "Soporte adicional", unitPrice: "45000", quantity: "1" },
    ],
  };
}

function formatMoney(cents: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function amountInWords(cents: number) {
  const amount = Math.round(cents / 100);
  const small = ["cero", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez", "once", "doce", "trece", "catorce", "quince", "dieciséis", "diecisiete", "dieciocho", "diecinueve", "veinte", "veintiuno", "veintidós", "veintitrés", "veinticuatro", "veinticinco", "veintiséis", "veintisiete", "veintiocho", "veintinueve"];
  const tens = ["", "", "", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"];
  const hundreds = ["", "ciento", "doscientos", "trescientos", "cuatrocientos", "quinientos", "seiscientos", "setecientos", "ochocientos", "novecientos"];

  function groupWords(value: number): string {
    if (value < 30) return small[value];
    if (value < 100) return value % 10 ? `${tens[Math.floor(value / 10)]} y ${small[value % 10]}` : tens[value / 10];
    if (value === 100) return "cien";
    return value % 100 ? `${hundreds[Math.floor(value / 100)]} ${groupWords(value % 100)}` : hundreds[value / 100];
  }

  function groupBeforeScale(value: number) {
    return groupWords(value).replace(/veintiuno$/, "veintiún").replace(/uno$/, "un");
  }

  if (!Number.isSafeInteger(amount) || amount < 0) return "";
  if (amount === 0) return "CERO PESOS M/CTE";
  const names = ["", "mil", "millón", "mil millones", "billón", "mil billones"];
  const groups: number[] = [];
  for (let remaining = amount; remaining > 0; remaining = Math.floor(remaining / 1000)) groups.push(remaining % 1000);
  const words = groups.map((group, index) => {
    if (!group) return "";
    if (index === 0) return groupWords(group).replace(/veintiuno$/, "veintiún").replace(/uno$/, "un");
    if (index === 1) return group === 1 ? "mil" : `${groupBeforeScale(group)} mil`;
    const scale = names[index] ?? "";
    if (index % 2 === 0) return group === 1 ? `un ${scale}` : `${groupBeforeScale(group)} ${scale}${scale === "millón" || scale === "billón" ? "es" : ""}`;
    return group === 1 ? scale : `${groupBeforeScale(group)} ${scale}`;
  }).filter(Boolean).reverse().join(" ");
  return `${words.toUpperCase()} PESOS M/CTE`;
}

function dateLabel(date: string) {
  if (!date) return "";
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00.000Z`));
}

async function requestNextInvoiceNumber(date: string) {
  const query = new URLSearchParams({ nextNumberFor: date });
  const response = await fetch(`/api/invoices?${query.toString()}`);
  const result = await response.json() as { invoiceNumber?: string; error?: string };
  if (!response.ok || !result.invoiceNumber) throw new Error(result.error ?? "No se pudo obtener el siguiente consecutivo.");
  return result.invoiceNumber;
}

function dateDocumentLabel(date: string) {
  if (!date) return "XX/XX/XXXX";
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00.000Z`));
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  min,
  max,
  readOnly = false,
  fieldId,
  invalid = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  min?: number;
  max?: number;
  readOnly?: boolean;
  fieldId?: string;
  invalid?: boolean;
}) {
  return (
    <label className={invalid ? "field field-invalid" : "field"}>
      <span>{label}</span>
      <input
        className={invalid ? "control control-invalid" : "control"}
        data-field-id={fieldId}
        aria-invalid={invalid}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        min={min}
        max={max}
        readOnly={readOnly}
      />
    </label>
  );
}

function InvoiceDocument({ invoice }: { invoice: InvoiceRecord }) {
  const issuerContact = [invoice.contactPhone, invoice.contactEmail, invoice.contactWebsite].filter(Boolean).join(" | ");

  return (
    <article className="document-paper">
      {invoice.logoDataUrl && <div className="document-watermark" aria-hidden="true" style={{ backgroundImage: `url("${invoice.logoDataUrl}")` }} />}
      <header className="doc-banner">
        <div className="doc-brand">
          <div className="doc-logo">
            {invoice.logoDataUrl ? <Image src={invoice.logoDataUrl} alt="Logo" width={72} height={72} unoptimized /> : <Shapes size={48} strokeWidth={1.3} />}
          </div>
          <div className="doc-issuer">
            <strong>{invoice.brandName || "Tu marca"}</strong>
            <span>NIT / C.C.: {invoice.issuerTaxId || "—"}</span>
            {invoice.issuerAddress && <span>{invoice.issuerAddress}</span>}
            {issuerContact && <span>{issuerContact}</span>}
          </div>
        </div>
        <div className="doc-title-wrap">
          <h2>{invoice.headerTitle || "CUENTA DE COBRO"}</h2>
          <div className="doc-meta"><span>N°</span><strong>{invoice.invoiceNumber || "XXXX"}</strong></div>
          <div className="doc-meta"><span>Fecha:</span><strong>{dateDocumentLabel(invoice.invoiceDate)}</strong></div>
        </div>
      </header>

      <div className="doc-content">
        <section className="doc-client">
          <h3>INFORMACIÓN DEL CLIENTE</h3>
          <dl className="doc-client-grid">
            <div><dt>Nombre</dt><dd>{invoice.customerName || "—"}</dd></div>
            <div><dt>C.C. / NIT</dt><dd>{invoice.customerNumber || "—"}</dd></div>
            <div><dt>Dirección</dt><dd>{invoice.customerAddress || "—"}</dd></div>
            <div><dt>Ciudad</dt><dd>{invoice.customerCity || "—"}</dd></div>
            <div><dt>Teléfono</dt><dd>{invoice.customerPhone || "—"}</dd></div>
          </dl>
        </section>

        <table className="doc-table">
          <thead><tr><th>DESCRIPCIÓN</th><th>PRECIO</th><th>CANT.</th><th>TOTAL</th></tr></thead>
          <tbody>{invoice.items.map((item) => <tr key={item.id}><td>{item.description}</td><td>{formatMoney(item.unitPriceCents)}</td><td>{item.quantity}</td><td>{formatMoney(item.unitPriceCents * item.quantity)}</td></tr>)}</tbody>
          <tfoot>
            <tr><td colSpan={3}>Subtotal</td><td>{formatMoney(invoice.subtotalCents)}</td></tr>
            {invoice.discountPercent > 0 && <tr><td colSpan={3}>Descuento ({invoice.discountPercent}%)</td><td>-{formatMoney(invoice.discountCents)}</td></tr>}
            <tr className="doc-grand-total"><th colSpan={3}>TOTAL</th><th>{formatMoney(invoice.totalCents)}</th></tr>
          </tfoot>
        </table>
        <p className="doc-total-words"><strong>SON:</strong> {amountInWords(invoice.totalCents)}</p>

        <section className="doc-service-terms">
          <div><h3>PERÍODO / FECHA DEL SERVICIO</h3><p>{invoice.servicePeriod || "—"}</p></div>
          <div><h3>FORMA Y PLAZO DE PAGO</h3><p>{invoice.paymentTerms || "—"}</p></div>
        </section>

        <section className="doc-payment-block">
          <h3>INFORMACIÓN DE PAGO</h3>
          <dl><div><dt>Banco</dt><dd>{invoice.bankName || "—"}</dd></div><div><dt>Titular</dt><dd>{invoice.accountName || "—"}</dd></div><div><dt>Número de cuenta</dt><dd>{invoice.accountNumber || "—"}</dd></div></dl>
        </section>

        <section className="doc-observations">
          <h3>OBSERVACIONES</h3>
          <p>{invoice.observations || "—"}</p>
        </section>

        <footer className="doc-footer">
          <div className="doc-contact"><h3>CONTACTO</h3>{invoice.contactPhone && <span>{invoice.contactPhone}</span>}{invoice.contactEmail && <span>{invoice.contactEmail}</span>}{invoice.contactWebsite && <span>{invoice.contactWebsite}</span>}</div>
          <div className="doc-signature"><h3>FIRMA</h3><div className="signature-rule" /><strong>{invoice.brandName || "Tu marca"}</strong><span>Prestador de servicios</span></div>
        </footer>
      </div>
    </article>
  );
}

export default function InvoiceWorkspace() {
  const [draft, setDraft] = useState<InvoiceDraft>(createDraft);
  const [lastLogoDataUrl, setLastLogoDataUrl] = useState("");
  const [businessPreferences, setBusinessPreferences] = useState<BusinessPreferences>(() => {
    const initial = createDraft();
    return {
      headerTitle: initial.headerTitle,
      brandName: initial.brandName,
      issuerTaxId: initial.issuerTaxId,
      issuerAddress: initial.issuerAddress,
      logoDataUrl: initial.logoDataUrl,
      contactEmail: initial.contactEmail,
      contactPhone: initial.contactPhone,
      contactWebsite: initial.contactWebsite,
      bankName: initial.bankName,
      accountName: initial.accountName,
      accountNumber: initial.accountNumber,
    };
  });
  const [authenticatedUser, setAuthenticatedUser] = useState("");
  const [authLoading, setAuthLoading] = useState(true);
  const [view, setView] = useState<PageView>("editor");
  const [savedInvoices, setSavedInvoices] = useState<SavedInvoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<(InvoiceRecord & { id: string }) | null>(null);
  const [rangeStart, setRangeStart] = useState(() => `${localDateString().slice(0, 7)}-01`);
  const [rangeEnd, setRangeEnd] = useState(localDateString);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState<"success" | "error">("success");
  const [invalidFields, setInvalidFields] = useState<string[]>([]);

  const subtotalCents = draft.items.reduce((sum, item) => {
    const priceCents = Math.round(Math.max(0, Number(item.unitPrice) || 0) * 100);
    const quantity = Math.max(1, Number.parseInt(item.quantity, 10) || 1);
    return sum + priceCents * quantity;
  }, 0);
  const discountPercent = Math.min(100, Math.max(0, Number(draft.discountPercent) || 0));
  const discountCents = Math.round(subtotalCents * (discountPercent / 100));
  const totalCents = subtotalCents - discountCents;

  function clearInvalidField(fieldId: string) {
    const remaining = invalidFields.filter((invalidField) => invalidField !== fieldId);
    setInvalidFields(remaining);
    if (remaining.length === 0) setStatus("");
    else if (statusType === "error") setStatus("Aún hay campos obligatorios por completar.");
  }

  function restoreBusinessPreferences() {
    try {
      const stored = window.localStorage.getItem(BUSINESS_PREFERENCES_KEY);
      const saved = stored ? JSON.parse(stored) as Partial<BusinessPreferences> : {};
      const logo = typeof saved.logoDataUrl === "string"
        ? saved.logoDataUrl
        : window.localStorage.getItem(LAST_LOGO_STORAGE_KEY) ?? "";
      const restored: Partial<BusinessPreferences> = {};
      BUSINESS_PREFERENCE_FIELDS.forEach((field) => {
        if (typeof saved[field] === "string") restored[field] = saved[field];
      });
      restored.logoDataUrl = logo;
      setBusinessPreferences((current) => ({ ...current, ...restored }));
      if (logo) setLastLogoDataUrl(logo);
      setDraft((current) => ({ ...current, ...restored }));
    } catch {
      setStatusType("error");
      setStatus("No se pudieron recuperar los datos del negocio guardados en este navegador.");
    }
  }

  async function loadRecentInvoices() {
    setLoadingHistory(true);
    try {
      const response = await fetch("/api/invoices");
      if (response.ok) setSavedInvoices(await response.json());
      else if (response.status !== 401) throw new Error("No fue posible consultar las cuentas guardadas.");
    } catch {
      setStatusType("error");
      setStatus("No fue posible conectar con la base de datos.");
    } finally {
      setLoadingHistory(false);
    }
  }

  async function refreshInvoiceNumber(date: string) {
    try {
      const invoiceNumber = await requestNextInvoiceNumber(date);
      setDraft((current) => current.invoiceDate === date ? { ...current, invoiceNumber } : current);
    } catch {
      setStatusType("error");
      setStatus("No se pudo consultar el siguiente consecutivo.");
    }
  }

  async function signIn(username: string, password: string) {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ username, password }),
      });
      const result = await response.json() as { username?: string; error?: string };
      if (!response.ok) return result.error ?? "No se pudo iniciar sesión.";
      setAuthenticatedUser(result.username ?? username);
      restoreBusinessPreferences();
      await loadRecentInvoices();
      await refreshInvoiceNumber(draft.invoiceDate);
      return null;
    } catch {
      return "No se pudo conectar con el servicio de inicio de sesión.";
    }
  }

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    setAuthenticatedUser("");
    setSavedInvoices([]);
    setSelectedInvoice(null);
    setDraft({ ...createDraft(), ...businessPreferences, customerName: "", customerNumber: "", customerAddress: "" });
    setView("editor");
    setStatus("");
  }

  useEffect(() => {
    let active = true;
    fetch("/api/auth/session")
      .then(async (response) => {
        if (!response.ok) return;
        const session = await response.json() as { authenticated: boolean; username?: string };
        if (!session.authenticated || !session.username) return;
        if (!active) return;
        setAuthenticatedUser(session.username);
        restoreBusinessPreferences();
        await loadRecentInvoices();
        const invoiceDate = localDateString();
        const invoiceNumber = await requestNextInvoiceNumber(invoiceDate);
        if (!active) return;
        setDraft((current) => current.invoiceDate === invoiceDate ? { ...current, invoiceNumber } : current);
      })
      .catch(() => undefined)
      .finally(() => { if (active) setAuthLoading(false); });
    return () => { active = false; };
  }, []);

  function updateField(field: keyof Omit<InvoiceDraft, "items">, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
    if (BUSINESS_PREFERENCE_FIELDS.includes(field as typeof BUSINESS_PREFERENCE_FIELDS[number])) {
      const next = { ...businessPreferences, [field]: value };
      setBusinessPreferences(next);
      try {
        window.localStorage.setItem(BUSINESS_PREFERENCES_KEY, JSON.stringify(next));
      } catch {
        setStatusType("error");
        setStatus("No se pudieron guardar las preferencias del negocio en este navegador.");
      }
    }
    clearInvalidField(field);
    if (field === "invoiceDate" && value) void refreshInvoiceNumber(value);
  }

  function updateItem(id: string, field: keyof Omit<InvoiceItemDraft, "id">, value: string) {
    setDraft((current) => ({
      ...current,
      items: current.items.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    }));
    clearInvalidField(`item-${id}-${field}`);
  }

  function addItem() {
    setDraft((current) => ({
      ...current,
      items: [...current.items, { id: crypto.randomUUID(), description: "", unitPrice: "0", quantity: "1" }],
    }));
  }

  function removeItem(id: string) {
    setDraft((current) => ({ ...current, items: current.items.filter((item) => item.id !== id) }));
  }

  function handleLogoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setStatus("Selecciona un archivo de imagen válido.");
      return;
    }
    if (file.size > 1_500_000) {
      setStatus("El logo debe pesar menos de 1,5 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setLastLogoDataUrl(reader.result);
        let persisted = true;
        try {
          window.localStorage.setItem(LAST_LOGO_STORAGE_KEY, reader.result);
          const preferences = { ...businessPreferences, logoDataUrl: reader.result };
          window.localStorage.setItem(BUSINESS_PREFERENCES_KEY, JSON.stringify(preferences));
          setBusinessPreferences(preferences);
        } catch {
          persisted = false;
        }
        updateField("logoDataUrl", reader.result);
        setStatusType(persisted ? "success" : "error");
        setStatus(persisted
          ? "Logo actualizado. Se conservará para tus próximas cuentas."
          : "Logo actualizado, pero el navegador no pudo guardarlo para próximas sesiones.");
      }
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  async function refreshHistory() {
    setLoadingHistory(true);
    setStatus("");
    try {
      const query = new URLSearchParams();
      if (rangeStart) query.set("from", rangeStart);
      if (rangeEnd) query.set("to", rangeEnd);
      const response = await fetch(`/api/invoices?${query.toString()}`);
      if (!response.ok) throw new Error("No se pudo consultar el historial.");
      setSavedInvoices(await response.json());
    } catch {
      setStatus("No fue posible consultar las cuentas guardadas.");
    } finally {
      setLoadingHistory(false);
    }
  }

  async function saveInvoice() {
    const missingFields: Array<{ id: string; label: string }> = [];
    if (!draft.headerTitle.trim()) missingFields.push({ id: "headerTitle", label: "título del documento" });
    if (!draft.brandName.trim()) missingFields.push({ id: "brandName", label: "nombre de tu marca" });
    if (!draft.invoiceNumber.trim()) missingFields.push({ id: "invoiceNumber", label: "número del documento" });
    if (!draft.invoiceDate) missingFields.push({ id: "invoiceDate", label: "fecha" });
    if (!draft.customerName.trim()) missingFields.push({ id: "customerName", label: "nombre del cliente" });
    if (!draft.customerNumber.trim()) missingFields.push({ id: "customerNumber", label: "teléfono o identificación del cliente" });
    if (!draft.customerAddress.trim()) missingFields.push({ id: "customerAddress", label: "dirección del cliente" });
    draft.items.forEach((item, index) => {
      if (!item.description.trim()) missingFields.push({ id: `item-${item.id}-description`, label: `descripción del servicio ${index + 1}` });
      if (item.unitPrice.trim() === "" || !Number.isFinite(Number(item.unitPrice)) || Number(item.unitPrice) < 0) missingFields.push({ id: `item-${item.id}-unitPrice`, label: `precio del servicio ${index + 1}` });
      if (!Number.isInteger(Number(item.quantity)) || Number(item.quantity) < 1) missingFields.push({ id: `item-${item.id}-quantity`, label: `cantidad del servicio ${index + 1}` });
    });
    if (missingFields.length) {
      setInvalidFields(missingFields.map(({ id }) => id));
      setStatusType("error");
      setStatus(`Completa los campos marcados en rojo: ${missingFields.map(({ label }) => label).join(", ")}.`);
      requestAnimationFrame(() => document.querySelector<HTMLInputElement>(`[data-field-id="${missingFields[0].id}"]`)?.focus());
      return;
    }
    setInvalidFields([]);
    setSaving(true);
    setStatus("");
    try {
      const response = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({
          ...draft,
          discountPercent,
          items: draft.items.map((item) => ({
            description: item.description.trim(),
            unitPriceCents: Math.round(Math.max(0, Number(item.unitPrice) || 0) * 100),
            quantity: Math.max(1, Number.parseInt(item.quantity, 10) || 1),
          })),
        }),
      });
      const result = await response.json() as { error?: string; invoiceNumber?: string };
      if (!response.ok) throw new Error(result.error ?? "No se pudo guardar la cuenta.");
      if (result.invoiceNumber) setDraft((current) => ({ ...current, invoiceNumber: result.invoiceNumber! }));
      setStatusType("success");
      setStatus(result.invoiceNumber ? `Cuenta ${result.invoiceNumber} guardada correctamente.` : "Cuenta guardada correctamente.");
      await refreshHistory();
    } catch (error) {
      setStatusType("error");
      setStatus(error instanceof Error ? error.message : "Ocurrió un error al guardar.");
    } finally {
      setSaving(false);
    }
  }

  async function openSavedInvoice(id: string) {
    setStatus("");
    try {
      const response = await fetch(`/api/invoices/${id}`);
      const record: InvoiceRecord & { id: string } = await response.json();
      if (!response.ok) throw new Error("No se pudo abrir esta cuenta.");
      setSelectedInvoice(record);
      setView("detail");
      setStatus(`Cuenta ${record.invoiceNumber} abierta.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No se pudo abrir esta cuenta.");
    }
  }

  async function startNewInvoice() {
    const nextDraft = { ...createDraft(), ...businessPreferences, logoDataUrl: lastLogoDataUrl || businessPreferences.logoDataUrl };
    setDraft(nextDraft);
    setSelectedInvoice(null);
    setStatus("");
    setView("editor");
    await refreshInvoiceNumber(nextDraft.invoiceDate);
  }

  function returnToHistory() {
    setSelectedInvoice(null);
    setStatus("");
    setView("history");
  }

  if (authLoading) {
    return <main className="login-screen"><div className="login-loading"><LoaderCircle className="spin" size={21} />Validando sesión...</div></main>;
  }

  if (!authenticatedUser) return <LoginScreen onLogin={signIn} />;

  return (
    <div className="app-frame">
      <aside className="sidebar">
        <a className="brand-lockup" href="#inicio" aria-label="Inicio de Cuenta Clara">
          <span className="brand-mark"><Shapes size={21} strokeWidth={1.8} /></span>
          <span>cuenta<span className="brand-light">clara</span></span>
        </a>
        <div className="sidebar-caption">DOCUMENTOS</div>
        <nav className="side-nav" aria-label="Navegación principal">
          <button className={view === "editor" ? "nav-item active" : "nav-item"} onClick={() => setView("editor")} aria-label="Nueva cuenta" title="Nueva cuenta">
            <FilePlus2 size={18} /> <span>Nueva cuenta</span>
          </button>
          <button className={view !== "editor" ? "nav-item active" : "nav-item"} onClick={returnToHistory} aria-label="Historial" title="Historial">
            <History size={18} /> <span>Historial</span>
            {savedInvoices.length > 0 && <span className="nav-count">{savedInvoices.length}</span>}
          </button>
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note"><span className="online-dot" /> Base de datos local</div>
          <div className="sidebar-version">CUENTA CLARA <span>·</span> 01</div>
        </div>
      </aside>

      <main className="workspace" id="inicio">
        <header className="topbar">
          <div className="breadcrumb"><span>Documentos</span><ChevronRight size={14} /><strong>{view === "editor" ? "Nueva cuenta" : view === "history" ? "Historial" : "Vista de cuenta"}</strong></div>
          <div className="topbar-actions">
            {view === "editor" ? (
              <>
                <button className="button button-quiet" onClick={() => window.print()} title="Imprimir o guardar como PDF">
                  <Printer size={16} /><span>Imprimir</span>
                </button>
                <button className="button button-primary" onClick={() => void saveInvoice()} disabled={saving} aria-label={saving ? "Guardando cuenta" : "Guardar cuenta"} title={saving ? "Guardando cuenta" : "Guardar cuenta"}>
                  {saving ? <LoaderCircle className="spin" size={16} /> : <Save size={16} />}
                  <span>{saving ? "Guardando" : "Guardar cuenta"}</span>
                </button>
              </>
            ) : view === "history" ? (
              <button className="button button-primary" onClick={startNewInvoice}><Plus size={17} /><span>Nueva cuenta</span></button>
            ) : (
              <>
                <button className="button button-quiet" onClick={returnToHistory}><History size={16} /><span>Volver al historial</span></button>
                <button className="button button-primary" onClick={() => window.print()}><Printer size={16} /><span>Imprimir</span></button>
              </>
            )}
            <button className="icon-button logout-button" onClick={() => void signOut()} aria-label={`Cerrar sesión de ${authenticatedUser}`} title={`Cerrar sesión de ${authenticatedUser}`}>
              <LogOut size={17} />
            </button>
          </div>
        </header>

        <section className="page-heading">
          <div>
            <div className="eyebrow"><span className="eyebrow-rule" /> GESTIÓN DE COBROS</div>
            <h1>{view === "editor" ? "Crea tu cuenta de cobro" : view === "history" ? "Cuentas guardadas" : selectedInvoice?.invoiceNumber ?? "Cuenta guardada"}</h1>
            <p>{view === "editor" ? "Personaliza el documento y revisa cómo quedará antes de guardarlo." : view === "history" ? "Consulta tus documentos y encuéntralos por fecha de emisión." : "Documento guardado · Solo lectura"}</p>
          </div>
          {view === "editor" && <div className="document-index"><span>DOCUMENTO</span><strong>{draft.invoiceNumber || "Sin número"}</strong></div>}
        </section>

        {status && <div className={statusType === "error" ? "status-message status-error" : "status-message status-success"} role={statusType === "error" ? "alert" : "status"}>{statusType === "error" ? <CircleAlert size={17} /> : <Check size={16} />}{status}</div>}

        {view === "editor" ? (
          <div className="editor-layout">
            <section className="editor-panel" aria-label="Datos de la cuenta">
              <div className="panel-heading">
                <div className="panel-step">01</div>
                <div><h2>Detalles del documento</h2><p>Estos datos aparecen en el encabezado.</p></div>
              </div>
              <div className="form-section">
                <div className="section-label">ENCABEZADO</div>
                <div className="field-grid">
                  <TextField fieldId="headerTitle" invalid={invalidFields.includes("headerTitle")} label="Título del documento" value={draft.headerTitle} onChange={(value) => updateField("headerTitle", value)} placeholder="Factura" />
                  <TextField fieldId="brandName" invalid={invalidFields.includes("brandName")} label="Nombre de tu marca" value={draft.brandName} onChange={(value) => updateField("brandName", value)} placeholder="Nombre comercial" />
                  <TextField label="NIT / C.C. del prestador" value={draft.issuerTaxId} onChange={(value) => updateField("issuerTaxId", value)} placeholder="Identificación" />
                  <TextField fieldId="invoiceNumber" invalid={invalidFields.includes("invoiceNumber")} label="Número consecutivo" value={draft.invoiceNumber} onChange={() => undefined} readOnly />
                  <TextField fieldId="invoiceDate" invalid={invalidFields.includes("invoiceDate")} label="Fecha" type="date" value={draft.invoiceDate} onChange={(value) => updateField("invoiceDate", value)} />
                  <TextField label="Dirección del prestador" value={draft.issuerAddress} onChange={(value) => updateField("issuerAddress", value)} placeholder="Dirección comercial" />
                </div>
                <label className="upload-control">
                  {draft.logoDataUrl ? <Image src={draft.logoDataUrl} alt="Logo actual" width={36} height={36} unoptimized /> : <span className="upload-icon"><ImagePlus size={17} /></span>}
                  <span className="upload-copy"><strong>{draft.logoDataUrl ? "Cambiar logo" : "Añadir logo"}</strong><small>PNG, JPG o SVG · Máx. 1,5 MB</small></span>
                  <ArrowDownToLine size={16} className="upload-arrow" />
                  <input type="file" accept="image/*" onChange={handleLogoChange} />
                </label>
              </div>

              <div className="form-section">
                <div className="section-label">CLIENTE</div>
                <div className="field-grid">
                  <TextField fieldId="customerName" invalid={invalidFields.includes("customerName")} label="Nombre completo" value={draft.customerName} onChange={(value) => updateField("customerName", value)} placeholder="Nombre del cliente" />
                  <TextField fieldId="customerNumber" invalid={invalidFields.includes("customerNumber")} label="C.C. / NIT" value={draft.customerNumber} onChange={(value) => updateField("customerNumber", value)} placeholder="Identificación del cliente" />
                  <TextField label="Teléfono" value={draft.customerPhone} onChange={(value) => updateField("customerPhone", value)} placeholder="Teléfono del cliente" />
                  <label className={`field field-wide${invalidFields.includes("customerAddress") ? " field-invalid" : ""}`}><span>Dirección</span><input data-field-id="customerAddress" aria-invalid={invalidFields.includes("customerAddress")} className={invalidFields.includes("customerAddress") ? "control control-invalid" : "control"} value={draft.customerAddress} onChange={(event) => updateField("customerAddress", event.target.value)} placeholder="Dirección del cliente" /></label>
                  <TextField label="Ciudad" value={draft.customerCity} onChange={(value) => updateField("customerCity", value)} placeholder="Ciudad" />
                </div>
              </div>

              <div className="form-section">
                <div className="section-row"><div className="section-label">SERVICIOS</div><button className="text-button" onClick={addItem}><Plus size={15} /> Agregar servicio</button></div>
                <div className="item-editor-list">
                  {draft.items.map((item, index) => (
                    <div className="item-editor" key={item.id}>
                      <span className="item-index">{`${index + 1}`.padStart(2, "0")}</span>
                      <input data-field-id={`item-${item.id}-description`} aria-invalid={invalidFields.includes(`item-${item.id}-description`)} aria-label={`Descripción del servicio ${index + 1}`} className={invalidFields.includes(`item-${item.id}-description`) ? "control item-description control-invalid" : "control item-description"} value={item.description} onChange={(event) => updateItem(item.id, "description", event.target.value)} placeholder="Descripción del servicio" />
                      <label className={`compact-field${invalidFields.includes(`item-${item.id}-unitPrice`) ? " field-invalid" : ""}`}><span>Precio</span><input data-field-id={`item-${item.id}-unitPrice`} aria-invalid={invalidFields.includes(`item-${item.id}-unitPrice`)} className={invalidFields.includes(`item-${item.id}-unitPrice`) ? "control control-invalid" : "control"} type="number" min="0" step="1000" value={item.unitPrice} onChange={(event) => updateItem(item.id, "unitPrice", event.target.value)} /></label>
                      <label className={`compact-field quantity-field${invalidFields.includes(`item-${item.id}-quantity`) ? " field-invalid" : ""}`}><span>Cant.</span><input data-field-id={`item-${item.id}-quantity`} aria-invalid={invalidFields.includes(`item-${item.id}-quantity`)} className={invalidFields.includes(`item-${item.id}-quantity`) ? "control control-invalid" : "control"} type="number" min="1" step="1" value={item.quantity} onChange={(event) => updateItem(item.id, "quantity", event.target.value)} /></label>
                      <button className="icon-button remove-button" aria-label={`Eliminar servicio ${index + 1}`} title="Eliminar servicio" onClick={() => removeItem(item.id)} disabled={draft.items.length === 1}><Trash2 size={16} /></button>
                    </div>
                  ))}
                </div>
                <div className="discount-row"><span>Descuento</span><label className="discount-input"><input className="control" type="number" min="0" max="100" value={draft.discountPercent} onChange={(event) => updateField("discountPercent", event.target.value)} aria-label="Porcentaje de descuento" /><span>%</span></label></div>
                <div className="field-grid document-conditions">
                  <TextField label="Período / fecha del servicio" value={draft.servicePeriod} onChange={(value) => updateField("servicePeriod", value)} placeholder="Ej. 1 al 30 de septiembre" />
                  <TextField label="Forma y plazo de pago" value={draft.paymentTerms} onChange={(value) => updateField("paymentTerms", value)} placeholder="Ej. Transferencia, pago a 15 días" />
                  <label className="field field-wide"><span>Observaciones</span><textarea className="control control-textarea" value={draft.observations} onChange={(event) => updateField("observations", event.target.value)} placeholder="Notas adicionales" rows={3} /></label>
                </div>
              </div>

              <div className="form-section last-section">
                <div className="section-label">CONTACTO Y PAGO</div>
                <div className="field-grid">
                  <TextField label="Correo electrónico" value={draft.contactEmail} onChange={(value) => updateField("contactEmail", value)} placeholder="hola@tumarca.com" />
                  <TextField label="Sitio web" value={draft.contactWebsite} onChange={(value) => updateField("contactWebsite", value)} placeholder="www.tumarca.com" />
                  <TextField label="Banco" value={draft.bankName} onChange={(value) => updateField("bankName", value)} placeholder="Nombre del banco" />
                  <TextField label="Titular de la cuenta" value={draft.accountName} onChange={(value) => updateField("accountName", value)} placeholder="Nombre del titular" />
                  <label className="field field-wide"><span>Número de cuenta</span><input className="control" value={draft.accountNumber} onChange={(event) => updateField("accountNumber", event.target.value)} placeholder="Número de cuenta" /></label>
                </div>
              </div>
              <div className="editor-footer"><span><span className="online-dot" /> Los cambios se reflejan en la vista previa</span><button className="button button-primary full-save" onClick={() => void saveInvoice()} disabled={saving}>{saving ? <LoaderCircle className="spin" size={16} /> : <Save size={16} />}{saving ? "Guardando" : "Guardar en historial"}</button></div>
            </section>

            <section className="preview-panel" aria-label="Vista previa del documento">
              <div className="preview-toolbar"><div><span className="preview-indicator" /> VISTA PREVIA</div><button className="icon-button" onClick={() => window.print()} title="Imprimir o guardar como PDF" aria-label="Imprimir cuenta"><Printer size={17} /></button></div>
              <InvoiceDocument invoice={{
                ...draft,
                discountPercent,
                subtotalCents,
                discountCents,
                totalCents,
                items: draft.items.map((item) => ({
                  id: item.id,
                  description: item.description || "Servicio",
                  unitPriceCents: Math.round(Math.max(0, Number(item.unitPrice) || 0) * 100),
                  quantity: Math.max(1, Number.parseInt(item.quantity, 10) || 1),
                })),
              }} />
              <div className="preview-caption"><FileText size={14} /> Documento A4 · Listo para imprimir</div>
            </section>
          </div>
        ) : view === "history" ? (
          <section className="history-panel">
            <div className="history-toolbar">
              <div><div className="section-label">FILTRAR POR FECHA</div><p>Elige un rango para consultar los documentos emitidos.</p></div>
              <div className="date-filters">
                <label className="date-filter"><CalendarDays size={16} /><input type="date" aria-label="Desde" value={rangeStart} onChange={(event) => setRangeStart(event.target.value)} /></label>
                <span className="date-separator">a</span>
                <label className="date-filter"><CalendarDays size={16} /><input type="date" aria-label="Hasta" value={rangeEnd} onChange={(event) => setRangeEnd(event.target.value)} /></label>
                <button className="button button-primary filter-button" onClick={() => void refreshHistory()} disabled={loadingHistory}>{loadingHistory ? <LoaderCircle className="spin" size={16} /> : <Search size={16} />}<span>Buscar</span></button>
              </div>
            </div>
            <div className="history-table-wrap">
              <table className="history-table">
                <thead><tr><th>DOCUMENTO</th><th>CLIENTE</th><th>FECHA</th><th>SERVICIOS</th><th className="align-right">TOTAL</th><th><span className="visually-hidden">Ver</span></th></tr></thead>
                <tbody>
                  {loadingHistory ? <tr><td className="history-empty" colSpan={6}><LoaderCircle className="spin" size={19} /> Consultando documentos...</td></tr> : savedInvoices.length ? savedInvoices.map((invoice) => (
                    <tr key={invoice.id} className="history-row" onClick={() => void openSavedInvoice(invoice.id)} tabIndex={0} role="button" aria-label={`Ver ${invoice.invoiceNumber} en modo solo lectura`} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); void openSavedInvoice(invoice.id); } }}>
                      <td><span className="history-document-icon"><FileText size={17} /></span><strong>{invoice.invoiceNumber}</strong></td>
                      <td>{invoice.customerName || "Sin cliente"}</td>
                      <td>{dateLabel(invoice.invoiceDate)}</td>
                      <td>{`${invoice.itemCount}`.padStart(2, "0")}</td>
                      <td className="align-right total-cell">{formatMoney(invoice.totalCents)}</td>
                      <td><ChevronRight size={17} className="history-chevron" /></td>
                    </tr>
                  )) : <tr><td className="history-empty" colSpan={6}><span className="empty-icon"><History size={20} /></span><strong>No hay cuentas en este periodo</strong><span>Prueba con otras fechas o crea una cuenta nueva.</span></td></tr>}
                </tbody>
              </table>
            </div>
            <div className="history-foot"><span>{savedInvoices.length} {savedInvoices.length === 1 ? "documento" : "documentos"}</span><button className="text-button" onClick={startNewInvoice}><Plus size={15} /> Crear cuenta</button></div>
          </section>
        ) : selectedInvoice ? (
          <section className="preview-panel readonly-invoice" aria-label="Cuenta guardada en modo solo lectura">
            <div className="preview-toolbar"><div><span className="preview-indicator" /> DOCUMENTO GUARDADO · SOLO LECTURA</div></div>
            <InvoiceDocument invoice={selectedInvoice} />
            <div className="preview-caption"><FileText size={14} /> Cuenta guardada · No editable</div>
          </section>
        ) : (
          <section className="history-panel"><p className="history-empty">No se encontró la cuenta solicitada.</p><button className="text-button" onClick={returnToHistory}>Volver al historial</button></section>
        )}
      </main>
    </div>
  );
}

function LoginScreen({ onLogin }: { onLogin: (username: string, password: string) => Promise<string | null> }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const result = await onLogin(username, password);
    if (result) setError(result);
    setSubmitting(false);
  }

  return (
    <main className="login-screen">
      <section className="login-panel" aria-labelledby="login-title">
        <div className="login-mark"><Shapes size={25} strokeWidth={1.7} /></div>
        <p className="eyebrow"><span className="eyebrow-rule" /> CUENTA CLARA</p>
        <h1 id="login-title">Iniciar sesión</h1>
        <p className="login-subtitle">Ingresa para administrar tus cuentas de cobro.</p>
        <form className="login-form" onSubmit={(event) => void submit(event)}>
          <label className="field"><span>Usuario</span><input className="control" type="text" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Escribe tu usuario" required /></label>
          <label className="field"><span>Contraseña</span><input className="control" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
          {error && <div className="login-error" role="alert"><CircleAlert size={16} />{error}</div>}
          <button className="button button-primary login-submit" type="submit" disabled={submitting || !username.trim() || !password}>
            {submitting ? <LoaderCircle className="spin" size={17} /> : <LockKeyhole size={17} />}
            <span>{submitting ? "Validando" : "Ingresar"}</span>
          </button>
        </form>
      </section>
    </main>
  );
}