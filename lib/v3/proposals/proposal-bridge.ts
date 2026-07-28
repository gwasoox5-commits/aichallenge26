/**
 * V3.0 — Proposal → IntelligencePreview bridge for V2.4 Publish
 */

import type { GmActor } from "@/src/bsp/domain/gm/audit-types";
import type { ScenarioKey, StudioVariableEffect, StudioVariableKey } from "@/lib/v2/event-studio/types";
import type { IntelligencePreview, NewsArticle } from "@/lib/v2/intelligence/types";
import type { WorldEvolutionProposal } from "@/lib/v3/world/types";

const ENGINE_TO_STUDIO: Record<string, string> = {
  exchangeRate: "exchangeRate",
  interestRateLoan: "interestRate",
  interestRateDeposit: "interestRate",
  rawMaterialIndex: "rawMaterialCost",
  marketDemandIndex: "demand",
  marketSupplyIndex: "competitionIntensity",
  logisticsCostMultiplier: "logisticsCost",
  tariffRate: "tariff",
  carbonTaxRatePerUnit: "carbonTax",
  esgPressureIndex: "esgCost",
  techInnovationIndex: "marketGrowth",
  businessCycleIndex: "businessCycleIndex",
  payrollCostMultiplier: "rawMaterialCost",
  corporateTaxRate: "governmentSupport",
};

function toStudioEffects(
  impacts: WorldEvolutionProposal["economyImpacts"]
): StudioVariableEffect[] {
  const byKey = new Map<string, StudioVariableEffect>();
  for (const imp of impacts) {
    const studioKey = ENGINE_TO_STUDIO[imp.key] ?? imp.key;
    const existing = byKey.get(studioKey);
    if (existing && existing.mode === imp.mode) {
      existing.value += imp.value;
    } else {
      byKey.set(studioKey, {
        key: studioKey as StudioVariableKey,
        mode: imp.mode,
        value: imp.value,
        rationale: imp.rationale,
        isEstimate: true,
      });
    }
  }
  return Array.from(byKey.values());
}

export function buildPreviewFromProposal(
  proposal: WorldEvolutionProposal,
  actor: GmActor
): IntelligencePreview {
  const now = new Date().toISOString();
  const article: NewsArticle = {
    id: `world-${proposal.proposalId}`,
    title: proposal.title,
    summary: proposal.summary,
    source: "World Simulation Engine",
    publishedAt: now,
    url: `https://world-engine.local/proposals/${proposal.proposalId}`,
    keywords: ["world", "simulation", proposal.source.toLowerCase()],
  };

  const scenarioKey = proposal.selectedScenario;
  const effects = toStudioEffects(proposal.economyImpacts);

  return {
    previewId: `world-prev-${proposal.proposalId}`,
    sessionId: proposal.sessionId,
    articles: [article],
    status: "PREVIEW",
    analysis: {
      eventSummary: proposal.summary,
      keyIssues: [proposal.title],
      supplyChainImpact: proposal.summary,
      productionImpact: "World Engine 추정 — GM 검토 필요",
      salesImpact: "World Engine 추정 — GM 검토 필요",
      financialImpact: proposal.economyImpacts.map((e) => `${e.key}: ${e.value}`).join(", "),
      riskFactors: ["AI 추정치", "GM 승인 전 미적용"],
      opportunityFactors: ["World Evolution 기회"],
      confidenceLabel: "MEDIUM",
      isEstimate: true,
      promptVersion: "v1.1",
      citations: [{
        articleId: article.id,
        title: article.title,
        outlet: article.source,
        publishedAt: article.publishedAt,
        url: article.url,
      }],
    },
    scenarios: (["pessimistic", "neutral", "optimistic"] as ScenarioKey[]).map((key) => ({
      scenarioKey: key,
      label: key === "pessimistic" ? "비관적" : key === "optimistic" ? "낙관적" : "중립적",
      description: proposal.narrative,
      assumptions: ["World Engine 추정", "GM 승인 필요"],
      expectedOutcomes: [proposal.summary],
      variableImpacts: effects.map((e) => ({
        key: e.key,
        mode: e.mode,
        proposedValue: e.value,
        clampedValue: e.value,
        allowedMin: -100,
        allowedMax: 100,
        reason: e.rationale ?? "World proposal",
        confidence: "MEDIUM" as const,
        assumption: proposal.source,
        isEstimate: true,
      })),
    })),
    consultant: {
      gmOnly: true,
      coreRisks: [proposal.summary],
      coreOpportunities: ["World Evolution 대응"],
      mostAffectedDivision: "전사",
      productionImpact: proposal.summary,
      supplyChainImpact: proposal.summary,
      financialImpact: proposal.summary,
      cashflowImpact: proposal.summary,
      ceoReviewPriorities: ["World 변화 모니터링", "공급망/재무 균형"],
      commonStudentMistakes: ["단기 대응에만 집중"],
      instructorDiscussionQuestions: [`${proposal.title}에 어떻게 대응하시겠습니까?`],
      debriefQuestions: ["World Evolution이 의사결정에 미친 영향은?"],
      learningObjectives: ["거시 환경과 경영 전략 연계"],
      instructorComments: proposal.narrative,
      educationalCommentary: proposal.narrative,
      promptVersion: "v1.1",
    },
    quality: {
      overall: 70,
      realism: 72,
      logic: 75,
      economicConsistency: 68,
      educationValue: 80,
      diversity: 65,
      gameFit: 78,
      recommendRegenerate: false,
      notes: ["World Engine proposal"],
    },
    createdAt: now,
    updatedAt: now,
    createdBy: actor.userId,
  };
}
