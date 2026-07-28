/** V3.0 — Half-end world evolution (fixture-based AI) */

import type {
  EvolutionContext,
  WorldDimensionValues,
  WorldEvolutionProposal,
  WorldState,
} from "./types";
import { applyDimensionDelta, clampDimension } from "./world-profiles";
import { applyIndustryImpact, applyRegionalImpact } from "./regional-industry";
import type { DirectorSuggestion } from "./types";

function uuid() {
  return crypto.randomUUID();
}

function evolveDimensions(state: WorldState, ctx: EvolutionContext): WorldDimensionValues {
  const d = state.dimensions;
  const drift: Partial<WorldDimensionValues> = {};

  if (d.technologyInnovation > 70) {
    drift.supplyStability = -3;
    drift.energyPrice = 2;
  }
  if (d.inflation > 65) {
    drift.interestRateTrend = 4;
    drift.consumerConfidence = -3;
  }
  if (d.geopoliticalTension > 70) {
    drift.tradeEnvironment = -4;
    drift.supplyStability = -2;
  }
  if (d.globalGrowth < 35) {
    drift.consumerConfidence = -2;
  } else if (d.globalGrowth > 65) {
    drift.consumerConfidence = 2;
  }
  if (d.climateRisk > 60) {
    drift.energyPrice = 2;
  }

  drift.globalGrowth = (Math.random() - 0.5) * 4;
  return applyDimensionDelta(d, drift);
}

export function evolveWorldState(state: WorldState, ctx: EvolutionContext): WorldState {
  const newDimensions = evolveDimensions(state, ctx);
  const now = new Date().toISOString();

  return {
    dimensions: newDimensions,
    regions: applyRegionalImpact(state.regions, {
      CHINA: clampDimension(newDimensions.tradeEnvironment - 50) > 0 ? 1 : -1,
      KOREA: newDimensions.globalGrowth > 55 ? 1 : -1,
    }),
    industries: applyIndustryImpact(state.industries, {
      SEMICONDUCTOR: newDimensions.technologyInnovation > 70 ? 3 : 0,
      BATTERY: newDimensions.energyPrice > 60 ? -2 : 1,
      AUTOMOTIVE: newDimensions.consumerConfidence > 55 ? 2 : -2,
    }),
    updatedAt: now,
    periodLabel: ctx.periodLabel,
    periodIndex: ctx.periodIndex,
  };
}

export function buildEvolutionProposal(
  state: WorldState,
  ctx: EvolutionContext,
  director?: DirectorSuggestion
): WorldEvolutionProposal {
  const d = state.dimensions;
  const title =
    d.technologyInnovation > 75
      ? "AI 수요 급증 — 반도체·GPU 공급 압력"
      : d.inflation > 70
        ? "인플레이션 지속 — 금리·원가 압력"
        : d.geopoliticalTension > 75
          ? "지정학적 긴장 — 관세·무역 환경 악화"
          : d.globalGrowth < 35
            ? "경기 침체 — 수요 위축"
            : "World Evolution — 경제 환경 변화";

  const summary = director
    ? `${director.reason} ${title}`
    : `현재 World State(${ctx.periodLabel})를 기반으로 AI가 다음 반기 변화를 제안합니다. ※ 추정치이며 GM 승인 필요.`;

  const economyImpacts =
    d.technologyInnovation > 75
      ? [
          { key: "techInnovationIndex", mode: "PERCENT" as const, value: 10, rationale: "AI 붐", confidence: "MEDIUM" as const },
          { key: "rawMaterialIndex", mode: "PERCENT" as const, value: 8, rationale: "반도체 수요", confidence: "MEDIUM" as const },
        ]
      : d.inflation > 70
        ? [
            { key: "interestRateLoan", mode: "PERCENT" as const, value: 5, rationale: "인플레이션 대응", confidence: "HIGH" as const },
            { key: "rawMaterialIndex", mode: "PERCENT" as const, value: 6, rationale: "원가 상승", confidence: "MEDIUM" as const },
          ]
        : [
            { key: "marketDemandIndex", mode: "PERCENT" as const, value: d.globalGrowth > 55 ? 5 : -5, rationale: "성장 추세", confidence: "MEDIUM" as const },
          ];

  return {
    proposalId: `prop-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    sessionId: ctx.sessionId,
    periodLabel: ctx.periodLabel,
    periodIndex: ctx.periodIndex,
    source: director ? "GAME_DIRECTOR" : "AI_EVOLUTION",
    title,
    summary,
    narrative: [
      summary,
      "",
      `Global Growth: ${d.globalGrowth} · Inflation: ${d.inflation} · Tech: ${d.technologyInnovation}`,
      "",
      "※ AI 추정치이며 GM 승인 후 V2.4 Publish Workflow를 통해 발행됩니다.",
    ].join("\n"),
    selectedScenario: d.globalGrowth < 40 ? "pessimistic" : d.globalGrowth > 60 ? "optimistic" : "neutral",
    directorAction: director?.action,
    status: "PENDING_GM",
    economyImpacts,
    worldImpact: {
      globalGrowth: d.globalGrowth > 55 ? 2 : -2,
      consumerConfidence: d.consumerConfidence > 55 ? 1 : -1,
    },
    industryImpacts: {
      SEMICONDUCTOR: d.technologyInnovation > 70 ? 5 : 0,
      AUTOMOTIVE: d.consumerConfidence < 45 ? -3 : 0,
    },
    gmOnly: true,
    isEstimate: true,
    createdAt: new Date().toISOString(),
  };
}

export function buildChainProposal(
  sessionId: string,
  periodLabel: string,
  periodIndex: number,
  nodeLabel: string,
  nodeDescription: string,
  chainNodeId: string,
  economyEffects?: Array<{ key: string; mode: "DELTA" | "PERCENT"; value: number }>
): WorldEvolutionProposal {
  return {
    proposalId: uuid(),
    sessionId,
    periodLabel,
    periodIndex,
    source: "EVENT_CHAIN",
    title: `[Chain] ${nodeLabel}`,
    summary: nodeDescription,
    narrative: `${nodeLabel}: ${nodeDescription}\n\n※ Event Chain 확률 분기 — GM 승인 필요.`,
    selectedScenario: "neutral",
    chainNodeId,
    status: "PENDING_GM",
    economyImpacts: (economyEffects ?? []).map((e) => ({
      ...e,
      rationale: "Chain template",
      confidence: "MEDIUM" as const,
    })),
    worldImpact: {},
    gmOnly: true,
    isEstimate: true,
    createdAt: new Date().toISOString(),
  };
}
