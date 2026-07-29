import { describe, expect, it } from "vitest";
import {
  buildLearnerNewsSummary,
  stripInstructorMetaFromLearnerText,
} from "@/lib/v2/event-studio/news-copy";

describe("news-copy", () => {
  it("strips instructor meta and real calendar years", () => {
    const raw =
      "본 시나리오는 2024년 상반기 동안 북미와 EU의 전선 산업에 미치는 경제적 영향을 분석한다. 구리 가격이 하락하고 있습니다.";
    expect(stripInstructorMetaFromLearnerText(raw)).toBe("구리 가격이 하락하고 있습니다.");
  });

  it("builds learner summary with narrative and economy impacts", () => {
    const summary = buildLearnerNewsSummary({
      narrative: "칠레 광산 확대로 구리 공급이 늘며 가격이 하락하고 있습니다.",
      targetMarketOrRegion: "북미 · EU",
      targetIndustry: "전선",
      effects: [{ key: "rawMaterialIndex", mode: "PERCENT", value: -8 }],
    });
    expect(summary).toContain("구리");
    expect(summary).toContain("북미 · EU");
    expect(summary).toContain("주요 영향:");
    expect(summary).not.toMatch(/본 시나리오는/);
    expect(summary).not.toMatch(/2024년/);
  });
});
