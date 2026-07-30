import type { EconomyValues, MaterialInventory, MaterialPayload, SalesPayload } from "../types";
import { DEFAULT_ECONOMY_VALUES } from "../types";
import { effectiveMaterialLimit, effectiveMaterialUnitPriceManwon } from "../economy/material-pricing";
import { effectiveSaleLimit } from "../economy/sales-pricing";
import { getRegion, isRegionCode, type RegionCode } from "../regions/region-catalog";

export interface MaterialBid {
  companyId: string;
  regionCode: RegionCode;
  materials: MaterialInventory;
  totalUnits: number;
  unitPriceBidManwon: number;
}

export interface MaterialAward {
  regionCode: RegionCode;
  awardedUnits: number;
  awardedMaterials: MaterialInventory;
  clearingPriceManwon: number;
  requestedUnits: number;
  requestedPriceManwon: number;
}

export interface SalesBid {
  companyId: string;
  regionCode: RegionCode;
  qty: number;
  unitPriceManwon: number;
}

export interface SalesAward {
  regionCode: RegionCode;
  awardedQty: number;
  clearingPriceManwon: number;
  requestedQty: number;
  requestedPriceManwon: number;
}

function sumMaterials(m: MaterialInventory) {
  return m.A + m.B + m.C + m.D;
}

function scaleMaterials(m: MaterialInventory, awardedUnits: number, totalUnits: number): MaterialInventory {
  if (totalUnits <= 0 || awardedUnits <= 0) return { A: 0, B: 0, C: 0, D: 0 };
  if (awardedUnits >= totalUnits) return { ...m };
  const ratio = awardedUnits / totalUnits;
  return {
    A: Math.floor(m.A * ratio),
    B: Math.floor(m.B * ratio),
    C: Math.floor(m.C * ratio),
    D: Math.floor(m.D * ratio),
  };
}

/** Material: higher bid price wins allocation within regional supply. */
export function clearMaterialRegionBids(bids: MaterialBid[], supplyLimit: number): Map<string, MaterialAward[]> {
  const byCompany = new Map<string, MaterialAward[]>();
  const sorted = [...bids].sort((a, b) => {
    if (b.unitPriceBidManwon !== a.unitPriceBidManwon) return b.unitPriceBidManwon - a.unitPriceBidManwon;
    return a.companyId.localeCompare(b.companyId);
  });

  let remaining = supplyLimit;
  for (const bid of sorted) {
    const awards = byCompany.get(bid.companyId) ?? [];
    if (bid.totalUnits <= 0 || remaining <= 0) {
      awards.push({
        regionCode: bid.regionCode,
        awardedUnits: 0,
        awardedMaterials: { A: 0, B: 0, C: 0, D: 0 },
        clearingPriceManwon: bid.unitPriceBidManwon,
        requestedUnits: bid.totalUnits,
        requestedPriceManwon: bid.unitPriceBidManwon,
      });
      byCompany.set(bid.companyId, awards);
      continue;
    }
    const awardedUnits = Math.min(bid.totalUnits, remaining);
    remaining -= awardedUnits;
    awards.push({
      regionCode: bid.regionCode,
      awardedUnits,
      awardedMaterials: scaleMaterials(bid.materials, awardedUnits, bid.totalUnits),
      clearingPriceManwon: bid.unitPriceBidManwon,
      requestedUnits: bid.totalUnits,
      requestedPriceManwon: bid.unitPriceBidManwon,
    });
    byCompany.set(bid.companyId, awards);
  }
  return byCompany;
}

/** Sales: lower bid price wins allocation within regional demand. */
export function clearSalesRegionBids(bids: SalesBid[], demandLimit: number): Map<string, SalesAward[]> {
  const byCompany = new Map<string, SalesAward[]>();
  const sorted = [...bids].sort((a, b) => {
    if (a.unitPriceManwon !== b.unitPriceManwon) return a.unitPriceManwon - b.unitPriceManwon;
    return a.companyId.localeCompare(b.companyId);
  });

  let remaining = demandLimit;
  for (const bid of sorted) {
    const awards = byCompany.get(bid.companyId) ?? [];
    if (bid.qty <= 0 || remaining <= 0) {
      awards.push({
        regionCode: bid.regionCode,
        awardedQty: 0,
        clearingPriceManwon: bid.unitPriceManwon,
        requestedQty: bid.qty,
        requestedPriceManwon: bid.unitPriceManwon,
      });
      byCompany.set(bid.companyId, awards);
      continue;
    }
    const awardedQty = Math.min(bid.qty, remaining);
    remaining -= awardedQty;
    awards.push({
      regionCode: bid.regionCode,
      awardedQty,
      clearingPriceManwon: bid.unitPriceManwon,
      requestedQty: bid.qty,
      requestedPriceManwon: bid.unitPriceManwon,
    });
    byCompany.set(bid.companyId, awards);
  }
  return byCompany;
}

