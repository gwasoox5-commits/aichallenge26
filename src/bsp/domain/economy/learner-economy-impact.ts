import type { EconomyValues } from "../types";
import type { RegionCode } from "../regions/region-catalog";
import { getRegion, REGION_CATALOG } from "../regions/region-catalog";
import { computeChanges } from "./economy-engine";
import { effectiveMaterialUnitPriceManwon } from "./material-pricing";
import { effectiveSaleLimit } from "./sales-pricing";

export const LEARNER_IMPACT_REGION: RegionCode = "ASIA";

const LEARNER_IMPACT_KEYS: ReadonlySet<keyof EconomyValues> = new Set([
  "rawMaterialIndex",
  "marketDemandIndex",
  "marketSupplyIndex",
  "tariffRate",
  "businessCycleIndex",
  "exchangeRate",
  "logisticsCostMultiplier",
]);

export interface LearnerEconomyKeyChange {
  key: keyof EconomyValues;
  label: string;
  before: number;
  after: number;
}

export interface LearnerGameplayMetrics {
  regionCode: RegionCode;
  regionDisplayName: string;
  materialUnitPriceManwon: { before: number; after: number };
  saleLimit: { before: number; after: number };
}

export interface LearnerPeriodImpact {
  indexChanges: LearnerEconomyKeyChange[];
  regions: LearnerGameplayMetrics[];
}

export interface LearnerEventImpact {
  eventId: string;
  title: string;
  applyTiming: string;
  indexChanges: LearnerEconomyKeyChange[];
  regions: LearnerGameplayMetrics[];
}

export function buildLearnerIndexChanges(
  valuesBefore: EconomyValues,
  valuesAfter: EconomyValues
): LearnerEconomyKeyChange[] {
  return computeChanges(valuesBefore, valuesAfter)
    .filter((c) => LEARNER_IMPACT_KEYS.has(c.key))
    .map((c) => ({ key: c.key, label: c.label, before: c.before, after: c.after }));
}

export function buildLearnerGameplayMetrics(
  valuesBefore: EconomyValues,
  valuesAfter: EconomyValues,
  regionCode: RegionCode = LEARNER_IMPACT_REGION
): LearnerGameplayMetrics {
  const region = getRegion(regionCode);
  return {
    regionCode,
    regionDisplayName: region.displayName,
    materialUnitPriceManwon: {
      before: effectiveMaterialUnitPriceManwon(region, valuesBefore),
      after: effectiveMaterialUnitPriceManwon(region, valuesAfter),
    },
    saleLimit: {
      before: effectiveSaleLimit(region, valuesBefore),
      after: effectiveSaleLimit(region, valuesAfter),
    },
  };
}

export function buildLearnerGameplayMetricsAllRegions(
  valuesBefore: EconomyValues,
  valuesAfter: EconomyValues
): LearnerGameplayMetrics[] {
  return REGION_CATALOG.map((region) =>
    buildLearnerGameplayMetrics(valuesBefore, valuesAfter, region.code)
  );
}

export function buildLearnerPeriodImpact(
  periodOpen: EconomyValues,
  live: EconomyValues
): LearnerPeriodImpact {
  return {
    indexChanges: buildLearnerIndexChanges(periodOpen, live),
    regions: buildLearnerGameplayMetricsAllRegions(periodOpen, live),
  };
}

export function hasVisibleLearnerImpact(
  indexChanges: LearnerEconomyKeyChange[],
  regions: LearnerGameplayMetrics[]
): boolean {
  if (indexChanges.length > 0) return true;
  return regions.some(
    (r) =>
      r.materialUnitPriceManwon.before !== r.materialUnitPriceManwon.after ||
      r.saleLimit.before !== r.saleLimit.after
  );
}
