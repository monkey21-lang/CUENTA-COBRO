import { withPrisma } from "@/lib/prisma";
import { jsonResponse } from "@/lib/json-response";
import { authenticatedUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request: Request, context: RouteContext<"/api/invoices/[id]">) {
  if (!await authenticatedUser(request)) return jsonResponse({ error: "Debes iniciar sesión." }, { status: 401 });
  const { id } = await context.params;
  return withPrisma(async (prisma) => {
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
  });
}