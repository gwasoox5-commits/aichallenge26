import type { Allocation, StrategyId } from "./strategy";
import type { KpiDelta, KpiSnapshot } from "./kpi";

export type Phase = "start" | "round" | "round-result" | "final";

export type RoundNumber = 1 | 2 | 3 | 4;

export type RoundPhase =
  | "stable"
  | "shock"
  | "transition"
  | "restructuring";

export type CumulativeState = {
  totalPoints: Record<StrategyId, number>;
  aiMaturity: number;
  esgReadiness: number;
  talentBuffer: number;
  rndPipeline: number;
};

export type EffectBreakdown = {
  source: StrategyId | "environment" | "cumulative" | "penalty";
  label: string;
  delta: Partial<KpiDelta>;
};

export type RoundHistory = {
  round: RoundNumber;
  allocation: Allocation;
  kpiBefore: KpiSnapshot;
  kpiAfter: KpiSnapshot;
  delta: KpiDelta;
  breakdown: EffectBreakdown[];
  feedback: string[];
};

export type SimulationState = {
  teamName: string;
  currentRound: RoundNumber;
  phase: Phase;
  kpi: KpiSnapshot;
  cumulative: CumulativeState;
  history: RoundHistory[];
};

export type RoundResult = {
  kpiAfter: KpiSnapshot;
  delta: KpiDelta;
  cumulativeAfter: CumulativeState;
  breakdown: EffectBreakdown[];
  feedback: string[];
};

export type CalcContext = {
  round: RoundNumber;
  kpiBefore: KpiSnapshot;
  allocation: Allocation;
  cumulative: CumulativeState;
};

export type ConditionalEvent = {
  id: string;
  condition: (ctx: CalcContext) => boolean;
  delta: Partial<KpiDelta>;
  message: string;
};

export type RoundEnvironment = {
  round: RoundNumber;
  phase: RoundPhase;
  name: string;
  strategyMultipliers: Record<StrategyId, number>;
  globalKpiDelta: Partial<KpiDelta>;
  conditionalEvents: ConditionalEvent[];
};

export type RoundScenario = {
  round: RoundNumber;
  name: string;
  /** R1 안정기 등 짧은 라운드명 */
  phaseLabel: string;
  environment: string;
  shockOrOpportunity: string;
  /** 외부환경 키워드 태그 */
  keywords: string[];
  discussionQuestions: string[];
};

export type CompanyArchetype =
  | "shortTermFocus"
  | "balancedGrowth"
  | "futureTransitionLeader"
  | "riskDefense"
  | "techOverinvestment";

export type CompanyTypeDefinition = {
  id: CompanyArchetype;
  name: string;
  description: string;
  /** HRD 강사용 한 줄 가이드 */
  facilitatorGuide: string;
  debriefQuestions: string[];
};
