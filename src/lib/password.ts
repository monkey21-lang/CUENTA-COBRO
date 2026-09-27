const ITERATIONS = 310_000;
const KEY_LENGTH = 256;

function encode(value: Uint8Array) {
  let binary = "";
  value.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

function decode(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const derived = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: ITERATIONS },
    key,
    KEY_LENGTH,
  );
  return `pbkdf2-sha256$${ITERATIONS}$${encode(salt)}$${encode(new Uint8Array(derived))}`;
}

export async function verifyPassword(password: string, storedHash: string) {
  const [algorithm, iterationText, saltText, expectedText] = storedHash.split("$");
  const iterations = Number(iterationText);
  if (algorithm !== "pbkdf2-sha256" || !Number.isInteger(iterations) || iterations < 100_000 || iterations > 1_000_000 || !saltText || !expectedText) return false;
  try {
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
    const derived = new Uint8Array(await crypto.subtle.deriveBits(
      { name: "PBKDF2", hash: "SHA-256", salt: decode(saltText), iterations },
      key,
      KEY_LENGTH,
    ));
    const expected = decode(expectedText);
    if (derived.length !== expected.length) return false;
    let difference = 0;
    for (let index = 0; index < derived.length; index += 1) difference |= derived[index] ^ expected[index];
    return difference === 0;
  } catch {
    return false;
  }
}