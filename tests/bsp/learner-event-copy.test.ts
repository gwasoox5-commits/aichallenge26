import { describe, expect, it } from "vitest";
import {
  buildWorldProposalLearnerDescription,
  sanitizeLearnerEventDescription,
} from "@/lib/bsp/learner-event-copy";
import { buildEvolutionProposal } from "@/lib/v3/world/evolution-engine";
import { buildPreviewFromProposal } from "@/lib/v3/proposals/proposal-bridge";
import type { EvolutionContext, WorldState } from "@/lib/v3/world/types";

const GM = { userId: "gm-1", role: "GM" as const, reason: "test" };

function mockState(overrides: Partial<WorldState["dimensions"]> = {}): WorldState {
  return {
    dimensions: {
      globalGrowth: 24,
      inflation: 50,
      interestRateTrend: 60,
      supplyStability: 50,
      energyPrice: 50,
      technologyInnovation: 50,
      consumerConfidence: 28,
      geopoliticalTension: 50,
      climateRisk: 50,
      tradeEnvironment: 50,
      ...overrides,
    },
    regions: [],
    industries: [],
    updatedAt: new Date().toISOString(),
    periodLabel: "Y1H2",
    periodIndex: 2,
  };
}

function mockCtx(sessionId: string): EvolutionContext {
  return {
    sessionId,
    periodLabel: "Y1H2",
    periodIndex: 2,
    economy: {},
    teamSummary: {
      avgCash: 5000,
      avgNetIncome: 100,
      submitRate: 80,
      strugglingTeams: 0,
      totalTeams: 6,
    },
    activeEventCount: 4,
    recentProposalCount: 0,
  };
}

describe("learner event copy", () => {
  it("strips GM-only metadata from legacy descriptions", () => {
    const raw =
      "동시에 3개 이상의 이벤트가 활성화되어 있습니다. 완충 또는 만료를 검토하세요. 경기 침체 — 수요 위축 Global Growth: 24 · Inflation: 50 · Tech: 50 ※ AI 추정치이며 GM 승인 후 V2.4 Publish Workflow를 통해 발행됩니다.";
    const cleaned = sanitizeLearnerEventDescription(raw);
    expect(cleaned).toContain("경기 침체 — 수요 위축");
    expect(cleaned).not.toMatch(/GM|V2\.4|Publish Workflow|Global Growth|완충 또는 만료/i);
  });

  it("builds educational world proposal copy", () => {
    const proposal = buildEvolutionProposal(
      mockState(),
      mockCtx("s1"),
      {
        action: "BUFFER_EVENT",
        reason: "동시에 3개 이상의 이벤트가 활성화되어 있습니다. 완충 또는 만료를 검토하세요.",
        confidence: 0.8,
        suggestedEventLabel: "Buffer",
        educationalRationale: "GM only",
        gmOnly: true,
      }
    );
    const learner = buildWorldProposalLearnerDescription(proposal);
    expect(learner).toMatch(/경기|수요|현금흐름|판매/i);
    expect(learner).not.toMatch(/GM|V2\.4|완충 또는 만료/i);
  });

  it("uses learner copy in world preview scenarios", () => {
    const proposal = buildEvolutionProposal(mockState(), mockCtx("s1"));
    const preview = buildPreviewFromProposal(proposal, GM);
    const neutral = preview.scenarios?.find((s) => s.scenarioKey === "neutral");
    expect(neutral?.description).not.toMatch(/GM|V2\.4|Global Growth/i);
    expect(neutral?.description).toMatch(/경기|수요/i);
  });
});
