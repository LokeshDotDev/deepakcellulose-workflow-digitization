Object.assign(process.env, { NODE_ENV: "test" });
import { spawnSync } from "child_process";

async function main() {
  console.log("🔒 VERIFYING TEST DATABASE ISOLATION BEFORE TEST EXECUTION...");
  
  // Dynamically import lib/db after setting NODE_ENV = "test"
  const { default: prisma } = await import("../lib/db");

  // 1. Verify that the runtime connection is strictly pointing to neondb_test
  const result = await prisma.$queryRaw<any[]>`SELECT current_database() as db, current_user as usr`;
  const currentDb = result[0]?.db;

  if (currentDb !== "neondb_test") {
    console.error(`\n🚨 CRITICAL ERROR: Connected to '${currentDb}' instead of dedicated 'neondb_test'!`);
    console.error("Halting execution immediately to guarantee zero mutation to production/development data.\n");
    process.exit(1);
  }

  console.log(`✅ ISOLATION VERIFIED: Operating against dedicated test database [${currentDb}]`);
  await prisma.$disconnect();

  // 2. Enumerate all test suites
  const testFiles = [
    "tests/erp.test.ts",
    "tests/process-workflow.test.ts",
    "tests/auth-permissions.test.ts",
    "tests/admin-config.test.ts",
    "tests/notifications-dashboards.test.ts",
    "tests/failures-concurrency.test.ts",
    "tests/e2e-business-lifecycle.test.ts",
  ];

  console.log(`🚀 Executing ${testFiles.length} test suites with Node.js Test Runner...\n`);

  const runner = spawnSync("npx", ["tsx", "--test", ...testFiles], {
    stdio: "inherit",
    shell: true,
    env: {
      ...process.env,
      NODE_ENV: "test",
    },
  });

  process.exit(runner.status || 0);
}

main().catch((err) => {
  console.error("Fatal test runner exception:", err);
  process.exit(1);
});
