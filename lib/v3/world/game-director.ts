/** V3.0 — AI Game Director (fixture-based, GM approval required) */

import type { DirectorAction, DirectorSuggestion, EvolutionContext } from "./types";

export function evaluateGameDirector(ctx: EvolutionContext): DirectorSuggestion {
  const { teamSummary } = ctx;
  const profitRate =
    teamSummary.totalTeams > 0
      ? 1 - teamSummary.strugglingTeams / teamSummary.totalTeams
      : 0.5;

  if (profitRate > 0.8 && teamSummary.avgNetIncome > 0) {
    return {
      action: "INCREASE_DIFFICULTY",
      reason: "학생들이 전반적으로 안정적으로 운영하고 있습니다. 난이도를 소폭 높이는 것이 교육 효과적입니다.",
      confidence: 0.75,
      suggestedEventLabel: "공급망 압박 또는 원가 상승 이벤트",
      educationalRationale: "너무 쉬운 환경에서는 전략적 의사결정 학습이 감소합니다.",
      gmOnly: true,
    };
  }

  if (teamSummary.strugglingTeams > teamSummary.totalTeams * 0.6) {
    return {
      action: "RECOVERY_EVENT",
      reason: "다수 팀이 적자 또는 현금 압박 상태입니다. 회복 기회 이벤트를 고려하세요.",
      confidence: 0.8,
      suggestedEventLabel: "정부 지원 또는 수요 회복 이벤트",
      educationalRationale: "극단적 좌절은 학습 동기를 저하시킵니다. 완충 이벤트로 토론을 유도하세요.",
      gmOnly: true,
    };
  }

  if (ctx.activeEventCount >= 3) {
    return {
      action: "BUFFER_EVENT",
      reason: "동시에 3개 이상의 이벤트가 활성화되어 있습니다. 완충 또는 만료를 검토하세요.",
      confidence: 0.7,
      suggestedEventLabel: "완충 이벤트 또는 기존 이벤트 만료",
      educationalRationale: "과도한 충격은 인과관계 학습을 어렵게 만듭니다.",
      gmOnly: true,
    };
  }

  return {
    action: "MAINTAIN",
    reason: "현재 게임 밸런스가 적절합니다. World Evolution 제안을 검토하세요.",
    confidence: 0.6,
    suggestedEventLabel: "현재 World State 기반 자연 진화",
    educationalRationale: "안정적 진행 중 — 교육 목표에 맞는 이벤트를 선택하세요.",
    gmOnly: true,
  };
}

export function directorActionToWorldDelta(action: DirectorAction): Partial<Record<string, number>> {
  switch (action) {
    case "INCREASE_DIFFICULTY":
      return { supplyStability: -8, inflation: 5, consumerConfidence: -5 };
    case "RECOVERY_EVENT":
      return { globalGrowth: 5, consumerConfidence: 8, interestRateTrend: -3 };
    case "BUFFER_EVENT":
      return { geopoliticalTension: -5, supplyStability: 5 };
    default:
      return {};
  }
}

export function directorActionToProposalTitle(action: DirectorAction): string {
  switch (action) {
    case "INCREASE_DIFFICULTY":
      return "[Director] 난이도 상향 — 공급/원가 압력";
    case "RECOVERY_EVENT":
      return "[Director] 회복 이벤트 — 수요/지원";
    case "BUFFER_EVENT":
      return "[Director] 완충 이벤트";
    default:
      return "[Director] World Evolution 유지";
  }
}
