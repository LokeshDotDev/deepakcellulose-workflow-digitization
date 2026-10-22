import { PrismaClient } from "@prisma/client";

async function run() {
  const db1Url = process.env.DATABASE_URL;
  const db2Url = process.env.TEST_DATABASE_URL;

  console.log("Adding HR enum value to databases...");

  if (db1Url) {
    const db1 = new PrismaClient({ datasources: { db: { url: db1Url } } });
    try {
      await db1.$executeRawUnsafe(`ALTER TYPE "DepartmentCode" ADD VALUE IF NOT EXISTS 'HR'`);
      console.log("✓ Added 'HR' to DepartmentCode in main database.");
    } catch (e: any) {
      console.log("Main DB:", e.message);
    } finally {
      await db1.$disconnect();
    }
  }

  if (db2Url) {
    const db2 = new PrismaClient({ datasources: { db: { url: db2Url } } });
    try {
      await db2.$executeRawUnsafe(`ALTER TYPE "DepartmentCode" ADD VALUE IF NOT EXISTS 'HR'`);
      console.log("✓ Added 'HR' to DepartmentCode in test database.");
    } catch (e: any) {
      console.log("Test DB:", e.message);
    } finally {
      await db2.$disconnect();
    }
  }
}

run();
