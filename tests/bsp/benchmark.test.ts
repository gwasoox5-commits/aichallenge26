import { describe, it, expect } from "vitest";
import { validateLoan } from "@/src/bsp/domain/validation/step-validators";
import { createInitialOperationalState } from "@/src/bsp/domain/validation/step-validators";
import { resetMemoryState, createMemoryRepositories } from "@/src/bsp/infrastructure/memory/memory-repositories";
import { GameEngine } from "@/src/bsp/application/game-engine";
import { AccountingEngine } from "@/src/bsp/domain/accounting/accounting-engine";
import { DashboardService } from "@/src/bsp/application/dashboard-service";
import { EventStoreService } from "@/src/bsp/application/event-store-service";
import { stepHandlerRegistry } from "@/src/bsp/domain/steps/step-handler-registry";

describe("performance benchmark (Sprint 1.5)", () => {
  // P9: raised from 50ms — CI/dev variance on cold JIT; still well under NFR-P01 (200ms avg submit)
  const VALIDATE_LOAN_BUDGET_MS = 100;
  const SUBMIT_DECISION_BUDGET_MS = 100;

  it(`validateLoan 1000 iterations under ${VALIDATE_LOAN_BUDGET_MS}ms`, () => {
    const state = createInitialOperationalState();
    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      validateLoan({ loanEarly: 2, loanMid: 0, deposit: 1, loanRepayment: 0 }, state);
    }
    expect(performance.now() - start).toBeLessThan(VALIDATE_LOAN_BUDGET_MS);
  });

  it(`submitDecision E2E under ${SUBMIT_DECISION_BUDGET_MS}ms (memory)`, async () => {
    resetMemoryState();
    const repos = createMemoryRepositories();
    const engine = new GameEngine(
      repos,
      stepHandlerRegistry,
      new AccountingEngine(),
      new DashboardService(),
      new EventStoreService(repos.events)
    );
    const session = await engine.ensureDemoSession();
    const { company } = await engine.createCompany("Bench", session.id);
    const start = performance.now();
    await engine.submitDecision(company.id, "LOAN", { loanEarly: 1, loanMid: 0, deposit: 0, loanRepayment: 0 }, 0);
    expect(performance.now() - start).toBeLessThan(SUBMIT_DECISION_BUDGET_MS);
  });
});
