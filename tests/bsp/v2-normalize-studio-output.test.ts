import { describe, expect, it } from "vitest";
import { normalizeStudioOutput, sanitizeStudioEffects } from "@/lib/v2/event-studio/normalize-studio-output";
import { mapStudioEffectToEngine } from "@/lib/v2/event-studio/variable-mapper";
import type { EventScenarioStudioOutput } from "@/lib/v2/event-studio/types";

describe("normalizeStudioOutput", () => {
  it("fills missing economyVariableChanges from fixture defaults", () => {
    const normalized = normalizeStudioOutput({
      meta: {
        title: "테스트 이벤트",
        summary: "OpenAI가 economyVariableChanges를 누락한 경우를 복구합니다.",
        category: "정부정책",
        confidenceLabel: "MEDIUM",
        isEstimate: true,
      },
      scenarios: {
        pessimistic: {
          label: "비관적",
          narrative: "악화 시나리오",
          rationale: "테스트",
          discussionQuestions: ["Q1"],
          newsHeadline: "헤드라인",
          newsArticleBody: "본문",
          severity: "HIGH",
        },
        neutral: {
          label: "중립적",
          narrative: "중립 시나리오",
          rationale: "테스트",
          discussionQuestions: ["Q1"],
          newsHeadline: "헤드라인",
          newsArticleBody: "본문",
          severity: "MEDIUM",
        },
        optimistic: {
          label: "낙관적",
          narrative: "낙관 시나리오",
          rationale: "테스트",
          discussionQuestions: ["Q1"],
          newsHeadline: "헤드라인",
          newsArticleBody: "본문",
          severity: "LOW",
        },
      },
    });

    expect(normalized.economyVariableChanges.pessimistic.effects.length).toBeGreaterThan(0);
    expect(normalized.economyVariableChanges.neutral.effects.length).toBeGreaterThan(0);
    expect(normalized.economyVariableChanges.optimistic.effects.length).toBeGreaterThan(0);
  });

  it("drops unknown effect keys and falls back to fixture when all invalid", () => {
    const normalized = normalizeStudioOutput({
      meta: FIXTURE_META,
      economyVariableChanges: {
        pessimistic: {
          effects: [{ key: "notARealKey", mode: "PERCENT", value: 10, rationale: "bad" } as never],
        },
      },
    } as unknown as Partial<EventScenarioStudioOutput>);
    expect(normalized.economyVariableChanges.pessimistic.effects.length).toBeGreaterThan(0);
    expect(
      normalized.economyVariableChanges.pessimistic.effects.every((e) => mapStudioEffectToEngine(e).length >= 0)
    ).toBe(true);
  });

  it("sanitizes invalid studio effect keys without throwing", () => {
    const mapped = sanitizeStudioEffects([
      { key: "bogusKey", mode: "PERCENT", value: 5, rationale: "x" },
      { key: "demand", mode: "PERCENT", value: -5, rationale: "ok" },
    ]).flatMap(mapStudioEffectToEngine);
    expect(mapped.length).toBe(1);
    expect(mapped[0]?.key).toBe("marketDemandIndex");
  });
});

const FIXTURE_META = {
  title: "테스트",
  summary: "테스트 요약입니다. OpenAI 응답 정규화 검증용입니다.",
  category: "정부정책",
  confidenceLabel: "MEDIUM" as const,
  isEstimate: true,
};
