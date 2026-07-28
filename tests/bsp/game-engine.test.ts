import { describe, expect, it, beforeEach } from "vitest";
import { createMemoryRepositories, resetMemoryState } from "@/src/bsp/infrastructure/memory/memory-repositories";
import { GameEngine } from "@/src/bsp/application/game-engine";
import { AccountingEngine } from "@/src/bsp/domain/accounting/accounting-engine";
import { DashboardService } from "@/src/bsp/application/dashboard-service";
import { EventStoreService } from "@/src/bsp/application/event-store-service";
import { stepHandlerRegistry } from "@/src/bsp/domain/steps/step-handler-registry";

describe("MemoryRepository + GameEngine", () => {
  let engine: GameEngine;

  beforeEach(() => {
    resetMemoryState();
    const repos = createMemoryRepositories();
    engine = new GameEngine(
      repos,
      stepHandlerRegistry,
      new AccountingEngine(),
      new DashboardService(),
      new EventStoreService(repos.events)
    );
  });

  it("creates company and submits step1/step2", async () => {
    const session = await engine.ensureDemoSession();
    const { company } = await engine.createCompany("Team-Test", session.id);

    const s1 = await engine.submitDecision(company.id, "LOAN", {
      loanEarly: 2,
      loanMid: 0,
      deposit: 1,
      loanRepayment: 0,
    }, 0);
    expect(s1.dashboard.cashManwon).toBe(11000);
    await engine.gmAdvanceStep(session.id);

    const s2 = await engine.submitDecision(company.id, "FACILITY", {
      landPlotsPurchased: 1,
      machineBigPurchased: 1,
      machineSmallPurchased: 0,
    }, s1.statusVersion);
    expect(s2.dashboard.cashManwon).toBe(7400);

    const journals = await engine.getJournals(company.id);
    expect(journals).toHaveLength(2);

    const fs = await engine.getFinancialStatements(company.id);
    expect(fs.balanceSheet.assets.total).toBe(12000);
  });

  it("records domain events on submit", async () => {
    resetMemoryState();
    const repos = createMemoryRepositories();
    const events = new EventStoreService(repos.events);
    const eng = new GameEngine(repos, stepHandlerRegistry, new AccountingEngine(), new DashboardService(), events);
    const session = await eng.ensureDemoSession();
    const { company } = await eng.createCompany("Team-Evt", session.id);
    await eng.submitDecision(company.id, "LOAN", { loanEarly: 1, loanMid: 0, deposit: 0, loanRepayment: 0 }, 0);
    const list = await events.listSessionEvents(session.id);
    expect(list.some((e) => e.eventType === "decision.posted")).toBe(true);
    expect(list.some((e) => e.eventType === "journal.posted")).toBe(true);
  });
});
