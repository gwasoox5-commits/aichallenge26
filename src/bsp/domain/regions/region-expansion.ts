import type { CompanyOperationalState, ValidationResult, ValidationRuleResult } from "../types";
import type { MaterialBranchInput, MaterialPayload, SalesPayload } from "../types";
import { isRegionCode, type RegionCode } from "./region-catalog";

function pass(ruleId: string, message: string): ValidationRuleResult {
  return { ruleId, passed: true, message };
}

function fail(
  ruleId: string,
  errorCode: string,
  field: string,
  message: string,
  params?: Record<string, unknown>
): ValidationRuleResult {
  return { ruleId, errorCode, passed: false, field, message, params };
}

function result(rules: ValidationRuleResult[]): ValidationResult {
  return { ok: rules.every((r) => r.passed), rules };
}

/** Rule: 1년차 3개 / 2년차 4개 / 3년차 5개 지역까지 브랜치 개설 */
export const REGION_EXPANSION_CAP_BY_YEAR: Record<number, number> = {
  1: 3,
  2: 4,
  3: 5,
};

export function regionExpansionCap(year: number): number {
  return REGION_EXPANSION_CAP_BY_YEAR[year] ?? 7;
}

export function regionsToSelectCount(year: number, selectedCount: number): number {
  return Math.max(0, regionExpansionCap(year) - selectedCount);
}

export function isRegionSelectionRequired(year: number, selectedCount: number): boolean {
  return regionsToSelectCount(year, selectedCount) > 0;
}

export function isRegionInOperatingPool(state: CompanyOperationalState, regionCode: RegionCode): boolean {
  return state.selectedRegions.includes(regionCode);
}

/** Regions with any branch (purchase or sales-only) — for dashboard display. */
export function operatingRegions(state: CompanyOperationalState): Set<RegionCode> {
  const codes = new Set<RegionCode>();
  for (const code of [...state.openBranches, ...state.openSalesBranches]) {
    if (isRegionCode(code)) codes.add(code);
  }
  return codes;
}

export function purchaseBranchRegions(state: CompanyOperationalState): Set<RegionCode> {
  const codes = new Set<RegionCode>();
  for (const code of state.openBranches) {
    if (isRegionCode(code)) codes.add(code);
  }
  return codes;
}

export function salesBranchRegions(state: CompanyOperationalState): Set<RegionCode> {
  const codes = new Set<RegionCode>();
  for (const code of state.openSalesBranches) {
    if (isRegionCode(code)) codes.add(code);
  }
  return codes;
}

export function projectedPurchaseBranchRegions(
  state: CompanyOperationalState,
  purchaseBranches: MaterialBranchInput[] = []
): Set<RegionCode> {
  const codes = purchaseBranchRegions(state);
  for (const branch of purchaseBranches) {
    if (isRegionCode(branch.regionCode)) codes.add(branch.regionCode);
  }
  return codes;
}

export function projectedSalesBranchRegions(
  state: CompanyOperationalState,
  salesBranches: MaterialBranchInput[] = []
): Set<RegionCode> {
  const codes = salesBranchRegions(state);
  for (const branch of salesBranches) {
    if (isRegionCode(branch.regionCode)) codes.add(branch.regionCode);
  }
  return codes;
}

/** @deprecated Use projectedPurchaseBranchRegions / projectedSalesBranchRegions. */
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

export function hasPurchaseBranch(
  state: CompanyOperationalState,
  regionCode: RegionCode,
  openingPurchase: Set<RegionCode> = new Set()
): boolean {
  return state.openBranches.includes(regionCode) || openingPurchase.has(regionCode);
}

/** Purchase branch in a region satisfies sales; otherwise a sales branch is required. */
export function hasSalesBranch(
  state: CompanyOperationalState,
  regionCode: RegionCode,
  openingSales: Set<RegionCode> = new Set()
): boolean {
  return (
    state.openBranches.includes(regionCode) ||
    state.openSalesBranches.includes(regionCode) ||
    openingSales.has(regionCode)
  );
}

/** @deprecated Use hasPurchaseBranch / hasSalesBranch. */
export function hasOperationalBranch(
  state: CompanyOperationalState,
  regionCode: RegionCode,
  openingPurchase: Set<RegionCode> = new Set(),
  openingSales: Set<RegionCode> = new Set()
): boolean {
  return hasPurchaseBranch(state, regionCode, openingPurchase) || hasSalesBranch(state, regionCode, openingSales);
}

export function isPurchaseBranchOpened(state: CompanyOperationalState, regionCode: RegionCode): boolean {
  return state.openBranches.includes(regionCode);
}

/** Purchase branch counts as sales-ready (no separate sales setup fee). */
export function isSalesBranchOpened(state: CompanyOperationalState, regionCode: RegionCode): boolean {
  return state.openSalesBranches.includes(regionCode) || state.openBranches.includes(regionCode);
}

/** @deprecated Use isPurchaseBranchOpened / isSalesBranchOpened. */
export function isRegionAlreadyOpened(state: CompanyOperationalState, regionCode: RegionCode): boolean {
  return isSalesBranchOpened(state, regionCode);
}

export function validateRegionSelection(
  regionCodes: string[],
  state: CompanyOperationalState,
  year: number
): ValidationResult {
  const rules: ValidationRuleResult[] = [];
  const needed = regionsToSelectCount(year, state.selectedRegions.length);

  if (needed === 0) {
    rules.push(fail("R01", "ERR_REGION_NONE_NEEDED", "regionCodes", "No additional regions to select"));
    return result(rules);
  }

  if (regionCodes.length !== needed) {
    rules.push(
      fail("R02", "ERR_REGION_COUNT", "regionCodes", `Select exactly ${needed} region(s) for year ${year}`, {
        needed,
        received: regionCodes.length,
      })
    );
  } else {
    rules.push(pass("R02", `Selected ${needed} region(s)`));
  }

  const unique = new Set(regionCodes);
  if (unique.size !== regionCodes.length) {
    rules.push(fail("R03", "ERR_REGION_DUPLICATE", "regionCodes", "Duplicate regions in selection"));
  } else {
    rules.push(pass("R03", "No duplicate regions"));
  }

  for (const code of regionCodes) {
    if (!isRegionCode(code)) {
      rules.push(fail("R04", "ERR_REGION_INVALID", "regionCodes", `Unknown region: ${code}`));
    } else if (state.selectedRegions.includes(code)) {
      rules.push(fail("R05", "ERR_REGION_ALREADY", "regionCodes", `${code} is already in your operating pool`));
    } else {
      rules.push(pass("R04", `${code} is valid`));
    }
  }

  const totalAfter = state.selectedRegions.length + regionCodes.length;
  if (totalAfter > regionExpansionCap(year)) {
    rules.push(
      fail("R06", "ERR_REGION_CAP", "regionCodes", "Selection exceeds year operating region cap", {
        cap: regionExpansionCap(year),
        totalAfter,
      })
    );
  } else {
    rules.push(pass("R06", "Within year operating region cap"));
  }

  return result(rules);
}

export function applyRegionSelection(
  state: CompanyOperationalState,
  regionCodes: RegionCode[]
): CompanyOperationalState {
  return {
    ...state,
    selectedRegions: [...state.selectedRegions, ...regionCodes],
  };
}
