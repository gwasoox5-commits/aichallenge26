/**
 * Sprint 3 P4 — Event Engine E2E scenarios
 */
import { describe, expect, it, beforeEach } from "vitest";
import { createMemoryRepositories, resetMemoryState } from "@/src/bsp/infrastructure/memory/memory-repositories";
import { GameEngine } from "@/src/bsp/application/game-engine";
import { AccountingEngine } from "@/src/bsp/domain/accounting/accounting-engine";
import { DashboardService } from "@/src/bsp/application/dashboard-service";
import { EventStoreService } from "@/src/bsp/application/event-store-service";
import { stepHandlerRegistry } from "@/src/bsp/domain/steps/step-handler-registry";
import { GM_AUDIT_ACTIONS, type GmActor } from "@/src/bsp/domain/gm/audit-types";
import { effectiveMaterialUnitPriceManwon } from "@/src/bsp/domain/economy/material-pricing";
import { getRegion } from "@/src/bsp/domain/regions/region-catalog";
import { DEFAULT_ECONOMY_VALUES } from "@/src/bsp/domain/types";

const GM: GmActor = { userId: "gm-p4", role: "GM", reason: "P4 E2E" };

function makeEngine() {
  const repos = createMemoryRepositories();
  return {
    engine: new GameEngine(
      repos,
      stepHandlerRegistry,
      new AccountingEngine(),
      new DashboardService(),
      new EventStoreService(repos.events)
    ),
    repos,
  };
}

