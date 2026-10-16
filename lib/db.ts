import { PrismaClient } from "@prisma/client";

const isTest = process.env.NODE_ENV === "test";
const dbUrl = isTest && process.env.TEST_DATABASE_URL
  ? process.env.TEST_DATABASE_URL
  : process.env.DATABASE_URL;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: dbUrl ? { db: { url: dbUrl } } : undefined,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
