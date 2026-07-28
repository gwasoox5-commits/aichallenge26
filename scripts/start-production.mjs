import { execSync, spawnSync } from "node:child_process";

if (process.env.BSP_DATABASE_URL) {
  console.log("[bsp] Running database migrations...");
  execSync("npx prisma migrate deploy --schema=prisma/bsp.schema.prisma", {
    stdio: "inherit",
  });
} else {
  console.warn("[bsp] BSP_DATABASE_URL not set — skipping migrations.");
}

const result = spawnSync("npx", ["tsx", "server.ts"], {
  stdio: "inherit",
  shell: true,
});
process.exit(result.status ?? 1);
