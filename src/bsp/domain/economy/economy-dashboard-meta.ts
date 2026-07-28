import type { EconomyValues } from "../types";
import type { EconomicPatchRecord } from "../events/event-types";
import { ECONOMY_BOUNDS } from "./economy-variable-meta";

export type EconomyApplyTiming = "IMMEDIATE" | "NEXT_STEP" | "NEXT_HALF";

export interface EconomyDashboardCard {
  id: string;
  label: string;
  unit: string;
  engineKey?: keyof EconomyValues;
  getValue: (values: EconomyValues) => number;
  getBaseline: (baseline: EconomyValues) => number;
  bounds: { min: number; max: number };
  applyTiming: EconomyApplyTiming;
  relatedSteps: string[];
}

export const ECONOMY_DASHBOARD_CARDS: EconomyDashboardCard[] = [
  {
    id: "interestRate",
    label: "금리",
    unit: "%/년",
    engineKey: "interestRateLoan",
    getValue: (v) => v.interestRateLoan,
    getBaseline: (v) => v.interestRateLoan,
    bounds: ECONOMY_BOUNDS.interestRateLoan,
    applyTiming: "NEXT_STEP",
    relatedSteps: ["LOAN", "SETTLEMENT"],
  },
  {
    id: "exchangeRate",
    label: "환율",
    unit: "KRW/USD",
    engineKey: "exchangeRate",
    getValue: (v) => v.exchangeRate,
    getBaseline: (v) => v.exchangeRate,
    bounds: ECONOMY_BOUNDS.exchangeRate,
    applyTiming: "NEXT_STEP",
    relatedSteps: ["MATERIAL", "SALES", "SETTLEMENT"],
  },
  {
    id: "rawMaterial",
    label: "원자재",
    unit: "index",
    engineKey: "rawMaterialIndex",
    getValue: (v) => v.rawMaterialIndex,
    getBaseline: (v) => v.rawMaterialIndex,
    bounds: ECONOMY_BOUNDS.rawMaterialIndex,
    applyTiming: "NEXT_STEP",
    relatedSteps: ["MATERIAL", "PRODUCTION"],
  },
  {
    id: "logistics",
    label: "물류비",
    unit: "×",
    engineKey: "logisticsCostMultiplier",
    getValue: (v) => v.logisticsCostMultiplier,
    getBaseline: (v) => v.logisticsCostMultiplier,
    bounds: ECONOMY_BOUNDS.logisticsCostMultiplier,
    applyTiming: "NEXT_STEP",
    relatedSteps: ["MATERIAL", "SALES"],
  },
  {
    id: "tariff",
    label: "관세",
    unit: "%",
    engineKey: "tariffRate",
    getValue: (v) => v.tariffRate,
    getBaseline: (v) => v.tariffRate,
    bounds: ECONOMY_BOUNDS.tariffRate,
    applyTiming: "NEXT_STEP",
    relatedSteps: ["MATERIAL"],
  },
  {
    id: "demand",
    label: "수요",
    unit: "index",
    engineKey: "marketDemandIndex",
    getValue: (v) => v.marketDemandIndex,
    getBaseline: (v) => v.marketDemandIndex,
    bounds: ECONOMY_BOUNDS.marketDemandIndex,
    applyTiming: "NEXT_STEP",
    relatedSteps: ["SALES", "SETTLEMENT"],
  },
  {
    id: "marketGrowth",
    label: "시장성장률",
    unit: "index",
    engineKey: "techInnovationIndex",
    getValue: (v) => Math.round((v.marketDemandIndex + v.techInnovationIndex) / 2),
    getBaseline: (v) => Math.round((v.marketDemandIndex + v.techInnovationIndex) / 2),
    bounds: { min: 65, max: 140 },
    applyTiming: "NEXT_STEP",
    relatedSteps: ["SALES", "PRODUCTION"],
  },
  {
    id: "inflation",
    label: "물가",
    unit: "index",
    engineKey: "rawMaterialIndex",
    getValue: (v) => Math.round(v.rawMaterialIndex * 0.7 + v.logisticsCostMultiplier * 30),
    getBaseline: (v) => Math.round(v.rawMaterialIndex * 0.7 + v.logisticsCostMultiplier * 30),
    bounds: { min: 50, max: 200 },
    applyTiming: "NEXT_STEP",
    relatedSteps: ["MATERIAL", "PRODUCTION", "SETTLEMENT"],
  },
  {
    id: "competition",
    label: "경쟁강도",
    unit: "index",
    engineKey: "marketSupplyIndex",
    getValue: (v) => Math.round(200 - v.marketSupplyIndex),
    getBaseline: (v) => Math.round(200 - v.marketSupplyIndex),
    bounds: { min: 50, max: 150 },
    applyTiming: "NEXT_STEP",
    relatedSteps: ["MATERIAL", "SALES"],
  },
  {
    id: "energyCost",
    label: "에너지비용",
    unit: "index",
    engineKey: "logisticsCostMultiplier",
    getValue: (v) => Math.round(v.logisticsCostMultiplier * 100),
    getBaseline: (v) => Math.round(v.logisticsCostMultiplier * 100),
    bounds: { min: 50, max: 300 },
    applyTiming: "NEXT_STEP",
    relatedSteps: ["PRODUCTION", "MATERIAL"],
  },
  {
    id: "esgCost",
    label: "ESG비용",
    unit: "index",
    engineKey: "esgPressureIndex",
    getValue: (v) => v.esgPressureIndex,
    getBaseline: (v) => v.esgPressureIndex,
    bounds: ECONOMY_BOUNDS.esgPressureIndex,
    applyTiming: "NEXT_STEP",
    relatedSteps: ["SALES"],
  },
  {
    id: "carbonTax",
    label: "탄소세",
    unit: "만원/단위",
    engineKey: "carbonTaxRatePerUnit",
    getValue: (v) => v.carbonTaxRatePerUnit,
    getBaseline: (v) => v.carbonTaxRatePerUnit,
    bounds: ECONOMY_BOUNDS.carbonTaxRatePerUnit,
    applyTiming: "NEXT_STEP",
    relatedSteps: ["PRODUCTION", "SETTLEMENT"],
  },
  {
    id: "govSupport",
    label: "정부지원",
    unit: "index",
    engineKey: "corporateTaxRate",
    getValue: (v) => Math.round(130 - v.corporateTaxRate - v.tariffRate * 0.5),
    getBaseline: (v) => Math.round(130 - v.corporateTaxRate - v.tariffRate * 0.5),
    bounds: { min: 70, max: 130 },
    applyTiming: "NEXT_HALF",
    relatedSteps: ["SETTLEMENT"],
  },
  {
    id: "businessCycle",
    label: "경기지수",
    unit: "index",
    engineKey: "businessCycleIndex",
    getValue: (v) => v.businessCycleIndex,
    getBaseline: (v) => v.businessCycleIndex,
    bounds: ECONOMY_BOUNDS.businessCycleIndex,
    applyTiming: "NEXT_STEP",
    relatedSteps: ["ALL"],
  },
];

