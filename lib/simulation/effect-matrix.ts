import type { KpiId } from "@/types/kpi";
import type { StrategyId } from "@/types/strategy";

export const BASE_EFFECT_MATRIX: Record<
  StrategyId,
  Partial<Record<KpiId, number>>
> = {
  aiAutomation: {
    profit: -0.18,
    productivity: 0.1,
    carbonRisk: -0.04,
    organizationCapability: -0.06,
    futureCompetitiveness: 0.12,
  },
  esg: {
    profit: -0.2,
    revenue: 0.04,
    carbonRisk: -0.35,
    futureCompetitiveness: 0.08,
    supplyStability: 0.05,
  },
  supplyChain: {
    profit: -0.14,
    supplyStability: 0.42,
    revenue: 0.06,
    carbonRisk: 0.03,
  },
  talent: {
    profit: -0.06,
    productivity: 0.08,
    organizationCapability: 0.28,
    futureCompetitiveness: 0.05,
  },
  costReduction: {
    profit: 0.38,
    productivity: 0.06,
    revenue: -0.05,
    carbonRisk: 0.06,
    organizationCapability: -0.08,
    futureCompetitiveness: -0.1,
    supplyStability: -0.07,
  },
  rnd: {
    profit: -0.22,
    revenue: 0.05,
    futureCompetitiveness: 0.32,
    productivity: 0.03,
  },
};
