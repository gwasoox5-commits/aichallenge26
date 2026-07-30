import type { CompanyOperationalState } from "../types";
import type { MaterialBranchInput, MaterialPayload, SalesPayload } from "../types";
import { isRegionCode, type RegionCode } from "./region-catalog";

/** Rule: 1년차 3개 / 2년차 4개 / 3년차 5개 지역까지 브랜치 개설 */
export const REGION_EXPANSION_CAP_BY_YEAR: Record<number, number> = {
  1: 3,
  2: 4,
  3: 5,
};

export function regionExpansionCap(year: number): number {
  return REGION_EXPANSION_CAP_BY_YEAR[year] ?? 7;
}

export function operatingRegions(state: CompanyOperationalState): Set<RegionCode> {
  const codes = new Set<RegionCode>();
  for (const code of [...state.openBranches, ...state.openSalesBranches]) {
    if (isRegionCode(code)) codes.add(code);
  }
  return codes;
}

export function projectedOperatingRegions(
  state: CompanyOperationalState,
  purchaseBranches: MaterialBranchInput[] = [],
  salesBranches: MaterialBranchInput[] = []
): Set<RegionCode> {
  const codes = operatingRegions(state);
  for (const branch of purchaseBranches) {
    if (isRegionCode(branch.regionCode)) codes.add(branch.regionCode);
  }
  for (const branch of salesBranches) {
    if (isRegionCode(branch.regionCode)) codes.add(branch.regionCode);
  }
  return codes;
}

export function openingPurchaseRegions(payload: MaterialPayload): Set<RegionCode> {
  const codes = new Set<RegionCode>();
  for (const branch of payload.branches ?? []) {
    if (isRegionCode(branch.regionCode)) codes.add(branch.regionCode);
  }
  return codes;
}

export function openingSalesRegions(payload: SalesPayload): Set<RegionCode> {
  const codes = new Set<RegionCode>();
  for (const branch of payload.branchesNew ?? []) {
    if (isRegionCode(branch.regionCode)) codes.add(branch.regionCode);
  }
  return codes;
}

export function hasOperationalBranch(
  state: CompanyOperationalState,
  regionCode: RegionCode,
  openingPurchase: Set<RegionCode> = new Set(),
  openingSales: Set<RegionCode> = new Set()
): boolean {
  return (
    state.openBranches.includes(regionCode) ||
    state.openSalesBranches.includes(regionCode) ||
    openingPurchase.has(regionCode) ||
    openingSales.has(regionCode)
  );
}

export function isRegionAlreadyOpened(state: CompanyOperationalState, regionCode: RegionCode): boolean {
  return state.openBranches.includes(regionCode) || state.openSalesBranches.includes(regionCode);
}
