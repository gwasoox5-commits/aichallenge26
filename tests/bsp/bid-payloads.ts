import type { RegionCode } from "@/src/bsp/domain/regions/region-catalog";
import { REGION_CATALOG } from "@/src/bsp/domain/regions/region-catalog";

export function materialBidPayload(
  regionCode: RegionCode,
  qty: number,
  unitPriceBidManwon?: number,
  options?: { openBranch?: boolean }
) {
  const line: {
    regionCode: RegionCode;
    qty: number;
    unitPriceBidManwon?: number;
  } = {
    regionCode,
    qty,
  };
  if (unitPriceBidManwon !== undefined) {
    line.unitPriceBidManwon = unitPriceBidManwon;
  }
  const openBranch = options?.openBranch ?? qty > 0;
  return {
    lines: [line],
    ...(openBranch ? { branches: [{ regionCode }] } : {}),
  };
}

/** Explicit floor bid for ASIA default economy (12만). */
export function asiaMaterialBidPayload(qty: number, unitPriceBidManwon = 12) {
  return materialBidPayload("ASIA", qty, unitPriceBidManwon);
}

/** Legacy 4-type perType count → single raw-material units. */
export function legacyPerTypeToQty(perType: number) {
  return perType * 4;
}

/** All seven regions — used to fill year 2+ expansion selections in tests. */
export const FULL_REGION_POOL = REGION_CATALOG.map((r) => r.code);

/** Default operating pool for year-1 tests (3 regions). */
export const DEFAULT_TEST_REGIONS = ["ASIA", "EUROPE", "AFRICA"] as const;
export function yearOneTestRegions(...mustInclude: string[]) {
  const picked = [...new Set(mustInclude.filter(Boolean))];
  for (const code of DEFAULT_TEST_REGIONS) {
    if (picked.length >= 3) break;
    if (!picked.includes(code)) picked.push(code);
  }
  return picked.slice(0, 3);
}

export async function ensureOperatingRegionsSelected(
  engine: {
    getDashboard: (id: string) => Promise<{
      regionSelectionRequired?: boolean;
      regionsToSelect?: number;
      selectedRegions?: string[];
      statusVersion: number;
    }>;
    selectOperatingRegions: (
      id: string,
      codes: string[],
      v: number
    ) => Promise<{ dashboard: { regionSelectionRequired?: boolean; regionsToSelect?: number; selectedRegions?: string[]; statusVersion: number } }>;
  },
  companyId: string,
  regions: readonly string[] = DEFAULT_TEST_REGIONS
) {
  let dash = await engine.getDashboard(companyId);
  while (dash.regionSelectionRequired) {
    const needed = dash.regionsToSelect ?? 0;
    const already = new Set(dash.selectedRegions ?? []);
    const pool = [...regions, ...FULL_REGION_POOL].filter((code, index, arr) => arr.indexOf(code) === index);
    const toAdd = pool.filter((code) => !already.has(code)).slice(0, needed);
    if (toAdd.length < needed) {
      throw new Error(`Need ${needed} new regions but only ${toAdd.length} available`);
    }
    const result = await engine.selectOperatingRegions(companyId, [...toAdd], dash.statusVersion);
    dash = result.dashboard;
  }
}
