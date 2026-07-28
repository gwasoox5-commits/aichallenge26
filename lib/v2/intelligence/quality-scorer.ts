import type {
  IntelligenceScenario,
  NewsAnalysis,
  ScenarioQualityScore,
} from "./types";

const REGENERATE_THRESHOLD = 55;

function avg(nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0) / (nums.length || 1);
}

function scoreRealism(analysis: NewsAnalysis, scenarios: IntelligenceScenario[]): number {
  const hasCitations = analysis.citations.length > 0;
  const hasIssues = analysis.keyIssues.length >= 2;
  const narrativeDepth = scenarios.every((s) => s.description.length > 20);
  let score = 50;
  if (hasCitations) score += 15;
  if (hasIssues) score += 10;
  if (narrativeDepth) score += 15;
  if (analysis.isEstimate) score -= 5;
  return Math.min(100, Math.max(0, score));
}

function scoreLogic(scenarios: IntelligenceScenario[]): number {
  const assumptionsOk = scenarios.every((s) => s.assumptions.length >= 1);
  const outcomesOk = scenarios.every((s) => s.expectedOutcomes.length >= 1);
  let score = 55;
  if (assumptionsOk) score += 20;
  if (outcomesOk) score += 15;
  const pessimistic = scenarios.find((s) => s.scenarioKey === "pessimistic");
  const optimistic = scenarios.find((s) => s.scenarioKey === "optimistic");
  if (pessimistic && optimistic && pessimistic.description !== optimistic.description) score += 10;
  return Math.min(100, score);
}

function scoreEconomicConsistency(scenarios: IntelligenceScenario[]): number {
  const impacts = scenarios.flatMap((s) => s.variableImpacts);
  if (impacts.length === 0) return 30;
  const clampedRatio =
    impacts.filter((i) => i.proposedValue !== i.clampedValue).length / impacts.length;
  const lowConfRatio = impacts.filter((i) => i.confidence === "LOW").length / impacts.length;
  let score = 70 - clampedRatio * 20 - lowConfRatio * 15;
  const hasCoreVars = impacts.some((i) =>
    ["demand", "tariff", "exchangeRate", "rawMaterialCost"].includes(i.key)
  );
  if (hasCoreVars) score += 10;
  return Math.min(100, Math.max(0, Math.round(score)));
}

function scoreEducationValue(analysis: NewsAnalysis, scenarios: IntelligenceScenario[]): number {
  let score = 45;
  if (analysis.riskFactors.length >= 2) score += 15;
  if (analysis.opportunityFactors.length >= 1) score += 10;
  if (scenarios.some((s) => s.assumptions.length >= 2)) score += 15;
  if (analysis.keyIssues.length >= 3) score += 15;
  return Math.min(100, score);
}

function scoreDiversity(scenarios: IntelligenceScenario[]): number {
  const texts = scenarios.map((s) => s.description);
  const unique = new Set(texts).size;
  return unique === 3 ? 85 : unique === 2 ? 60 : 35;
}

function scoreGameFit(scenarios: IntelligenceScenario[]): number {
  const keys = new Set(scenarios.flatMap((s) => s.variableImpacts.map((v) => v.key)));
  const coverage = keys.size / 14;
  return Math.min(100, Math.round(50 + coverage * 50));
}

export function scoreScenarioQuality(
  analysis: NewsAnalysis,
  scenarios: IntelligenceScenario[]
): ScenarioQualityScore {
  const realism = scoreRealism(analysis, scenarios);
  const logic = scoreLogic(scenarios);
  const economicConsistency = scoreEconomicConsistency(scenarios);
  const educationValue = scoreEducationValue(analysis, scenarios);
  const diversity = scoreDiversity(scenarios);
  const gameFit = scoreGameFit(scenarios);
  const overall = Math.round(avg([realism, logic, economicConsistency, educationValue, diversity, gameFit]));

  const notes: string[] = [];
  if (economicConsistency < 60) notes.push("경제 변수 영향의 일관성이 낮습니다. 재생성을 권장합니다.");
  if (diversity < 60) notes.push("시나리오 간 차별성이 부족합니다.");
  if (analysis.confidenceLabel === "LOW") notes.push("뉴스 분석 신뢰도가 낮습니다. GM 검토 필수.");
  if (realism < 60) notes.push("현실성 점수가 낮습니다. 출처·가정을 보완하세요.");

  const recommendRegenerate = overall < REGENERATE_THRESHOLD;

  return {
    realism,
    logic,
    economicConsistency,
    educationValue,
    diversity,
    gameFit,
    overall,
    recommendRegenerate,
    notes,
  };
}

export function qualityBadgeTone(overall: number): "green" | "amber" | "red" {
  if (overall >= 75) return "green";
  if (overall >= 55) return "amber";
  return "red";
}