describe("P4 Event Engine — E2E Scenarios", () => {
  beforeEach(() => resetMemoryState());

  it("Scenario 1: FX rise (EVT-001) patches exchangeRate", async () => {
    const { engine } = makeEngine();
    const session = await engine.createSession("P4-FX");
    const fired = await engine.fireEvent(session.id, "EVT-001", "IMMEDIATE", GM);
    expect(fired.status).toBe("ACTIVE");
    const desk = await engine.getGmDesk(session.id);
    expect(desk.economy.exchangeRate).toBeGreaterThan(DEFAULT_ECONOMY_VALUES.exchangeRate);
    const patches = await engine.getSessionEconomy(session.id);
    expect(patches.patchHistory[0]?.source).toBe("EVENT_FIRE");
  });

  it("Scenario 1b: IMMEDIATE catalog fire publishes learner news", async () => {
    const { resetV2ScenarioStudio, getV2ScenarioStudio } = await import("@/lib/v2/event-studio/v2-service");
    resetV2ScenarioStudio();
    const { engine } = makeEngine();
    const session = await engine.createSession("P4-News");
    const fired = await engine.fireEvent(session.id, "EVT-001", "IMMEDIATE", GM);
    const news = getV2ScenarioStudio().listSessionNews(session.id);
    expect(news.length).toBe(1);
    expect(news[0].headline.length).toBeGreaterThan(0);
    expect(news[0].simulationEventId).toBe(fired.id);
  });

  it("Scenario 2: Rate hike (EVT-005) increases loan rate", async () => {
    const { engine } = makeEngine();
    const session = await engine.createSession("P4-Rate");
    await engine.fireEvent(session.id, "EVT-005", "IMMEDIATE", GM);
    const desk = await engine.getGmDesk(session.id);
    expect(desk.economy.interestRateLoan).toBe(13);
  });

  it("Scenario 3: Raw material spike (EVT-009) affects material pricing", async () => {
    const { engine } = makeEngine();
    const session = await engine.createSession("P4-RawMat");
    const { company } = await engine.createCompany("Team-A", session.id);
    await engine.fireEvent(session.id, "EVT-009", "IMMEDIATE", GM);
    const desk = await engine.getGmDesk(session.id);
    const region = getRegion("ASIA")!;
    const priceBefore = effectiveMaterialUnitPriceManwon(region, DEFAULT_ECONOMY_VALUES);
    const priceAfter = effectiveMaterialUnitPriceManwon(region, desk.economy);
    expect(priceAfter).toBeGreaterThan(priceBefore);
    const env = await engine.getCeoEnvironment(session.id);
    expect(env.activeEvents.some((e) => e.title.includes("원자재"))).toBe(true);
    expect(company.id).toBeTruthy();
  });

  it("Scenario 4: Supply chain disruption (EVT-013)", async () => {
    const { engine } = makeEngine();
    const session = await engine.createSession("P4-Supply");
    await engine.fireEvent(session.id, "EVT-013", "IMMEDIATE", GM);
    const desk = await engine.getGmDesk(session.id);
    expect(desk.economy.logisticsCostMultiplier).toBeGreaterThan(1);
    expect(desk.economy.marketSupplyIndex).toBeLessThan(100);
  });

  it("Scenario 5: Scheduled event applies on period start", async () => {
    const { engine } = makeEngine();
    const session = await engine.createSession("P4-Schedule");
    await engine.createCompany("T1", session.id);
    const scheduled = await engine.scheduleEvent(session.id, "EVT-006", { year: 1, half: "H2" }, GM);
    expect(scheduled.status).toBe("SCHEDULED");

    // Run through half 1 and start H2
    for (let i = 0; i < 6; i++) {
      await engine.gmAdvanceStep(session.id, GM);
    }
    await engine.closePeriod(session.id, {}, GM);
    await engine.startNextHalf(session.id, GM);

    const events = await engine.listSessionEvents(session.id);
    const active = events.active.find((e) => e.templateId === "EVT-006");
    expect(active).toBeDefined();
  });

  it("Scenario 6: Immediate event applies economy patch now", async () => {
    const { engine } = makeEngine();
    const session = await engine.createSession("P4-Immediate");
    const before = (await engine.getGmDesk(session.id)).economy.tariffRate;
    await engine.fireEvent(session.id, "EVT-020", "IMMEDIATE", GM);
    const after = (await engine.getGmDesk(session.id)).economy.tariffRate;
    expect(after).toBe(25);
    expect(before).toBe(0);
    const env = await engine.getCeoEnvironment(session.id);
    expect(env.environmentChangedBadge).toBe(true);
    expect(env.eventImpacts.length).toBeGreaterThan(0);
    expect(env.eventImpacts[0]?.regions[0]?.materialUnitPriceManwon.after).toBeGreaterThan(
      env.eventImpacts[0]?.regions[0]?.materialUnitPriceManwon.before ?? 0
    );
  });

  it("Scenario 7: Duplicate active event rejected", async () => {
    const { engine } = makeEngine();
    const session = await engine.createSession("P4-Dup");
    await engine.fireEvent(session.id, "EVT-001", "IMMEDIATE", GM);
    await expect(engine.fireEvent(session.id, "EVT-001", "IMMEDIATE", GM)).rejects.toMatchObject({
      code: "ERR_EVENT_DUPLICATE",
    });
  });

  it("Scenario 8: Event end reverses economy patch", async () => {
    const { engine } = makeEngine();
    const session = await engine.createSession("P4-End");
    const fired = await engine.fireEvent(session.id, "EVT-005", "IMMEDIATE", GM);
    expect((await engine.getGmDesk(session.id)).economy.interestRateLoan).toBe(13);
    await engine.endEvent(session.id, fired.id, GM);
    const events = await engine.listSessionEvents(session.id);
    expect(events.active.length).toBe(0);
    expect((await engine.getGmDesk(session.id)).economy.interestRateLoan).toBe(10);
  });

  it("Scenario 9: PERIOD event expires after half-year close", async () => {
    const { engine } = makeEngine();
    const session = await engine.createSession("P4-Persist");
    await engine.createCompany("T1", session.id);
    const fired = await engine.fireEvent(session.id, "EVT-001", "IMMEDIATE", GM);
    expect(fired.duration).toBe("PERIOD");

    for (let i = 0; i < 6; i++) await engine.gmAdvanceStep(session.id, GM);
    await engine.closePeriod(session.id, {}, GM);
    await engine.startNextHalf(session.id, GM);

    const events = await engine.listSessionEvents(session.id);
    expect(events.active.find((e) => e.id === fired.id)).toBeUndefined();
    expect(events.history.some((e) => e.id === fired.id && e.status === "EXPIRED")).toBe(true);
  });

  it("Scenario 10: Event history accumulates through 6 half-years", async () => {
    const { engine } = makeEngine();
    const session = await engine.createSession("P4-History");
    await engine.createCompany("T1", session.id);

    const eventIds = ["EVT-001", "EVT-005", "EVT-009", "EVT-013", "EVT-020", "EVT-050"];
    for (let half = 0; half < 6; half++) {
      await engine.fireEvent(session.id, eventIds[half % eventIds.length], "IMMEDIATE", GM, {
        allowDuplicate: true,
      });
      for (let s = 0; s < 6; s++) await engine.gmAdvanceStep(session.id, GM);
      await engine.closePeriod(session.id, {}, GM);
      if (half < 5) await engine.startNextHalf(session.id, GM);
    }

    const history = await engine.getEventHistory(session.id, 200);
    expect(history.length).toBeGreaterThanOrEqual(12);
    const audit = await engine["audit"].listSessionAudit(session.id, 100);
    expect(audit.some((a) => a.action === GM_AUDIT_ACTIONS.EVENT_FIRED)).toBe(true);
    expect(audit.some((a) => a.action === GM_AUDIT_ACTIONS.EVENT_APPLY)).toBe(true);
  });

  it("NEXT_STEP timing applies on step advance", async () => {
    const { engine } = makeEngine();
    const session = await engine.createSession("P4-NextStep");
    const loanBefore = (await engine.getGmDesk(session.id)).economy.interestRateLoan;
    await engine.fireEvent(session.id, "EVT-005", "NEXT_STEP", GM);
    expect((await engine.getGmDesk(session.id)).economy.interestRateLoan).toBe(loanBefore);
    await engine.gmAdvanceStep(session.id, GM);
    expect((await engine.getGmDesk(session.id)).economy.interestRateLoan).toBe(13);
  });

  it("catalog includes minimum 8 categories", () => {
    const { engine } = makeEngine();
    const catalog = engine.listEventCatalog();
    const categories = new Set(catalog.map((e) => e.category));
    for (const cat of ["환율", "금리", "원자재", "공급망", "관세", "경쟁사", "정부정책", "자연재해"]) {
      expect(categories.has(cat as never)).toBe(true);
    }
    expect(catalog.length).toBeGreaterThanOrEqual(18);
  });
});

