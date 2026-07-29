import { describe, expect, it } from "vitest";
import {
  EVENT_DURATION_OPTIONS,
  EVENT_IMPACT_PERIOD_OPTIONS,
  formatImpactPeriodValue,
  normalizeDurationValue,
  normalizeImpactPeriodValue,
} from "@/lib/v2/event-studio/event-input-options";

describe("event-input-options", () => {
  it("formats impact period in legacy-compatible code", () => {
    expect(formatImpactPeriodValue(3)).toBe("Y2H1 (P3/6)");
    expect(formatImpactPeriodValue(1)).toBe("Y1H1 (P1/6)");
  });

  it("lists Korean period labels for dropdown", () => {
    expect(EVENT_IMPACT_PERIOD_OPTIONS[0]?.label).toBe("1년차 전반기");
    expect(EVENT_IMPACT_PERIOD_OPTIONS[2]?.value).toBe("Y2H1 (P3/6)");
  });

  it("normalizes legacy free-text values", () => {
    expect(normalizeImpactPeriodValue("Y2H1 (P3/6)")).toBe("Y2H1 (P3/6)");
    expect(normalizeImpactPeriodValue("2년차 전반기")).toBe("Y2H1 (P3/6)");
    expect(normalizeDurationValue("1~2반기")).toBe("1~2반기");
    expect(normalizeDurationValue("전체 게임")).toBe("전체 (6반기)");
  });

  it("offers readable duration choices", () => {
    expect(EVENT_DURATION_OPTIONS.some((o) => o.value === "1반기")).toBe(true);
    expect(EVENT_DURATION_OPTIONS.some((o) => o.value === "전체 (6반기)")).toBe(true);
  });
});
