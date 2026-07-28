import { join } from "path";

/** Writable directory for v2/v3 JSON file stores (drafts, publish, world). */
export function getBspDataDir(): string {
  if (process.env.BSP_DATA_DIR) return process.env.BSP_DATA_DIR;
  if (process.env.NODE_ENV === "production") return join("/tmp", "bsp-data");
  return join(process.cwd(), ".bsp-data");
}