describe("P4 Economy patch pipeline", () => {
  beforeEach(() => resetMemoryState());

  it("event does not bypass patch — audit trail exists", async () => {
    const { engine } = makeEngine();
    const session = await engine.createSession("P4-Pipeline");
    await engine.fireEvent(session.id, "EVT-020", "IMMEDIATE", GM);
    const economy = await engine.getSessionEconomy(session.id);
    expect(economy.patchHistory.length).toBe(1);
    expect(economy.patchHistory[0].effects.length).toBeGreaterThan(0);
    expect(economy.live.values.tariffRate).toBe(25);
  });

  it("preview does not mutate live state", async () => {
    const { engine } = makeEngine();
    const session = await engine.createSession("P4-Preview");
    const preview = await engine.previewEvent(session.id, "EVT-009");
    expect(preview.valuesAfter.rawMaterialIndex).toBeGreaterThan(preview.valuesBefore.rawMaterialIndex);
    expect((await engine.getGmDesk(session.id)).economy.rawMaterialIndex).toBe(100);
  });

  it("out of bounds patch rejected when stacked", async () => {
    const { engine } = makeEngine();
    const session = await engine.createSession("P4-Bounds");
    await engine.fireEvent(session.id, "EVT-009", "IMMEDIATE", GM);
    await engine.fireEvent(session.id, "EVT-009", "IMMEDIATE", GM, { allowDuplicate: true });
    await engine.fireEvent(session.id, "EVT-009", "IMMEDIATE", GM, { allowDuplicate: true });
    await expect(
      engine.fireEvent(session.id, "EVT-009", "IMMEDIATE", GM, { allowDuplicate: true })
    ).rejects.toMatchObject({ code: "ERR_ECONOMY_OUT_OF_BOUNDS" });
  });
});
