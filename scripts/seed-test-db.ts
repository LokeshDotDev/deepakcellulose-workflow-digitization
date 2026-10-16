Object.assign(process.env, { NODE_ENV: "test" });
import { spawnSync } from "child_process";
import path from "path";

console.log("🌱 Seeding dedicated test database (neondb_test)...");
const result = spawnSync("npx", ["tsx", "prisma/seed.ts"], {
  stdio: "inherit",
  shell: true,
  env: {
    ...process.env,
    NODE_ENV: "test",
  },
});

if (result.status !== 0) {
  console.error("❌ Failed to seed test database.");
  process.exit(result.status || 1);
} else {
  console.log("✅ Dedicated test database successfully seeded!");
}
