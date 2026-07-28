/** V3.0 — Regional & industry layer initialization */

import type { IndustryId, IndustryState, RegionalState, WorldRegionId } from "./types";

export const REGION_DEFS: Array<{ id: WorldRegionId; label: string }> = [
  { id: "NORTH_AMERICA", label: "북미" },
  { id: "EUROPE", label: "유럽" },
  { id: "CHINA", label: "중국" },
  { id: "KOREA", label: "한국" },
  { id: "SOUTHEAST_ASIA", label: "동남아" },
];

export const INDUSTRY_DEFS: Array<{ id: IndustryId; label: string }> = [
  { id: "AUTOMOTIVE", label: "자동차" },
  { id: "SEMICONDUCTOR", label: "반도체" },
  { id: "BATTERY", label: "배터리" },
  { id: "STEEL", label: "철강" },
  { id: "CHEMICAL", label: "화학" },
  { id: "CONSUMER", label: "소비재" },
];

const REGION_PROFILE_OFFSETS: Record<
  WorldRegionId,
  Partial<{ growth: number; stability: number; tradeOpenness: number; riskLevel: number }>
> = {
  NORTH_AMERICA: { growth: 10, stability: 15, tradeOpenness: 70, riskLevel: 30 },
  EUROPE: { growth: 5, stability: 10, tradeOpenness: 65, riskLevel: 40 },
  CHINA: { growth: 15, stability: 5, tradeOpenness: 55, riskLevel: 55 },
  KOREA: { growth: 8, stability: 12, tradeOpenness: 75, riskLevel: 45 },
  SOUTHEAST_ASIA: { growth: 12, stability: 8, tradeOpenness: 60, riskLevel: 50 },
};

const INDUSTRY_SENSITIVITY: Record<
  IndustryId,
  { demandBase: number; costBase: number; innovationBase: number; multiplier: number }
> = {
  AUTOMOTIVE: { demandBase: 55, costBase: 50, innovationBase: 60, multiplier: 1.0 },
  SEMICONDUCTOR: { demandBase: 70, costBase: 45, innovationBase: 85, multiplier: 1.3 },
  BATTERY: { demandBase: 75, costBase: 55, innovationBase: 70, multiplier: 1.2 },
  STEEL: { demandBase: 45, costBase: 60, innovationBase: 35, multiplier: 0.9 },
  CHEMICAL: { demandBase: 50, costBase: 55, innovationBase: 45, multiplier: 0.95 },
  CONSUMER: { demandBase: 60, costBase: 45, innovationBase: 40, multiplier: 0.85 },
};

function clamp(v: number) {
  return Math.max(0, Math.min(100, Math.round(v)));
}

export function buildInitialRegions(globalGrowth: number, tradeEnv: number): RegionalState[] {
  return REGION_DEFS.map(({ id, label }) => {
    const off = REGION_PROFILE_OFFSETS[id];
    return {
      regionId: id,
      label,
      growth: clamp(globalGrowth + (off.growth ?? 0) - 50),
      stability: clamp(50 + (off.stability ?? 0)),
      tradeOpenness: clamp((off.tradeOpenness ?? 50) + (tradeEnv - 50) * 0.3),
      riskLevel: clamp(off.riskLevel ?? 50),
    };
  });
}

export function buildInitialIndustries(techInnovation: number, supplyStability: number): IndustryState[] {
  return INDUSTRY_DEFS.map(({ id, label }) => {
    const s = INDUSTRY_SENSITIVITY[id];
    return {
      industryId: id,
      label,
      demandIndex: clamp(s.demandBase + (techInnovation - 50) * 0.2),
      costPressure: clamp(s.costBase + (100 - supplyStability) * 0.3),
      innovationIndex: clamp(s.innovationBase + (techInnovation - 50) * 0.4),
      impactMultiplier: s.multiplier,
    };
  });
}

export function applyIndustryImpact(
  industries: IndustryState[],
  impacts: Partial<Record<IndustryId, number>>
): IndustryState[] {
  return industries.map((ind) => {
    const delta = impacts[ind.industryId];
    if (delta == null) return ind;
    return {
      ...ind,
      demandIndex: clamp(ind.demandIndex + delta),
      costPressure: clamp(ind.costPressure + delta * 0.5),
    };
  });
}

export function applyRegionalImpact(
  regions: RegionalState[],
  impacts: Partial<Record<WorldRegionId, number>>
): RegionalState[] {
  return regions.map((r) => {
    const delta = impacts[r.regionId];
    if (delta == null) return r;
    return {
      ...r,
      growth: clamp(r.growth + delta),
      riskLevel: clamp(r.riskLevel + delta * 0.3),
    };
  });
}

export function computeIndustryEventWeight(
  industries: IndustryState[],
  focusAreas: string[]
): IndustryId[] {
  const focusMap: Record<string, IndustryId[]> = {
    공급망: ["SEMICONDUCTOR", "AUTOMOTIVE", "BATTERY"],
    재무: ["CONSUMER", "STEEL"],
    혁신: ["SEMICONDUCTOR", "BATTERY"],
    ESG: ["CHEMICAL", "AUTOMOTIVE"],
    원가: ["STEEL", "CHEMICAL", "BATTERY"],
  };

  const weighted = new Set<IndustryId>();
  for (const area of focusAreas) {
    for (const id of focusMap[area] ?? []) weighted.add(id);
  }
  if (weighted.size === 0) return industries.map((i) => i.industryId);
  return [...weighted];
}