export const APPLY_TIMING_LABELS: Record<EconomyApplyTiming, string> = {
  IMMEDIATE: "즉시 적용",
  NEXT_STEP: "다음 Step부터",
  NEXT_HALF: "다음 반기부터",
};

export function buildDashboardCards(
  live: EconomyValues,
  baseline: EconomyValues,
  patches: EconomicPatchRecord[]
): Array<{
  id: string;
  label: string;
  unit: string;
  currentValue: number;
  baselineValue: number;
  deltaVsBaseline: number;
  applyTiming: EconomyApplyTiming;
  lastModifier: string;
  lastModifiedAt?: string;
  engineKey?: keyof EconomyValues;
}> {
  const lastPatchByKey = new Map<keyof EconomyValues, EconomicPatchRecord>();
  for (const patch of [...patches].reverse()) {
    for (const ch of computePatchKeyChanges(patch)) {
      if (!lastPatchByKey.has(ch.key)) lastPatchByKey.set(ch.key, patch);
    }
  }

  return ECONOMY_DASHBOARD_CARDS.map((card) => {
    const currentValue = card.getValue(live);
    const baselineValue = card.getBaseline(baseline);
    const patch = card.engineKey ? lastPatchByKey.get(card.engineKey) : undefined;
    return {
      id: card.id,
      label: card.label,
      unit: card.unit,
      currentValue,
      baselineValue,
      deltaVsBaseline: Math.round((currentValue - baselineValue) * 10) / 10,
      applyTiming: card.applyTiming,
      lastModifier: patch ? sourceLabel(patch.source) : "기본값",
      lastModifiedAt: patch?.occurredAt.toISOString(),
      engineKey: card.engineKey,
    };
  });
}

function computePatchKeyChanges(patch: EconomicPatchRecord): Array<{ key: keyof EconomyValues }> {
  const keys = new Set<keyof EconomyValues>();
  for (const key of Object.keys(patch.valuesBefore) as (keyof EconomyValues)[]) {
    if (patch.valuesBefore[key] !== patch.valuesAfter[key]) keys.add(key);
  }
  return [...keys].map((key) => ({ key }));
}

function sourceLabel(source: EconomicPatchRecord["source"]): string {
  switch (source) {
    case "EVENT_FIRE":
      return "이벤트";
    case "GM_MANUAL":
      return "GM 수동";
    case "PRESET":
      return "프리셋";
    case "EVENT_END":
      return "이벤트 종료";
    default:
      return source;
  }
}

export function patchToEffects(
  patch: Partial<EconomyValues>
): import("../events/event-types").EconomyPatchEffect[] {
  return (Object.keys(patch) as (keyof EconomyValues)[]).map((key) => ({
    key,
    mode: "ABSOLUTE" as const,
    value: patch[key]!,
  }));
}
