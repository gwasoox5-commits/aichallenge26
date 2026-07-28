import type { KpiDelta } from "@/types/kpi";
import { COST_OVERINVEST_THRESHOLD } from "./constants";

export function computeCostOverinvestmentPenalty(
  costPoints: number,
): Partial<KpiDelta> {
  const excess = Math.max(0, costPoints - COST_OVERINVEST_THRESHOLD);
  if (excess === 0) return {};

  return {
    profit: -excess * 0.05,
    organizationCapability: -excess * 0.012,
    futureCompetitiveness: -excess * 0.015,
    supplyStability: -excess * 0.008,
    revenue: -excess * 0.01,
    carbonRisk: excess * 0.006,
  };
}

export function computeAiWithoutTalentPenalty(
  aiPoints: number,
  talentPoints: number,
): Partial<KpiDelta> {
  if (aiPoints < 40 || talentPoints >= 10) return {};

  return {
    organizationCapability: -3,
    productivity: -2,
  };
}

export function computeRndUncertainty(
  rndPoints: number,
  round: number,
): Partial<KpiDelta> {
  if (rndPoints >= 30 && round <= 2) {
    return { profit: -1.5 };
  }
  if (rndPoints >= 25 && round >= 3) {
    return { futureCompetitiveness: 2 };
  }
  return {};
}
