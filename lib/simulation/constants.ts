import type { KpiSnapshot } from "@/types/kpi";
import type { CumulativeState } from "@/types/simulation";
import type { StrategyId } from "@/types/strategy";

export const INITIAL_KPI: KpiSnapshot = {
  revenue: 72,
  profit: 68,
  productivity: 70,
  carbonRisk: 58,
  supplyStability: 65,
  organizationCapability: 68,
  futureCompetitiveness: 62,
};

export const INITIAL_CUMULATIVE: CumulativeState = {
  totalPoints: {
    aiAutomation: 0,
    esg: 0,
    supplyChain: 0,
    talent: 0,
    costReduction: 0,
    rnd: 0,
  },
  aiMaturity: 0,
  esgReadiness: 0,
  talentBuffer: 0,
  rndPipeline: 0,
};

export const SCORE_WEIGHTS: Record<keyof KpiSnapshot, number> = {
  revenue: 0.15,
  profit: 0.15,
  productivity: 0.12,
  carbonRisk: 0.12,
  supplyStability: 0.12,
  organizationCapability: 0.14,
  futureCompetitiveness: 0.2,
};

export const STRATEGY_LABELS: Record<StrategyId, string> = {
  aiAutomation: "AI 자동화 투자",
  esg: "친환경/탄소감축 투자",
  supplyChain: "글로벌 공급망 다변화",
  talent: "인재 육성 투자",
  costReduction: "원가절감 투자",
  rnd: "신사업/R&D 투자",
};

export const TALENT_IMMEDIATE_SCALE = 0.7;
export const COST_OVERINVEST_THRESHOLD = 35;

export const DEFAULT_ALLOCATION: Record<StrategyId, number> = {
  aiAutomation: 17,
  esg: 17,
  supplyChain: 17,
  talent: 17,
  costReduction: 16,
  rnd: 16,
};

export function createInitialCumulative(): CumulativeState {
  return {
    totalPoints: {
      aiAutomation: 0,
      esg: 0,
      supplyChain: 0,
      talent: 0,
      costReduction: 0,
      rnd: 0,
    },
    aiMaturity: 0,
    esgReadiness: 0,
    talentBuffer: 0,
    rndPipeline: 0,
  };
}
