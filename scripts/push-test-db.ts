import { spawnSync } from "child_process";
import dotenv from "dotenv";

dotenv.config();

const testDbUrl = process.env.TEST_DATABASE_URL;
const testDirectUrl = process.env.TEST_DIRECT_URL;

if (!testDbUrl) {
  console.error("TEST_DATABASE_URL not set");
  process.exit(1);
}

console.log("Pushing schema to test database:", testDbUrl.split("@")[1]);

const res = spawnSync("npx.cmd", ["prisma", "db", "push", "--skip-generate"], {
  stdio: "inherit",
  shell: true,
  env: {
    ...process.env,
    DATABASE_URL: testDbUrl,
    DIRECT_URL: testDirectUrl || testDbUrl,
  },
});

process.exit(res.status || 0);
