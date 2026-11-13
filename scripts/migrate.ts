// Applies database migrations using whichever host's variable names are present (see src/lib/dbEnv.ts).
import { spawnSync } from "node:child_process";
import { applyDbEnv } from "../src/lib/dbEnv";

applyDbEnv();
if (!process.env.DATABASE_URL) {
  console.error("No database address found. Set DATABASE_URL (or connect a database in Vercel Storage).");
  process.exit(1);
}
const r = spawnSync("npx", ["prisma", "migrate", "deploy"], { stdio: "inherit", env: process.env });
process.exit(r.status ?? 1);
