import { authenticatedUser } from "@/lib/auth";
import { jsonResponse } from "@/lib/json-response";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const username = await authenticatedUser(request);
  if (!username) return jsonResponse({ authenticated: false });
  return jsonResponse({ authenticated: true, username });
}