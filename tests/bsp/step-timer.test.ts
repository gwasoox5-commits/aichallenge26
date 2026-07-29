import { describe, expect, it } from "vitest";
import { computeStepRemainingSec, formatStepTime } from "@/lib/bsp/step-timer";

describe("step-timer", () => {
  it("formats mm:ss", () => {
    expect(formatStepTime(0)).toBe("0:00");
    expect(formatStepTime(65)).toBe("1:05");
    expect(formatStepTime(900)).toBe("15:00");
  });

  it("computes remaining seconds from stepStartedAt", () => {
    const startedAt = "2026-07-29T09:00:00.000Z";
    const now = new Date("2026-07-29T09:05:00.000Z").getTime();
    expect(computeStepRemainingSec(startedAt, 900, now)).toBe(600);
    expect(computeStepRemainingSec(startedAt, 900, now + 700_000)).toBe(0);
  });
});
