import prisma from "../lib/db";
import assert from "node:assert";

export async function assertTestDatabaseIsolation(): Promise<string> {
  const result = await prisma.$queryRaw<any[]>`SELECT current_database() as db, current_user as usr`;
  const currentDb = result[0]?.db;

  if (currentDb !== "neondb_test") {
    throw new Error(
      `CRITICAL ISOLATION FAILURE: Connected to database '${currentDb}' instead of dedicated 'neondb_test'! All tests halted immediately to prevent unintended data mutations.`
    );
  }

  return currentDb;
}
