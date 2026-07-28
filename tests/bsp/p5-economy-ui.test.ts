/**
 * Sprint 3 P5 — Economy UI & Operations E2E scenarios
 */
import { describe, expect, it, beforeEach } from "vitest";
import { createMemoryRepositories, resetMemoryState } from "@/src/bsp/infrastructure/memory/memory-repositories";
import { GameEngine } from "@/src/bsp/application/game-engine";
import { AccountingEngine } from "@/src/bsp/domain/accounting/accounting-engine";
import { DashboardService } from "@/src/bsp/application/dashboard-service";
import { EventStoreService } from "@/src/bsp/application/event-store-service";
import { stepHandlerRegistry } from "@/src/bsp/domain/steps/step-handler-registry";
import { GM_AUDIT_ACTIONS, type GmActor } from "@/src/bsp/domain/gm/audit-types";
import { DEFAULT_ECONOMY_VALUES } from "@/src/bsp/domain/types";
import { effectiveMaterialUnitPriceManwon } from "@/src/bsp/domain/economy/material-pricing";
import { getRegion } from "@/src/bsp/domain/regions/region-catalog";

const GM: GmActor = { userId: "gm-p5", role: "GM", reason: "P5 E2E" };

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

describe("P5 Economy UI — E2E Scenarios", () => {
  beforeEach(() => resetMemoryState());

  it("Scenario 1: variable edit patches rawMaterialIndex", async () => {
    const { engine } = makeEngine();
    const session = await engine.createSession("P5-Edit");
    const result = await engine.patchEconomy(
      session.id,
      { patch: { rawMaterialIndex: 120 }, applyTiming: "IMMEDIATE", reason: "원자재 inflation" },
      GM
    );
    expect(result.patchSequence).toBeGreaterThan(0);
    const eco = await engine.getSessionEconomy(session.id);
    expect(eco.live.values.rawMaterialIndex).toBe(120);
    expect(eco.patchHistory[0]?.source).toBe("GM_MANUAL");
  });

  it("Scenario 2: preview does not change live state", async () => {
    const { engine } = makeEngine();
    const session = await engine.createSession("P5-Preview");
    const before = (await engine.getSessionEconomy(session.id)).live.values.rawMaterialIndex;
    const preview = await engine.previewEconomy(session.id, { patch: { rawMaterialIndex: 150 } });
    expect(preview.productionCostDeltaManwon).toBeGreaterThan(0);
    expect(preview.message).toContain("원자재");
    const after = (await engine.getSessionEconomy(session.id)).live.values.rawMaterialIndex;
    expect(after).toBe(before);
  });

  it("Scenario 3: preset apply updates economy with PRESET source", async () => {
    const { engine } = makeEngine();
    const session = await engine.createSession("P5-Preset");
    const result = await engine.applyEconomyPreset(session.id, "PRESET_HIGH_INTEREST", GM);
    expect(result.presetId).toBe("PRESET_HIGH_INTEREST");
    const eco = await engine.getSessionEconomy(session.id);
    expect(eco.live.values.interestRateLoan).toBe(18);
    expect(eco.patchHistory[0]?.source).toBe("PRESET");
  });

  it("Scenario 4: event patch creates EVENT_FIRE record", async () => {
    const { engine } = makeEngine();
    const session = await engine.createSession("P5-EventPatch");
    await engine.fireEvent(session.id, "EVT-001", "IMMEDIATE", GM);
    const eco = await engine.getSessionEconomy(session.id);
    expect(eco.patchHistory[0]?.source).toBe("EVENT_FIRE");
    expect(eco.live.values.exchangeRate).toBeGreaterThan(DEFAULT_ECONOMY_VALUES.exchangeRate);
  });

  it("Scenario 5: manual patch with NEXT_STEP applies on advance", async () => {
    const { engine } = makeEngine();
    const session = await engine.createSession("P5-Manual");
    await engine.createCompany("T1", session.id);
    await engine.patchEconomy(
      session.id,
      { patch: { marketDemandIndex: 90 }, applyTiming: "NEXT_STEP", reason: "수요 하락 예약" },
      GM
    );
    let eco = await engine.getSessionEconomy(session.id);
    expect(eco.live.values.marketDemandIndex).toBe(100);
    expect(eco.pendingPatches.length).toBe(1);

    await engine.gmAdvanceStep(session.id, GM);
    eco = await engine.getSessionEconomy(session.id);
    expect(eco.live.values.marketDemandIndex).toBe(90);
    expect(eco.pendingPatches.length).toBe(0);
  });

  it("Scenario 6: patch rollback restores previous values", async () => {
    const { engine } = makeEngine();
    const session = await engine.createSession("P5-Rollback");
    await engine.patchEconomy(
      session.id,
      { patch: { tariffRate: 25 }, applyTiming: "IMMEDIATE" },
      GM
    );
    expect((await engine.getSessionEconomy(session.id)).live.values.tariffRate).toBe(25);
    await engine.rollbackEconomyPatch(session.id, undefined, GM);
    expect((await engine.getSessionEconomy(session.id)).live.values.tariffRate).toBe(0);
  });

  it("Scenario 7: next step apply timing for manual patch", async () => {
    const { engine } = makeEngine();
    const session = await engine.createSession("P5-NextStep");
    await engine.createCompany("T1", session.id);
    await engine.patchEconomy(
      session.id,
      { patch: { logisticsCostMultiplier: 1.5 }, applyTiming: "NEXT_STEP" },
      GM
    );
    const pending = (await engine.getSessionEconomy(session.id)).pendingPatches;
    expect(pending[0]?.applyTiming).toBe("NEXT_STEP");
    await engine.gmAdvanceStep(session.id, GM);
    expect((await engine.getSessionEconomy(session.id)).live.values.logisticsCostMultiplier).toBe(1.5);
  });

  it("Scenario 8: next half apply timing for manual patch", async () => {
    const { engine } = makeEngine();
    const session = await engine.createSession("P5-NextHalf");
    await engine.createCompany("T1", session.id);
    await engine.patchEconomy(
      session.id,
      { patch: { businessCycleIndex: 85 }, applyTiming: "NEXT_HALF" },
      GM
    );
    expect((await engine.getSessionEconomy(session.id)).live.values.businessCycleIndex).toBe(100);

    for (let i = 0; i < 6; i++) await engine.gmAdvanceStep(session.id, GM);
    await engine.closePeriod(session.id, {}, GM);
    await engine.startNextHalf(session.id, GM);

    expect((await engine.getSessionEconomy(session.id)).live.values.businessCycleIndex).toBe(85);
  });

  it("Scenario 9: 6-half timeline accumulates patches", async () => {
    const { engine } = makeEngine();
    const session = await engine.createSession("P5-Timeline");
    await engine.createCompany("T1", session.id);

    const halfPatches = [
      { rawMaterialIndex: 110 },
      { exchangeRate: 1350 },
      { marketDemandIndex: 95 },
      { logisticsCostMultiplier: 1.2 },
      { tariffRate: 10 },
      { businessCycleIndex: 90 },
    ];

    for (let half = 0; half < 6; half++) {
      await engine.patchEconomy(
        session.id,
        { patch: halfPatches[half], applyTiming: "IMMEDIATE", reason: `P5 half ${half + 1}` },
        GM
      );
      if (half < 5) {
        for (let i = 0; i < 6; i++) await engine.gmAdvanceStep(session.id, GM);
        await engine.closePeriod(session.id, {}, GM);
        await engine.startNextHalf(session.id, GM);
      }
    }

    const eco = await engine.getSessionEconomy(session.id);
    expect(eco.patchHistory.length).toBeGreaterThanOrEqual(6);
    expect(eco.timeline.length).toBeGreaterThanOrEqual(6);
  });

  it("Scenario 10: dashboard cards reflect live economy", async () => {
    const { engine } = makeEngine();
    const session = await engine.createSession("P5-Dashboard");
    await engine.patchEconomy(
      session.id,
      { patch: { rawMaterialIndex: 130, exchangeRate: 1400 }, applyTiming: "IMMEDIATE" },
      GM
    );
    const eco = await engine.getSessionEconomy(session.id);
    expect(eco.dashboardCards.length).toBe(14);
    const rawCard = eco.dashboardCards.find((c) => c.id === "rawMaterial");
    const fxCard = eco.dashboardCards.find((c) => c.id === "exchangeRate");
    expect(rawCard?.currentValue).toBe(130);
    expect(fxCard?.currentValue).toBe(1400);
    expect(rawCard?.lastModifier).toBe("GM 수동");

    const region = getRegion("ASIA")!;
    const price = effectiveMaterialUnitPriceManwon(region, eco.live.values);
    expect(price).toBeGreaterThan(
      effectiveMaterialUnitPriceManwon(region, DEFAULT_ECONOMY_VALUES)
    );

    const env = await engine.getCeoEnvironment(session.id);
    expect(env.recentChanges.length).toBeGreaterThan(0);
    expect(env.recentChanges.some((c) => c.includes("원자재") || c.includes("환율"))).toBe(true);
    expect(env.environmentChangedBadge).toBe(true);
  });
});
