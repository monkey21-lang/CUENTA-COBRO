import { z } from "zod";
import { withPrisma } from "@/lib/prisma";
import { jsonResponse } from "@/lib/json-response";
import { authenticatedUser } from "@/lib/auth";

export const runtime = "nodejs";

const invoiceSchema = z.object({
  headerTitle: z.string().trim().min(1).max(80),
  brandName: z.string().trim().min(1).max(120),
  issuerTaxId: z.string().max(100).default(""),
  issuerAddress: z.string().max(300).default(""),
  logoDataUrl: z.string().max(2_100_000),
  invoiceNumber: z.string().trim().min(1).max(80),
  invoiceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  customerName: z.string().trim().min(1).max(180),
  customerNumber: z.string().max(100),
  customerAddress: z.string().max(300),
  customerCity: z.string().max(120).default(""),
  customerPhone: z.string().max(80).default(""),
  servicePeriod: z.string().max(180).default(""),
  paymentTerms: z.string().max(240).default(""),
  observations: z.string().max(1000).default(""),
  contactEmail: z.string().max(180),
  contactPhone: z.string().max(80),
  contactWebsite: z.string().max(180),
  bankName: z.string().max(120),
  accountName: z.string().max(180),
  accountNumber: z.string().max(100),
  discountPercent: z.number().min(0).max(100),
  items: z.array(z.object({
    description: z.string().trim().min(1).max(240),
    unitPriceCents: z.number().int().min(0).max(2_000_000_000),
    quantity: z.number().int().min(1).max(1_000_000),
  })).min(1).max(100),
});

function validDateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export async function GET(request: Request) {
  if (!await authenticatedUser(request)) return jsonResponse({ error: "Debes iniciar sesión." }, { status: 401 });
  const params = new URL(request.url).searchParams;
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";

  if ((from && !validDateOnly(from)) || (to && !validDateOnly(to))) {
    return jsonResponse({ error: "El rango contiene una fecha inválida." }, { status: 400 });
  }
  if (from && to && from > to) {
    return jsonResponse({ error: "La fecha inicial no puede ser posterior a la fecha final." }, { status: 400 });
  }

  const invoiceDate: { gte?: Date; lt?: Date } = {};
  if (from) invoiceDate.gte = new Date(`${from}T00:00:00.000Z`);
  if (to) {
    const dayAfterTo = new Date(`${to}T00:00:00.000Z`);
    dayAfterTo.setUTCDate(dayAfterTo.getUTCDate() + 1);
    invoiceDate.lt = dayAfterTo;
  }

  return withPrisma(async (prisma) => {
    try {
      const invoices = await prisma.invoice.findMany({
        where: Object.keys(invoiceDate).length ? { invoiceDate } : undefined,
        orderBy: [{ invoiceDate: "desc" }, { createdAt: "desc" }],
        take: 200,
        select: {
          id: true,
          invoiceNumber: true,
          invoiceDate: true,
          customerName: true,
          totalCents: true,
          _count: { select: { items: true } },
        },
      });

      return jsonResponse(invoices.map((invoice) => ({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.invoiceDate.toISOString().slice(0, 10),
        customerName: invoice.customerName,
        totalCents: invoice.totalCents,
        itemCount: invoice._count.items,
      })));
    } catch {
      return jsonResponse({ error: "No fue posible consultar la base de datos." }, { status: 500 });
    }
  });
}

export async function POST(request: Request) {
  if (!await authenticatedUser(request)) return jsonResponse({ error: "Debes iniciar sesión." }, { status: 401 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "El cuerpo de la solicitud no es JSON válido." }, { status: 400 });
  }

  const parsed = invoiceSchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse({ error: "Revisa los datos obligatorios y los valores ingresados." }, { status: 400 });
  }

  const data = parsed.data;
  if (!validDateOnly(data.invoiceDate)) {
    return jsonResponse({ error: "La fecha de emisión no es válida." }, { status: 400 });
  }

  const subtotalCents = data.items.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0);
  if (!Number.isSafeInteger(subtotalCents)) {
    return jsonResponse({ error: "El total supera el valor permitido." }, { status: 400 });
  }
  const discountCents = Math.round(subtotalCents * data.discountPercent / 100);

  return withPrisma(async (prisma) => {
    try {
      const invoice = await prisma.invoice.create({
        data: {
          headerTitle: data.headerTitle,
          brandName: data.brandName,
          issuerTaxId: data.issuerTaxId,
          issuerAddress: data.issuerAddress,
          logoDataUrl: data.logoDataUrl || null,
          invoiceNumber: data.invoiceNumber,
          invoiceDate: new Date(`${data.invoiceDate}T12:00:00.000Z`),
          customerName: data.customerName,
          customerNumber: data.customerNumber,
          customerAddress: data.customerAddress,
          customerCity: data.customerCity,
          customerPhone: data.customerPhone,
          servicePeriod: data.servicePeriod,
          paymentTerms: data.paymentTerms,
          observations: data.observations,
          contactEmail: data.contactEmail,
          contactPhone: data.contactPhone,
          contactWebsite: data.contactWebsite,
          bankName: data.bankName,
          accountName: data.accountName,
          accountNumber: data.accountNumber,
          discountPercent: data.discountPercent,
          subtotalCents,
          discountCents,
          totalCents: subtotalCents - discountCents,
        },
      });

      try {
        await prisma.invoiceItem.createMany({
          data: data.items.map((item, position) => ({ ...item, position, invoiceId: invoice.id })),
        });
      } catch (error) {
        await prisma.invoice.delete({ where: { id: invoice.id } }).catch(() => undefined);
        throw error;
      }

      return jsonResponse({ id: invoice.id, invoiceNumber: invoice.invoiceNumber }, { status: 201 });
    } catch {
      return jsonResponse({ error: "No fue posible guardar la cuenta en la base de datos." }, { status: 500 });
    }
  });
}