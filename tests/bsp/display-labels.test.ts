import { describe, expect, it } from "vitest";
import {
  formatPeriodLabel,
  formatStepPhaseLabel,
  parseYearFromPeriodLabel,
} from "@/src/bsp/domain/period/display-labels";
import { PERIOD_CALENDAR } from "@/src/bsp/domain/period/period-calendar";

describe("display-labels", () => {
  it("formats Korean period labels from English legacy values", () => {
    expect(formatPeriodLabel("Year 1 H1")).toBe("1년차 전반기");
    expect(formatPeriodLabel("Year 1 H2")).toBe("1년차 후반기");
    expect(formatPeriodLabel("Year 2 H1")).toBe("2년차 전반기");
    expect(formatPeriodLabel("Y3H2")).toBe("3년차 후반기");
  });

  it("passes through Korean period labels", () => {
    expect(formatPeriodLabel("1년차 전반기")).toBe("1년차 전반기");
  });

  it("formats step phases in Korean", () => {
    expect(formatStepPhaseLabel("STEP1_FINANCE")).toBe("1단계 · 자금조달");
    expect(formatStepPhaseLabel("STEP2_INVESTMENT")).toBe("2단계 · 설비투자");
    expect(formatStepPhaseLabel("STEP3_HR")).toBe("3단계 · 인력채용");
    expect(formatStepPhaseLabel("STEP4_PURCHASE")).toBe("4단계 · 원재료구매");
    expect(formatStepPhaseLabel("STEP5_PRODUCTION")).toBe("5단계 · 생산");
    expect(formatStepPhaseLabel("STEP6_SALES")).toBe("6단계 · 판매");
    expect(formatStepPhaseLabel("STEP7_SETTLEMENT")).toBe("7단계 · 결산");
    expect(formatStepPhaseLabel("HALF_YEAR_END")).toBe("반기 마감");
    expect(formatStepPhaseLabel("GAME_END")).toBe("게임 종료");
  });

  it("parses year from English and Korean labels", () => {
    expect(parseYearFromPeriodLabel("Year 2 H1")).toBe(2);
    expect(parseYearFromPeriodLabel("2년차 후반기")).toBe(2);
  });

  it("stores Korean labels in the period calendar", () => {
    expect(PERIOD_CALENDAR[0]?.label).toBe("1년차 전반기");
    expect(PERIOD_CALENDAR[1]?.label).toBe("1년차 후반기");
  });
});
