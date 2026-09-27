import { PrismaClient } from "@prisma/client";
import { PrismaD1 } from "@prisma/adapter-d1";
import { getCloudflareContext } from "@opennextjs/cloudflare";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export async function withPrisma<T>(operation: (client: PrismaClient) => Promise<T>) {
  let cloudflareEnv: { DB?: ConstructorParameters<typeof PrismaD1>[0] } | undefined;
  try {
    cloudflareEnv = getCloudflareContext().env as unknown as typeof cloudflareEnv;
  } catch {
    // Standard Next.js server outside the Cloudflare runtime.
  }

  if (cloudflareEnv?.DB) {
    const client = new PrismaClient({ adapter: new PrismaD1(cloudflareEnv.DB) });
    try {
      return await operation(client);
    } finally {
      await client.$disconnect();
    }
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("Cloudflare D1 binding DB is unavailable.");
  }

  const client = globalForPrisma.prisma ?? new PrismaClient();
  globalForPrisma.prisma = client;
  return operation(client);
}