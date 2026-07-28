import type { KpiDelta } from "@/types/kpi";
import type {
  CalcContext,
  ConditionalEvent,
  RoundEnvironment,
  RoundNumber,
} from "@/types/simulation";
import type { StrategyId } from "@/types/strategy";

const R1_MULTIPLIERS: Record<StrategyId, number> = {
  aiAutomation: 0.85,
  esg: 0.7,
  supplyChain: 0.55,
  talent: 1.1,
  costReduction: 1.15,
  rnd: 0.9,
};

const R2_MULTIPLIERS: Record<StrategyId, number> = {
  aiAutomation: 0.95,
  esg: 0.8,
  supplyChain: 1.85,
  talent: 1.15,
  costReduction: 1.3,
  rnd: 0.75,
};

const R3_MULTIPLIERS: Record<StrategyId, number> = {
  aiAutomation: 1.4,
  esg: 1.45,
  supplyChain: 1.15,
  talent: 1.25,
  costReduction: 0.9,
  rnd: 1.2,
};

const R4_MULTIPLIERS: Record<StrategyId, number> = {
  aiAutomation: 1.55,
  esg: 1.35,
  supplyChain: 1.0,
  talent: 1.2,
  costReduction: 0.85,
  rnd: 1.5,
};

const R1_GLOBAL: Partial<KpiDelta> = {
  revenue: 0.5,
  profit: 0.5,
  productivity: 0.3,
  carbonRisk: 0.5,
  supplyStability: 0.5,
  futureCompetitiveness: 0.3,
};

const R2_GLOBAL: Partial<KpiDelta> = {
  revenue: -3.0,
  profit: -4.5,
  productivity: -1.0,
  carbonRisk: 1.5,
  supplyStability: -6.0,
  organizationCapability: -1.0,
  futureCompetitiveness: -0.5,
};

const R3_GLOBAL: Partial<KpiDelta> = {
  revenue: -1.0,
  profit: -2.0,
  productivity: 0.5,
  carbonRisk: 3.0,
  supplyStability: -1.5,
  organizationCapability: -0.5,
  futureCompetitiveness: 1.0,
};

const R4_GLOBAL: Partial<KpiDelta> = {
  revenue: 1.0,
  profit: 0.5,
  productivity: 1.0,
  carbonRisk: 1.0,
  supplyStability: 0.5,
  futureCompetitiveness: 2.0,
};

const R2_EVENTS: ConditionalEvent[] = [
  {
    id: "shock-unprepared-supply",
    condition: ({ allocation }) => allocation.supplyChain < 15,
    delta: { supplyStability: -4, revenue: -2 },
    message: "공급망 투자 부족으로 납기 차질이 매출에 영향",
  },
];

const R3_EVENTS: ConditionalEvent[] = [
  {
    id: "carbon-regulation-gap",
    condition: ({ kpiBefore, allocation }) =>
      kpiBefore.carbonRisk > 52 && allocation.esg < 12,
    delta: { revenue: -5, carbonRisk: 4 },
    message: "탄소 규제 대응 미흡으로 수출 제약 발생",
  },
  {
    id: "transition-synergy",
    condition: ({ allocation }) =>
      allocation.aiAutomation >= 15 && allocation.esg >= 15,
    delta: { futureCompetitiveness: 3, productivity: 2 },
    message: "AI·ESG 동시 투자로 전환기 시너지 확보",
  },
];

const R4_EVENTS: ConditionalEvent[] = [
  {
    id: "restructuring-leader",
    condition: ({ cumulative }) =>
      cumulative.aiMaturity >= 0.35 &&
      cumulative.esgReadiness >= 0.25 &&
      cumulative.talentBuffer >= 0.25,
    delta: { futureCompetitiveness: 4, revenue: 3 },
    message: "4년간 전환 투자가 재편기에서 경쟁 우위로 결실",
  },
  {
    id: "restructuring-laggard",
    condition: ({ cumulative, kpiBefore }) =>
      cumulative.totalPoints.costReduction > 120 &&
      kpiBefore.futureCompetitiveness < 58,
    delta: { futureCompetitiveness: -3, revenue: -2 },
    message: "단기 원가 중심 경영 누적으로 성장 기회 상실",
  },
];

export const ROUND_ENVIRONMENTS: Record<RoundNumber, RoundEnvironment> = {
  1: {
    round: 1,
    phase: "stable",
    name: "R1 안정기",
    strategyMultipliers: R1_MULTIPLIERS,
    globalKpiDelta: R1_GLOBAL,
    conditionalEvents: [],
  },
  2: {
    round: 2,
    phase: "shock",
    name: "R2 충격기",
    strategyMultipliers: R2_MULTIPLIERS,
    globalKpiDelta: R2_GLOBAL,
    conditionalEvents: R2_EVENTS,
  },
  3: {
    round: 3,
    phase: "transition",
    name: "R3 전환기",
    strategyMultipliers: R3_MULTIPLIERS,
    globalKpiDelta: R3_GLOBAL,
    conditionalEvents: R3_EVENTS,
  },
  4: {
    round: 4,
    phase: "restructuring",
    name: "R4 재편기",
    strategyMultipliers: R4_MULTIPLIERS,
    globalKpiDelta: R4_GLOBAL,
    conditionalEvents: R4_EVENTS,
  },
};
