import { randomUUID, webcrypto } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvFile } from "node:process";
import { PrismaClient } from "@prisma/client";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const mode = process.argv[2] ?? "local";
const dotenvFile = resolve(root, ".env");
const envFile = resolve(root, ".dev.vars");

if (existsSync(dotenvFile)) loadEnvFile(dotenvFile);

if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^(["'])(.*)\1$/, "$2");
  }
}

const users = [
  { username: "Albert", password: process.env.ALBERT_PASSWORD },
  { username: "Andres", password: process.env.ANDRES_PASSWORD },
];

if (users.some((user) => !user.password)) {
  console.error("Faltan ALBERT_PASSWORD o ANDRES_PASSWORD en .dev.vars o en el entorno.");
  process.exit(1);
}

async function hashPassword(password) {
  const salt = webcrypto.getRandomValues(new Uint8Array(16));
  const key = await webcrypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const derived = new Uint8Array(await webcrypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: 100000 },
    key,
    256,
  ));
  return `pbkdf2-sha256$100000$${Buffer.from(salt).toString("base64")}$${Buffer.from(derived).toString("base64")}`;
}

const records = await Promise.all(users.map(async (user) => ({
  id: randomUUID(),
  username: user.username,
  passwordHash: await hashPassword(user.password),
})));

if (mode === "local") {
  const prisma = new PrismaClient();
  try {
    for (const record of records) {
      await prisma.user.upsert({
        where: { username: record.username },
        create: record,
        update: { passwordHash: record.passwordHash },
      });
    }
  } finally {
    await prisma.$disconnect();
  }
  console.log("Usuarios Albert y Andres creados o actualizados en SQLite local.");
} else if (mode === "remote" || mode === "d1-local") {
  const statements = records.map(({ id, username, passwordHash }) => {
    const sqlValue = (value) => `'${value.replaceAll("'", "''")}'`;
    return `INSERT INTO "User" ("id", "username", "passwordHash") VALUES (${sqlValue(id)}, ${sqlValue(username)}, ${sqlValue(passwordHash)}) ON CONFLICT("username") DO UPDATE SET "passwordHash" = excluded."passwordHash";`;
  });
  const wrangler = resolve(root, "node_modules/wrangler/bin/wrangler.js");
  const result = spawnSync(process.execPath, [
    wrangler,
    "d1",
    "execute",
    "cuenta-clara",
    `--${mode === "remote" ? "remote" : "local"}`,
    "--command",
    statements.join(" "),
  ], { cwd: root, stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
  console.log(`Usuarios Albert y Andres creados o actualizados en D1 (${mode}).`);
} else {
  console.error("Uso: node scripts/seed-users.mjs [local|d1-local|remote]");
  process.exit(1);
}