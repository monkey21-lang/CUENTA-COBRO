import { z } from "zod";
import { jsonResponse } from "@/lib/json-response";
import { createSessionToken, sessionCookie, verifyCredentials } from "@/lib/auth";

export const runtime = "nodejs";

const loginSchema = z.object({ username: z.string().min(1).max(30), password: z.string().min(1).max(200) });

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Solicitud de inicio de sesión inválida." }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return jsonResponse({ error: "Escribe tu usuario y contraseña." }, { status: 400 });

  try {
    const username = await verifyCredentials(parsed.data.username, parsed.data.password);
    if (!username) return jsonResponse({ error: "Usuario o contraseña incorrectos." }, { status: 401 });
    const token = await createSessionToken(username);
    return jsonResponse({ username }, { headers: { "Set-Cookie": sessionCookie(token) } });
  } catch {
    return jsonResponse({ error: "El inicio de sesión no está configurado en el servidor." }, { status: 503 });
  }
}