import type { EconomyValues } from "../types";
import type { RegionMaster } from "../regions/region-catalog";

export function effectiveSaleLimit(
  region: RegionMaster,
  economy: EconomyValues,
  regionRemainingMultiplier = 1
): number {
  const demandFactor = economy.marketDemandIndex / 100;
  const esgFactor = economy.esgPressureIndex / 100;
  return Math.floor(region.saleLimit * demandFactor * esgFactor * regionRemainingMultiplier);
}

export function salesLogisticsCostManwon(totalSoldQty: number, economy: EconomyValues): number {
  return Math.round(totalSoldQty * 10 * economy.logisticsCostMultiplier);
}
