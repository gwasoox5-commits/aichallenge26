import type { KpiDelta } from "@/types/kpi";
import type {
  CumulativeState,
  EffectBreakdown,
  RoundNumber,
  RoundResult,
} from "@/types/simulation";
import type { Allocation, StrategyId } from "@/types/strategy";
import type { KpiSnapshot } from "@/types/kpi";
import { STRATEGY_IDS } from "@/types/strategy";
import {
  STRATEGY_LABELS,
  TALENT_IMMEDIATE_SCALE,
} from "./constants";
import {
  computeRndRevenueLag,
  getAiLateBonus,
  getEsgLateMultiplier,
  getTalentAmplifier,
  updateCumulative,
} from "./cumulative";
import { BASE_EFFECT_MATRIX } from "./effect-matrix";
import {
  addDelta,
  addKpi,
  clampKpi,
  hasAnyNonZero,
  matrixToDelta,
  zeroDelta,
} from "./formulas";
import { generateFeedback } from "./feedback";
import {
  computeAiWithoutTalentPenalty,
  computeCostOverinvestmentPenalty,
  computeRndUncertainty,
} from "./penalties";
import { ROUND_ENVIRONMENTS } from "./round-environments";

function computeStrategyDelta(
  strategy: StrategyId,
  points: number,
  round: RoundNumber,
  cumulative: CumulativeState,
): KpiDelta {
  const env = ROUND_ENVIRONMENTS[round];
  const roundMul = env.strategyMultipliers[strategy];
  let delta = matrixToDelta(BASE_EFFECT_MATRIX[strategy], points, roundMul);

  if (strategy === "talent") {
    delta = {
      ...delta,
      productivity: delta.productivity * TALENT_IMMEDIATE_SCALE,
      organizationCapability:
        delta.organizationCapability * TALENT_IMMEDIATE_SCALE,
      futureCompetitiveness:
        delta.futureCompetitiveness * TALENT_IMMEDIATE_SCALE,
      profit: delta.profit * TALENT_IMMEDIATE_SCALE,
    };
  }

  if (strategy === "aiAutomation") {
    const late = getAiLateBonus(round, cumulative.aiMaturity);
    delta.productivity *= late;
    delta.futureCompetitiveness *= late;
    if (round >= 3) {
      delta.profit += points * 0.06;
    }
  }

  if (strategy === "esg") {
    const late = getEsgLateMultiplier(round, cumulative.esgReadiness);
    if (round >= 3) {
      delta.revenue *= late;
      delta.futureCompetitiveness *= late;
      delta.carbonRisk *= late;
    }
  }

  if (strategy === "aiAutomation" || strategy === "rnd") {
    const amp = getTalentAmplifier(cumulative.talentBuffer);
    delta.productivity *= amp;
    delta.futureCompetitiveness *= amp;
    if (round >= 3) {
      delta.profit *= 1 + (amp - 1) * 0.4;
    }
  }

  return delta;
}

export function computeRound(
  round: RoundNumber,
  kpiBefore: KpiSnapshot,
  allocation: Allocation,
  cumulative: CumulativeState,
): RoundResult {
  const env = ROUND_ENVIRONMENTS[round];
  const breakdown: EffectBreakdown[] = [];
  let delta = zeroDelta();

  for (const strategy of STRATEGY_IDS) {
    const points = allocation[strategy];
    const strategyDelta = computeStrategyDelta(
      strategy,
      points,
      round,
      cumulative,
    );
    delta = addDelta(delta, strategyDelta);
    breakdown.push({
      source: strategy,
      label: STRATEGY_LABELS[strategy],
      delta: strategyDelta,
    });
  }

  const revenueLag = computeRndRevenueLag(round, cumulative);
  if (revenueLag !== 0) {
    delta.revenue += revenueLag;
    breakdown.push({
      source: "cumulative",
      label: "R&D 누적 매출 효과",
      delta: { revenue: revenueLag },
    });
  }

  const costPenalty = computeCostOverinvestmentPenalty(
    allocation.costReduction,
  );
  if (hasAnyNonZero(costPenalty)) {
    delta = addDelta(delta, costPenalty);
    breakdown.push({
      source: "penalty",
      label: "원가절감 과투자",
      delta: costPenalty,
    });
  }

  const aiPenalty = computeAiWithoutTalentPenalty(
    allocation.aiAutomation,
    allocation.talent,
  );
  if (hasAnyNonZero(aiPenalty)) {
    delta = addDelta(delta, aiPenalty);
    breakdown.push({
      source: "penalty",
      label: "AI·인재 불균형",
      delta: aiPenalty,
    });
  }

  const rndUncertainty = computeRndUncertainty(allocation.rnd, round);
  if (hasAnyNonZero(rndUncertainty)) {
    delta = addDelta(delta, rndUncertainty);
    breakdown.push({
      source: "penalty",
      label: "R&D 불확실성",
      delta: rndUncertainty,
    });
  }

  delta = addDelta(delta, env.globalKpiDelta);
  breakdown.push({
    source: "environment",
    label: `${env.name} 환경`,
    delta: env.globalKpiDelta,
  });

  const ctx = { round, kpiBefore, allocation, cumulative };
  for (const event of env.conditionalEvents) {
    if (event.condition(ctx)) {
      delta = addDelta(delta, event.delta);
      breakdown.push({
        source: "environment",
        label: event.message,
        delta: event.delta,
      });
    }
  }

  if (round === 4) {
    const rndBonus = { futureCompetitiveness: cumulative.rndPipeline * 8 };
    delta = addDelta(delta, rndBonus);
    breakdown.push({
      source: "cumulative",
      label: "R&D 누적 결산",
      delta: rndBonus,
    });
  }

  const kpiAfter = clampKpi(addKpi(kpiBefore, delta));
  const cumulativeAfter = updateCumulative(cumulative, allocation);
  const feedback = generateFeedback(round, allocation, delta, cumulativeAfter);

  return {
    kpiAfter,
    delta,
    cumulativeAfter,
    breakdown,
    feedback,
  };
}
