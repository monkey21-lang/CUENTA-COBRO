import { prisma } from "@/lib/prisma";
import { jsonResponse } from "@/lib/json-response";

export const runtime = "nodejs";

export async function GET(_request: Request, context: RouteContext<"/api/invoices/[id]">) {
  const { id } = await context.params;
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { items: { orderBy: { position: "asc" } } },
    });
    if (!invoice) return jsonResponse({ error: "La cuenta solicitada no existe." }, { status: 404 });
    return jsonResponse({
      ...invoice,
      invoiceDate: invoice.invoiceDate.toISOString().slice(0, 10),
    });
  } catch {
    return jsonResponse({ error: "No fue posible abrir la cuenta." }, { status: 500 });
  }
}