export function collectMaterialBids(
  companyId: string,
  payload: MaterialPayload,
  economy: EconomyValues = DEFAULT_ECONOMY_VALUES
): MaterialBid[] {
  const bids: MaterialBid[] = [];
  for (const line of payload.lines ?? []) {
    if (!isRegionCode(line.regionCode)) continue;
    const totalUnits = sumMaterials(line.materials);
    if (totalUnits <= 0) continue;
    const region = getRegion(line.regionCode);
    bids.push({
      companyId,
      regionCode: line.regionCode,
      materials: line.materials,
      totalUnits,
      unitPriceBidManwon: line.unitPriceBidManwon ?? effectiveMaterialUnitPriceManwon(region, economy),
    });
  }
  return bids;
}

export function collectSalesBids(companyId: string, payload: SalesPayload): SalesBid[] {
  const bids: SalesBid[] = [];
  for (const line of payload.lines ?? []) {
    if (!isRegionCode(line.regionCode)) continue;
    if (line.qty <= 0) continue;
    bids.push({
      companyId,
      regionCode: line.regionCode,
      qty: line.qty,
      unitPriceManwon: line.unitPriceManwon,
    });
  }
  return bids;
}

export function clearMaterialBids(
  allBids: MaterialBid[],
  economy: EconomyValues,
  regionRemainingMultiplier = 1
): Map<string, MaterialAward[]> {
  const result = new Map<string, MaterialAward[]>();
  const byRegion = new Map<RegionCode, MaterialBid[]>();
  for (const bid of allBids) {
    const list = byRegion.get(bid.regionCode) ?? [];
    list.push(bid);
    byRegion.set(bid.regionCode, list);
  }
  for (const [regionCode, regionBids] of byRegion) {
    const region = getRegion(regionCode);
    const limit = effectiveMaterialLimit(region, economy, regionRemainingMultiplier);
    const regionAwards = clearMaterialRegionBids(regionBids, limit);
    for (const [companyId, awards] of regionAwards) {
      const existing = result.get(companyId) ?? [];
      result.set(companyId, [...existing, ...awards]);
    }
  }
  return result;
}

export function clearSalesBids(
  allBids: SalesBid[],
  economy: EconomyValues,
  regionRemainingMultiplier = 1
): Map<string, SalesAward[]> {
  const result = new Map<string, SalesAward[]>();
  const byRegion = new Map<RegionCode, SalesBid[]>();
  for (const bid of allBids) {
    const list = byRegion.get(bid.regionCode) ?? [];
    list.push(bid);
    byRegion.set(bid.regionCode, list);
  }
  for (const [regionCode, regionBids] of byRegion) {
    const region = getRegion(regionCode);
    const limit = effectiveSaleLimit(region, economy, regionRemainingMultiplier);
    const regionAwards = clearSalesRegionBids(regionBids, limit);
    for (const [companyId, awards] of regionAwards) {
      const existing = result.get(companyId) ?? [];
      result.set(companyId, [...existing, ...awards]);
    }
  }
  return result;
}

export function buildAwardedMaterialPayload(
  payload: MaterialPayload,
  awards: MaterialAward[]
): MaterialPayload {
  const awardByRegion = new Map(awards.map((a) => [a.regionCode, a]));
  return {
    branches: payload.branches,
    lines: (payload.lines ?? []).map((line) => {
      const award = awardByRegion.get(line.regionCode as RegionCode);
      if (!award || award.awardedUnits <= 0) {
        return {
          regionCode: line.regionCode,
          materials: { A: 0, B: 0, C: 0, D: 0 },
          unitPriceBidManwon: line.unitPriceBidManwon,
        };
      }
      return {
        regionCode: line.regionCode,
        materials: award.awardedMaterials,
        unitPriceBidManwon: award.clearingPriceManwon,
      };
    }),
  };
}

export function buildAwardedSalesPayload(payload: SalesPayload, awards: SalesAward[]): SalesPayload {
  const awardByRegion = new Map(awards.map((a) => [a.regionCode, a]));
  return {
    branchesNew: payload.branchesNew,
    lines: (payload.lines ?? []).map((line) => {
      const award = awardByRegion.get(line.regionCode as RegionCode);
      if (!award) {
        return { ...line, qty: 0 };
      }
      return {
        regionCode: line.regionCode,
        unitPriceManwon: award.clearingPriceManwon,
        qty: award.awardedQty,
      };
    }),
  };
}

export const BID_WORKFLOW_STEPS = ["MATERIAL", "SALES"] as const;
export type BidWorkflowStep = (typeof BID_WORKFLOW_STEPS)[number];

export function isBidWorkflowStep(step: string): step is BidWorkflowStep {
  return (BID_WORKFLOW_STEPS as readonly string[]).includes(step);
}
