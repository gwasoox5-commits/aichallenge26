import { PrismaClient } from ".prisma/bsp-client";

const globalForPrisma = globalThis as unknown as { bspPrisma?: PrismaClient };

function buildDatabaseUrl(): string | undefined {
  const base = process.env.BSP_DATABASE_URL;
  if (!base) return undefined;
  if (base.includes("connection_limit=")) return base;
  const sep = base.includes("?") ? "&" : "?";
  const limit = process.env.BSP_DB_POOL_SIZE ?? "10";
  const timeout = process.env.BSP_DB_POOL_TIMEOUT ?? "20";
  return `${base}${sep}connection_limit=${limit}&pool_timeout=${timeout}`;
}

export const bspPrisma =
  globalForPrisma.bspPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    datasources: buildDatabaseUrl() ? { db: { url: buildDatabaseUrl() } } : undefined,
  });
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.bspPrisma = bspPrisma;
}
