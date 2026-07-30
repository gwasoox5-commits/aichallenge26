import type { MaterialLineForm } from "@/components/bsp/StepMaterialForm";
import type { SalesLineForm } from "@/components/bsp/StepSalesForm";
import type { MaterialPayload, SalesPayload } from "@/src/bsp/domain/types";

export function regionHasBranch(
  regionCode: string,
  openBranches: string[],
  openSalesBranches: string[]
): boolean {
  return openBranches.includes(regionCode) || openSalesBranches.includes(regionCode);
}

function branchInputsForLines<T extends { regionCode: string; qty: number; openBranch: boolean }>(
  lines: T[],
  openBranches: string[],
  openSalesBranches: string[]
) {
  const codes = new Set<string>();
  for (const line of lines) {
    if (regionHasBranch(line.regionCode, openBranches, openSalesBranches)) continue;
    if (line.qty > 0 || line.openBranch) {
      codes.add(line.regionCode);
    }
  }
  return [...codes].map((regionCode) => ({ regionCode }));
}

export function materialBranchInputs(
  lines: MaterialLineForm[],
  openBranches: string[],
  openSalesBranches: string[]
) {
  return branchInputsForLines(lines, openBranches, openSalesBranches);
}

export function salesBranchInputs(
  lines: SalesLineForm[],
  openBranches: string[],
  openSalesBranches: string[]
) {
  return branchInputsForLines(lines, openBranches, openSalesBranches);
}

export function buildMaterialPayload(
  lines: MaterialLineForm[],
  openBranches: string[],
  openSalesBranches: string[]
): MaterialPayload {
  return {
    branches: materialBranchInputs(lines, openBranches, openSalesBranches),
    lines: lines.map((line) => ({
      regionCode: line.regionCode,
      qty: line.qty,
      unitPriceBidManwon: line.unitPriceBidManwon,
    })),
  };
}

export function buildSalesPayload(
  lines: SalesLineForm[],
  openBranches: string[],
  openSalesBranches: string[]
): SalesPayload {
  return {
    branchesNew: salesBranchInputs(lines, openBranches, openSalesBranches),
    lines: lines.map((line) => ({
      regionCode: line.regionCode,
      unitPriceManwon: line.unitPriceManwon,
      qty: line.qty,
    })),
  };
}
