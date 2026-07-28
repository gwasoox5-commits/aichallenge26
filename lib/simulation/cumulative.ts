import type { CumulativeState, RoundNumber } from "@/types/simulation";
import type { Allocation } from "@/types/strategy";
import { clamp01 } from "./formulas";

export function getTalentAmplifier(talentBuffer: number): number {
  return 1 + talentBuffer * 0.5;
}

export function getAiLateBonus(
  round: RoundNumber,
  maturity: number,
): number {
  if (round >= 3) return 1 + maturity * 0.8;
  return 1 + maturity * 0.3;
}

export function getEsgLateMultiplier(
  round: RoundNumber,
  readiness: number,
): number {
  if (round >= 3) return 1 + readiness * 0.6;
  return 1;
}

export function computeRndRevenueLag(
  round: RoundNumber,
  cumulative: CumulativeState,
): number {
  const scale = round >= 2 ? 1 : 0.3;
  return cumulative.totalPoints.rnd * 0.015 * scale;
}

export function updateCumulative(
  prev: CumulativeState,
  allocation: Allocation,
): CumulativeState {
  const totalPoints = { ...prev.totalPoints };
  for (const key of Object.keys(allocation) as (keyof Allocation)[]) {
    totalPoints[key] += allocation[key];
  }

  return {
    totalPoints,
    aiMaturity: clamp01(prev.aiMaturity + allocation.aiAutomation * 0.004),
    esgReadiness: clamp01(prev.esgReadiness + allocation.esg * 0.0035),
    talentBuffer: clamp01(prev.talentBuffer + allocation.talent * 0.004),
    rndPipeline: clamp01(prev.rndPipeline + allocation.rnd * 0.004),
  };
}
