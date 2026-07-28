import { describe, expect, it } from "vitest";
import { STEP_EDUCATION, getStepEducation } from "@/src/bsp/domain/steps/step-education-content";

describe("P8 step education content", () => {
  it("provides education for all decision steps", () => {
    const steps = ["LOAN", "FACILITY", "HIRING", "MATERIAL", "PRODUCTION", "SALES"] as const;
    for (const step of steps) {
      const content = STEP_EDUCATION[step];
      expect(content.learningObjective.length).toBeGreaterThan(10);
      expect(content.businessMeaning.length).toBeGreaterThan(10);
      expect(content.checklist.length).toBeGreaterThanOrEqual(3);
      expect(content.confirmPrompt).toContain("제출");
    }
  });

  it("returns null for settlement step", () => {
    expect(getStepEducation("SETTLEMENT")).toBeNull();
  });

  it("does not contain strategy hints or AI wording", () => {
    for (const content of Object.values(STEP_EDUCATION)) {
      const blob = JSON.stringify(content);
      expect(blob).not.toMatch(/정답|AI|ChatGPT|추천 전략/i);
    }
  });
});
