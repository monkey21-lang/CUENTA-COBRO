import { jsonResponse } from "@/lib/json-response";
import { sessionCookie } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST() {
  return jsonResponse({ success: true }, { headers: { "Set-Cookie": sessionCookie("", true) } });
}