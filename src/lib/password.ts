import { pbkdf2, randomBytes, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const ITERATIONS = 100_000;
const KEY_LENGTH = 256;
const deriveKey = promisify(pbkdf2);

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const derived = await deriveKey(password, salt, ITERATIONS, KEY_LENGTH / 8, "sha256");
  return `pbkdf2-sha256$${ITERATIONS}$${salt.toString("base64")}$${derived.toString("base64")}`;
}

export async function verifyPassword(password: string, storedHash: string) {
  const [algorithm, iterationText, saltText, expectedText] = storedHash.split("$");
  const iterations = Number(iterationText);
  if (algorithm !== "pbkdf2-sha256" || !Number.isInteger(iterations) || iterations < 100_000 || iterations > 1_000_000 || !saltText || !expectedText) return false;
  try {
    const salt = Buffer.from(saltText, "base64");
    const expected = Buffer.from(expectedText, "base64");
    const derived = await deriveKey(password, salt, iterations, KEY_LENGTH / 8, "sha256");
    return expected.length === derived.length && timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}