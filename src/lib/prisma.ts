import { PrismaClient } from "@prisma/client";
import { PrismaD1 } from "@prisma/adapter-d1";
import { getCloudflareContext } from "@opennextjs/cloudflare";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export async function withPrisma<T>(operation: (client: PrismaClient) => Promise<T>) {
  if (process.env.NODE_ENV === "production") {
    const { env } = getCloudflareContext();
    const bindings = env as unknown as { DB: ConstructorParameters<typeof PrismaD1>[0] };
    const client = new PrismaClient({ adapter: new PrismaD1(bindings.DB) });
    try {
      return await operation(client);
    } finally {
      await client.$disconnect();
    }
  }

  const client = globalForPrisma.prisma ?? new PrismaClient();
  globalForPrisma.prisma = client;
  return operation(client);
}