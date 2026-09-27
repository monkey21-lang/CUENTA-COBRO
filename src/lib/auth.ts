import { getCloudflareContext } from "@opennextjs/cloudflare";
import { withPrisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
const SESSION_COOKIE = "cuenta-clara-session";
const SESSION_LIFETIME_SECONDS = 60 * 60 * 12;

export type AccountUsername = string;

function authEnvironment() {
  try {
    return getCloudflareContext().env as unknown as Record<string, string | undefined>;
  } catch {
    // Standard Next.js server outside the Cloudflare runtime.
  }
  return process.env;
}

function encodeBase64Url(value: Uint8Array) {
  let binary = "";
  value.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function decodeBase64Url(value: string) {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const binary = atob(base64 + "=".repeat((4 - base64.length % 4) % 4));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function sessionKey() {
  const secret = authEnvironment().AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("AUTH_SECRET debe tener al menos 32 caracteres.");
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function verifyCredentials(username: string, password: string): Promise<AccountUsername | null> {
  const normalizedUsername = username.trim();
  if (!normalizedUsername || !password) return null;
  return withPrisma(async (prisma) => {
    const user = await prisma.user.findUnique({ where: { username: normalizedUsername } });
    const passwordMatches = user ? await verifyPassword(password, user.passwordHash) : false;
    if (!user || !passwordMatches) return null;
    return user.username;
  });
}

export async function createSessionToken(username: AccountUsername) {
  const payload = encodeBase64Url(new TextEncoder().encode(JSON.stringify({
    username,
    expiresAt: Math.floor(Date.now() / 1000) + SESSION_LIFETIME_SECONDS,
  })));
  const signature = await crypto.subtle.sign("HMAC", await sessionKey(), new TextEncoder().encode(payload));
  return `${payload}.${encodeBase64Url(new Uint8Array(signature))}`;
}

export async function verifySessionToken(token: string | null): Promise<AccountUsername | null> {
  if (!token) return null;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return null;
  try {
    const valid = await crypto.subtle.verify(
      "HMAC",
      await sessionKey(),
      decodeBase64Url(signature),
      new TextEncoder().encode(payload),
    );
    if (!valid) return null;
    const data = JSON.parse(new TextDecoder().decode(decodeBase64Url(payload))) as { username?: string; expiresAt?: number };
    if (typeof data.username !== "string" || !data.username.trim()) return null;
    if (!data.expiresAt || data.expiresAt <= Math.floor(Date.now() / 1000)) return null;
    return data.username as AccountUsername;
  } catch {
    return null;
  }
}

export async function authenticatedUser(request: Request) {
  const cookies = request.headers.get("cookie") ?? "";
  const cookie = cookies.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${SESSION_COOKIE}=`));
  return verifySessionToken(cookie?.slice(SESSION_COOKIE.length + 1) ?? null);
}

export function sessionCookie(token: string, clear = false) {
  const secure = process.env.NEXTJS_ENV === "production" || process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${clear ? "" : token}; Path=/; HttpOnly; SameSite=Strict${secure}; Max-Age=${clear ? 0 : SESSION_LIFETIME_SECONDS}`;
}