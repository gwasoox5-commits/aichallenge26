import { describe, expect, it } from "vitest";
import { financeStepHandler } from "@/src/bsp/domain/steps/finance-step-handler";
import { facilityStepHandler } from "@/src/bsp/domain/steps/facility-step-handler";
import { StepHandlerRegistry } from "@/src/bsp/domain/steps/step-handler-registry";
import { StepNotImplementedError } from "@/src/bsp/domain/steps/step-handler";
import { createInitialOperationalState } from "@/src/bsp/domain/validation/step-validators";
import { createLedgerFromInitial } from "@/src/bsp/domain/accounting/ledger";
import { buildInitialLedgerBalances } from "@/src/bsp/domain/accounting/journal-builders";
import { hrStepHandler } from "@/src/bsp/domain/steps/hr-step-handler";
import { DEFAULT_ECONOMY_VALUES } from "@/src/bsp/domain/types";
import type { SessionAggregate } from "@/src/bsp/application/ports/repositories";

function mockSession(overrides: Partial<SessionAggregate> = {}): SessionAggregate {
  return {
    id: "sess-1",
    joinCode: "DEMO1",
    name: "Demo",
    sessionPhase: "RUNNING",
    periodId: "p1",
    periodIndex: 1,
    year: 1,
    half: "H1",
    periodLabel: "Year 1 H1",
    stepPhase: "STEP1_FINANCE",
    stepLocked: false,
    stepStartedAt: new Date(),
    stepDurationSec: 900,
    maxPeriodIndex: 6,
    economy: DEFAULT_ECONOMY_VALUES,
    ...overrides,
  };
}

function mockCompany(operational = createInitialOperationalState()) {
  return {
    id: "co-1",
    sessionId: "sess-1",
    teamName: "Team-A",
    statusVersion: 0,
    periodId: "p1",
    periodLabel: "Year 1 H1",
    sessionPhase: "RUNNING" as const,
    stepPhase: "STEP1_FINANCE" as const,
    operational,
    ledger: createLedgerFromInitial(buildInitialLedgerBalances()),
    decisions: [],
    journals: [],
  };
}

describe("FinanceStepHandler", () => {
  it("validates and returns Korean messages", () => {
    const outcome = financeStepHandler.validate({
      company: mockCompany(),
      session: mockSession(),
      payload: { loanEarly: 2, loanMid: 0, deposit: 1, loanRepayment: 0 },
    });
    expect(outcome.validation.ok).toBe(true);
    expect(outcome.validation.rules[0].message).toMatch(/입력값|한도|현금|정수|단위|상환/);
    expect(outcome.nextStepPhase).toBe("STEP2_INVESTMENT");
  });
});

describe("FacilityStepHandler", () => {
  it("validates after loan step state", () => {
    const op = createInitialOperationalState();
    op.cashManwon = 11000;
    op.debtManwon = 2000;
    op.depositManwon = 1000;
    const outcome = facilityStepHandler.validate({
      company: mockCompany(op),
      session: mockSession({ stepPhase: "STEP2_INVESTMENT" }),
      payload: { landPlotsPurchased: 1, machineBigPurchased: 1, machineSmallPurchased: 0 },
    });
    expect(outcome.validation.ok).toBe(true);
  });
});

describe("HRStepHandler", () => {
  it("validates hiring and returns empty journal", () => {
    const outcome = hrStepHandler.validate({
      company: mockCompany(),
      session: mockSession({ stepPhase: "STEP3_HR" }),
      payload: { headPurchase: 2, headProduction: 3, headSales: 2 },
    });
    expect(outcome.validation.ok).toBe(true);
    expect(outcome.journalInput.lines).toHaveLength(0);
    expect(outcome.nextStepPhase).toBe("STEP4_PURCHASE");
  });
});

describe("StepHandlerRegistry", () => {
  it("registers all 7 steps", () => {
    const registry = new StepHandlerRegistry();
    expect(registry.list()).toHaveLength(7);
  });

  it("settlement handler rejects CEO payload", () => {
    const registry = new StepHandlerRegistry();
    expect(() =>
      registry.get("SETTLEMENT").validate({
        company: mockCompany(),
        session: mockSession({ stepPhase: "STEP7_SETTLEMENT" }),
        payload: {},
      })
    ).toThrow(StepNotImplementedError);
  });
});
