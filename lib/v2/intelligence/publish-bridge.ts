/**
 * V2.4 — Bridge IntelligencePreview → EventScenarioStudioOutput / Draft
 */

import type { EconomyPatchEffect } from "@/src/bsp/domain/events/event-types";
import type { GmActor } from "@/src/bsp/domain/gm/audit-types";
import { buildOutcomesFromOutput } from "@/lib/v2/event-studio/bounds-preview";
import type {
  EventScenarioDraft,
  EventScenarioStudioOutput,
  EventStudioInput,
  NewsSeverity,
  ScenarioKey,
  ScenarioOutlook,
  StudioVariableEffect,
} from "@/lib/v2/event-studio/types";
import type { EconomyValues } from "@/src/bsp/domain/types";
import type { IntelligencePreview, IntelligenceScenario, NewsAnalysis } from "./types";
import { LEARNER_EVENT_DISCLAIMER } from "@/lib/bsp/learner-event-copy";

const CATEGORY_KEYWORDS: Array<{ keyword: string; category: string }> = [
  { keyword: "환율", category: "환율" },
  { keyword: "금리", category: "금리" },
  { keyword: "관세", category: "관세" },
  { keyword: "공급", category: "공급망" },
  { keyword: "원자재", category: "원자재" },
  { keyword: "경쟁", category: "경쟁사" },
  { keyword: "보조금", category: "정부정책" },
  { keyword: "ESG", category: "정부정책" },
  { keyword: "에너지", category: "원자재" },
  { keyword: "항만", category: "공급망" },
  { keyword: "노사", category: "정부정책" },
];

function inferCategory(analysis: NewsAnalysis, articles: IntelligencePreview["articles"]): string {
  const text = [
    analysis.eventSummary,
    ...analysis.keyIssues,
    ...articles.map((a) => a.title),
  ].join(" ");
  for (const { keyword, category } of CATEGORY_KEYWORDS) {
    if (text.includes(keyword)) return category;
  }
  return "정부정책";
}

function inferSeverity(analysis: NewsAnalysis): NewsSeverity {
  const riskCount = analysis.riskFactors.length;
  if (riskCount >= 4) return "CRITICAL";
  if (riskCount >= 3) return "HIGH";
  if (riskCount >= 2) return "MEDIUM";
  return "LOW";
}

function impactsToEffects(scenario: IntelligenceScenario): StudioVariableEffect[] {
  return scenario.variableImpacts.map((v) => ({
    key: v.key,
    mode: v.mode,
    value: v.clampedValue,
    rationale: v.reason,
    isEstimate: v.isEstimate,
  }));
}

function buildOutlook(
  scenario: IntelligenceScenario,
  analysis: NewsAnalysis,
  headline: string,
  severity: NewsSeverity
): ScenarioOutlook {
  const articleBody = [
    scenario.description,
    "",
    "주요 가정:",
    ...scenario.assumptions
      .filter((a) => !/GM|V2\.4|World Engine|승인|추정치/i.test(a))
      .map((a) => `- ${a}`),
    "",
    "예상 결과:",
    ...scenario.expectedOutcomes.map((o) => `- ${o}`),
    "",
    LEARNER_EVENT_DISCLAIMER,
  ]
    .filter((line, index, arr) => line !== "" || (index > 0 && arr[index - 1] !== ""))
    .join("\n");

  return {
    label: scenario.label,
    narrative: scenario.description,
    rationale: scenario.assumptions[0] ?? analysis.eventSummary,
    discussionQuestions: analysis.keyIssues.slice(0, 3).map((k) => `${k}에 대해 어떻게 대응하시겠습니까?`),
    newsHeadline: headline,
    newsArticleBody: articleBody,
    severity,
  };
}

