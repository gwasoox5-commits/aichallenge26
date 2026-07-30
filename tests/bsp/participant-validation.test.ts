import { describe, expect, it } from "vitest";
import { participantValidationView, participantVisibleRules } from "@/components/bsp/participant-validation";

describe("participant validation display", () => {
  it("hides passed L04 format checks from participants", () => {
    const rules = [
      { ruleId: "L04", passed: true, message: "입력값이 0 이상의 정수입니다." },
      { ruleId: "L01", passed: true, message: "연초 차입금이 자기자본 한도 이내입니다." },
    ];
    expect(participantVisibleRules(rules)).toHaveLength(1);
    expect(participantVisibleRules(rules)[0].ruleId).toBe("L01");
  });

  it("keeps failed L04 visible for correction", () => {
    const rules = [{ ruleId: "L04", passed: false, message: "음수 또는 정수가 아닌 값은 입력할 수 없습니다. (L04)" }];
    expect(participantVisibleRules(rules)).toHaveLength(1);
  });

  it("returns null when only hidden rules passed", () => {
    const view = participantValidationView({
      ok: true,
      rules: [{ ruleId: "L04", passed: true, message: "입력값이 0 이상의 정수입니다." }],
    });
    expect(view).toBeNull();
  });
});
