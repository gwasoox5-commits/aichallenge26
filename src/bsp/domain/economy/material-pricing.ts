import type { EconomyValues } from "../types";
import type { RegionMaster } from "../regions/region-catalog";

const BASE_EXCHANGE_RATE = 1300;

export function effectiveMaterialUnitPriceManwon(
  region: RegionMaster,
  economy: EconomyValues
): number {
  const indexFactor = economy.rawMaterialIndex / 100;
  const fxFactor = region.importWeighted ? economy.exchangeRate / BASE_EXCHANGE_RATE : 1;
  const tariffFactor = 1 + economy.tariffRate / 100;
  return Math.round(region.materialUnitPriceManwon * indexFactor * fxFactor * tariffFactor);
}

export function effectiveMaterialLimit(
  region: RegionMaster,
  economy: EconomyValues,
  regionRemainingMultiplier = 1
): number {
  const supplyFactor = economy.marketSupplyIndex / 100;
  return Math.floor(region.materialLimit * supplyFactor * regionRemainingMultiplier);
}

export function logisticsCostManwon(
  totalUnits: number,
  economy: EconomyValues
): number {
  return Math.round(totalUnits * 5 * economy.logisticsCostMultiplier);
}
