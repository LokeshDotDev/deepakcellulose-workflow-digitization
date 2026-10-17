import { execSync } from "child_process";

const testDbUrl = process.env.TEST_DATABASE_URL || "postgresql://neondb_owner:npg_ckvx6Jq1zQrf@ep-broad-shadow-aocttwm4-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb_test?sslmode=require&channel_binding=require&connect_timeout=30";
const testDirectUrl = process.env.TEST_DIRECT_URL || "postgresql://neondb_owner:npg_ckvx6Jq1zQrf@ep-broad-shadow-aocttwm4.c-2.ap-southeast-1.aws.neon.tech/neondb_test?sslmode=require&connect_timeout=30";

console.log("Pushing schema to neondb_test...");
execSync("npx prisma db push --skip-generate", {
  stdio: "inherit",
  env: {
    ...process.env,
    DATABASE_URL: testDbUrl,
    DIRECT_URL: testDirectUrl,
  },
});
console.log("✅ neondb_test schema synchronized successfully.");
