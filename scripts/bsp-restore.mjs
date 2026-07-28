#!/usr/bin/env node
/**
 * BSP PostgreSQL restore script (psql)
 * Usage: node scripts/bsp-restore.mjs <backup.sql>
 */
import { execSync } from "child_process";
import path from "path";

const backupFile = process.argv[2];
const dbUrl = process.env.BSP_DATABASE_URL;

if (!dbUrl || !backupFile) {
  console.error("Usage: BSP_DATABASE_URL=... node scripts/bsp-restore.mjs <backup.sql>");
  process.exit(1);
}

const resolved = path.resolve(backupFile);

try {
  execSync(`psql "${dbUrl}" -f "${resolved}"`, { stdio: "inherit", shell: true });
  console.log(`Restore complete from ${resolved}`);
} catch {
  console.error("Restore failed. Verify backup file and database connection.");
  process.exit(1);
}
