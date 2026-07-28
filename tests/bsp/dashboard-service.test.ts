import { describe, expect, it } from "vitest";
import { DashboardService } from "@/src/bsp/application/dashboard-service";
import { createInitialOperationalState } from "@/src/bsp/domain/validation/step-validators";
import { createLedgerFromInitial } from "@/src/bsp/domain/accounting/ledger";
import { buildInitialLedgerBalances } from "@/src/bsp/domain/accounting/journal-builders";

describe("DashboardService", () => {
  const svc = new DashboardService();

  it("builds dashboard DTO from aggregates", () => {
    const dto = svc.build(
      {
        id: "c1",
        sessionId: "s1",
        teamName: "Alpha",
        statusVersion: 1,
        periodId: "p1",
        periodLabel: "Year 1 H1",
        sessionPhase: "RUNNING",
        stepPhase: "STEP1_FINANCE",
        operational: createInitialOperationalState(),
        ledger: createLedgerFromInitial(buildInitialLedgerBalances()),
        decisions: [{ step: "LOAN", status: "POSTED", periodId: "p1" } as never],
        journals: [],
      },
      {
        id: "s1",
        joinCode: "X",
        name: "Demo",
        sessionPhase: "RUNNING",
        periodId: "p1",
        periodIndex: 1,
        year: 1,
        half: "H1",
        periodLabel: "Year 1 H1",
        stepPhase: "STEP2_INVESTMENT",
        stepLocked: false,
        stepStartedAt: new Date(Date.now() - 60000),
        stepDurationSec: 1800,
        maxPeriodIndex: 6,
        economy: { marketDemandIndex: 100, marketSupplyIndex: 100, interestRateLoan: 10 } as never,
      }
    );
    expect(dto.teamName).toBe("Alpha");
    expect(dto.cashManwon).toBe(10000);
    expect(dto.completedSteps).toContain("LOAN");
    expect(dto.currentStepSubmitted).toBe(false);
    expect(dto.remainingTimeSec).toBeGreaterThan(0);
    expect(dto.economyLabel).toContain("수요");
  });

  it("builds step progress with current step marked", () => {
    const progress = svc.buildStepProgress("STEP2_INVESTMENT", ["LOAN"]);
    expect(progress.find((p) => p.step === "LOAN")?.status).toBe("completed");
    expect(progress.find((p) => p.step === "FACILITY")?.status).toBe("current");
    expect(progress.find((p) => p.step === "HIRING")?.status).toBe("pending");
  });
});
