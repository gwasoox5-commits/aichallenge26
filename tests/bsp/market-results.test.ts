import { describe, expect, it, beforeEach } from "vitest";
import { createMemoryRepositories, resetMemoryState } from "@/src/bsp/infrastructure/memory/memory-repositories";
import { GameEngine } from "@/src/bsp/application/game-engine";
import { AccountingEngine } from "@/src/bsp/domain/accounting/accounting-engine";
import { DashboardService } from "@/src/bsp/application/dashboard-service";
import { EventStoreService } from "@/src/bsp/application/event-store-service";
import { stepHandlerRegistry } from "@/src/bsp/domain/steps/step-handler-registry";
import { asiaMaterialBidPayload, ensureOperatingRegionsSelected } from "./bid-payloads";

describe("Market results dashboard", () => {
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

  it("hides material results during Step 4 bidding", async () => {
    const session = await engine.ensureDemoSession();
    const { company: a } = await engine.createCompany("Team-A", session.id);
    await engine.createCompany("Team-B", session.id);

    await advanceToMaterial(engine, session.id, a.id);

    const dash = await engine.getDashboard(a.id);
    expect(dash.marketResults?.material).toBeNull();
  });

  it("shows GM desk bid preview when all teams submitted at Step 4", async () => {
    const session = await engine.ensureDemoSession();
    const { company: a } = await engine.createCompany("Team-A", session.id);
    const { company: b } = await engine.createCompany("Team-B", session.id);
    const teams = [a, b];

    await advanceSessionToMaterial(engine, session.id, teams);

    let v = await latestVersion(engine, a.id);
    await engine.submitDecision(a.id, "MATERIAL", asiaMaterialBidPayload(10, 16), v);
    v = await latestVersion(engine, b.id);
    await engine.submitDecision(b.id, "MATERIAL", asiaMaterialBidPayload(10, 14), v);

    const desk = await engine.getGmDesk(session.id);
    const material = desk.marketResults?.material;
    expect(material?.visible).toBe(true);
    expect(material?.phase).toBe("BIDDING");
    expect(material?.cleared).toBe(false);
    const asia = material?.regions.find((r) => r.regionCode === "ASIA");
    expect(asia?.teams).toHaveLength(2);
    expect(asia?.teams.some((t) => t.awardedQty > 0)).toBe(true);

    const dashA = await engine.getDashboard(a.id);
    expect(dashA.marketResults?.material).toBeNull();
  });

  it("shows all teams' bids and awards after Step 4 clearing", async () => {
    const session = await engine.ensureDemoSession();
    const { company: a } = await engine.createCompany("Team-A", session.id);
    const { company: b } = await engine.createCompany("Team-B", session.id);
    const teams = [a, b];

    await advanceSessionToMaterial(engine, session.id, teams);

    let v = await latestVersion(engine, b.id);
    await engine.submitDecision(b.id, "MATERIAL", asiaMaterialBidPayload(10, 14), v);
    v = await latestVersion(engine, a.id);
    await engine.submitDecision(a.id, "MATERIAL", asiaMaterialBidPayload(10, 16), v);

    await engine.gmAdvanceStep(session.id);

    const dashA = await engine.getDashboard(a.id);
    const material = dashA.marketResults?.material;
    expect(material?.visible).toBe(true);
    expect(material?.cleared).toBe(true);
    expect(material?.phase).toBe("CLEARED");
    const asia = material?.regions.find((r) => r.regionCode === "ASIA");
    expect(asia?.teams).toHaveLength(2);
    expect(asia?.teams.find((t) => t.isSelf)?.awardedQty).toBeGreaterThan(0);

    const desk = await engine.getGmDesk(session.id);
    expect(desk.marketResults?.material?.regions[0]?.teams.length).toBeGreaterThanOrEqual(2);
  });
});

async function latestVersion(engine: GameEngine, companyId: string) {
  return (await engine.getDashboard(companyId)).statusVersion;
}

async function advanceSessionToMaterial(
  engine: GameEngine,
  sessionId: string,
  companies: Array<{ id: string }>
) {
  const steps: Array<{ step: "LOAN" | "FACILITY" | "HIRING"; payload: unknown }> = [
    { step: "LOAN", payload: { loanEarly: 2, loanMid: 0, deposit: 1, loanRepayment: 0 } },
    { step: "FACILITY", payload: { landPlotsPurchased: 1, machineBigPurchased: 1, machineSmallPurchased: 0 } },
    { step: "HIRING", payload: { headPurchase: 2, headProduction: 3, headSales: 2 } },
  ];

  for (const { step, payload } of steps) {
    for (const company of companies) {
      const v = await latestVersion(engine, company.id);
      await engine.submitDecision(company.id, step, payload, v);
    }
    await engine.gmAdvanceStep(sessionId);
  }

  for (const company of companies) {
    await ensureOperatingRegionsSelected(engine, company.id);
  }
}

async function advanceToMaterial(engine: GameEngine, sessionId: string, companyId: string) {
  await advanceSessionToMaterial(engine, sessionId, [{ id: companyId }]);
}