export function buildStudioOutputFromIntelligence(preview: IntelligencePreview): EventScenarioStudioOutput {
  if (!preview.analysis || !preview.scenarios) {
    throw Object.assign(new Error("Preview must have analysis and scenarios"), {
      code: "ERR_INTEL_PREVIEW",
      status: 400,
    });
  }

  const analysis = preview.analysis;
  const category = inferCategory(analysis, preview.articles);
  const severity = inferSeverity(analysis);
  const headline = preview.articles[0]?.title ?? analysis.eventSummary.slice(0, 120);

  const scenarioMap = Object.fromEntries(
    preview.scenarios.map((s) => [s.scenarioKey, s])
  ) as Record<ScenarioKey, IntelligenceScenario>;

  const keys: ScenarioKey[] = ["pessimistic", "neutral", "optimistic"];

  return {
    meta: {
      title: headline.slice(0, 80),
      summary: analysis.eventSummary,
      category,
      confidenceLabel: analysis.confidenceLabel,
      isEstimate: analysis.isEstimate,
      sourcePromptHash: `intel-${preview.previewId}`,
      targetIndustry: "다산업",
      targetMarketOrRegion: preview.articles.map((a) => a.source).join(" · ") || "글로벌",
      expectedDuration: "1~2반기",
      targetPeriodLabel: "Y1H1",
      analysisIntensity: "STANDARD",
    },
    assumptions: scenarioMap.neutral?.assumptions ?? [],
    impactPathways: [
      { path: analysis.supplyChainImpact, affectedSteps: ["MATERIAL", "PRODUCTION"] },
      { path: analysis.productionImpact, affectedSteps: ["PRODUCTION"] },
      { path: analysis.salesImpact, affectedSteps: ["SALES"] },
      { path: analysis.financialImpact, affectedSteps: ["SALES", "PRODUCTION"] },
    ],
    scenarios: Object.fromEntries(
      keys.map((k) => [
        k,
        buildOutlook(
          scenarioMap[k],
          analysis,
          `[${scenarioMap[k].label}] ${headline}`.slice(0, 120),
          k === "pessimistic" ? "HIGH" : k === "optimistic" ? "LOW" : severity
        ),
      ])
    ) as Record<ScenarioKey, ScenarioOutlook>,
    uncertainty: {
      caveats: analysis.riskFactors
        .filter((r) => !/GM|V2\.4|World Engine|승인|추정치/i.test(r))
        .slice(0, 2),
      educationDisclaimer: LEARNER_EVENT_DISCLAIMER,
    },
    economyVariableChanges: Object.fromEntries(
      keys.map((k) => [k, { effects: impactsToEffects(scenarioMap[k]) }])
    ) as Record<ScenarioKey, { effects: StudioVariableEffect[] }>,
  };
}

export function buildStudioInputFromIntelligence(preview: IntelligencePreview): EventStudioInput {
  const analysis = preview.analysis!;
  const headline = preview.articles[0]?.title ?? analysis.eventSummary;
  return {
    naturalLanguagePrompt: `[V2.4 Intelligence] ${headline}. ${analysis.eventSummary}`,
    targetIndustry: "다산업",
    targetMarketOrRegion: preview.articles.map((a) => a.source).join(" · ") || "글로벌",
    expectedDuration: "1~2반기",
    targetHalfLabel: "Y1H1",
    analysisIntensity: "STANDARD",
  };
}

export function buildIntelligenceDraft(
  preview: IntelligencePreview,
  actor: GmActor,
  baseEconomy: EconomyValues
): EventScenarioDraft {
  const studioOutput = buildStudioOutputFromIntelligence(preview);
  const outcomePreview = buildOutcomesFromOutput(studioOutput.economyVariableChanges, baseEconomy);
  const now = new Date().toISOString();

  const outcomes = {
    pessimistic: {
      scenarioKey: "pessimistic" as ScenarioKey,
      outlook: studioOutput.scenarios.pessimistic,
      effects: studioOutput.economyVariableChanges.pessimistic.effects,
      mappedEngineEffects: outcomePreview.pessimistic.mappedEngineEffects,
    },
    neutral: {
      scenarioKey: "neutral" as ScenarioKey,
      outlook: studioOutput.scenarios.neutral,
      effects: studioOutput.economyVariableChanges.neutral.effects,
      mappedEngineEffects: outcomePreview.neutral.mappedEngineEffects,
    },
    optimistic: {
      scenarioKey: "optimistic" as ScenarioKey,
      outlook: studioOutput.scenarios.optimistic,
      effects: studioOutput.economyVariableChanges.optimistic.effects,
      mappedEngineEffects: outcomePreview.optimistic.mappedEngineEffects,
    },
  };

  return {
    draftId: crypto.randomUUID(),
    sessionId: preview.sessionId,
    status: "GENERATED",
    input: buildStudioInputFromIntelligence(preview),
    studioOutput,
    outcomes,
    idempotencyResults: {},
    createdAt: now,
    updatedAt: now,
    createdBy: actor.userId,
  };
}

export function getEngineEffectsForScenario(
  draft: EventScenarioDraft,
  scenarioKey: ScenarioKey
): EconomyPatchEffect[] {
  if (!draft.outcomes) {
    throw Object.assign(new Error("Draft outcomes missing"), { code: "ERR_INTEL_DRAFT", status: 422 });
  }
  return draft.outcomes[scenarioKey].mappedEngineEffects;
}

export function extractSourceCitations(preview: IntelligencePreview) {
  if (preview.analysis?.citations?.length) return preview.analysis.citations;
  return preview.articles.map((a) => ({
    articleId: a.id,
    title: a.title,
    outlet: a.source,
    publishedAt: a.publishedAt,
    url: a.url,
  }));
}
