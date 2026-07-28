import { describe, expect, it } from "vitest";
import { normalizeStudioOutput } from "@/lib/v2/event-studio/normalize-studio-output";

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
});
