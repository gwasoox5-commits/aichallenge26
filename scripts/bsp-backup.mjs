#!/usr/bin/env node
/**
 * BSP PostgreSQL backup script (pg_dump)
 * Usage: node scripts/bsp-backup.mjs [outputDir]
 * Requires: pg_dump in PATH, BSP_DATABASE_URL env
 */
import { execSync } from "child_process";
import { mkdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = process.argv[2] ?? path.join(__dirname, "../backups");
const dbUrl = process.env.BSP_DATABASE_URL;

if (!dbUrl) {
  console.error("BSP_DATABASE_URL is required");
  process.exit(1);
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const outFile = path.join(outDir, `bsp-backup-${stamp}.sql`);

mkdirSync(outDir, { recursive: true });

try {
  execSync(`pg_dump "${dbUrl}" --no-owner --no-acl -f "${outFile}"`, {
    stdio: "inherit",
    shell: true,
  });
  console.log(`Backup saved: ${outFile}`);
} catch (e) {
  console.error("Backup failed. Ensure PostgreSQL is running and pg_dump is installed.");
  console.error("Docker example: docker run --rm -e PGPASSWORD=bsp postgres:16 pg_dump -h host.docker.internal -U bsp -d bsp");
  process.exit(1);
}
