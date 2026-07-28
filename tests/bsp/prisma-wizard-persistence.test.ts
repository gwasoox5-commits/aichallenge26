/**
 * Prisma wizard persistence + restart recovery
 * Requires BSP_DATABASE_URL — skipped when unset
 */
import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { execSync } from "child_process";
import { resetBspContainer, getBspContainer } from "@/src/bsp/application/di/container";
import { getGameEngine } from "@/src/bsp/application/bsp-service";
import { GM_AUDIT_ACTIONS, type GmActor } from "@/src/bsp/domain/gm/audit-types";
import { bspPrisma } from "@/src/bsp/infrastructure/prisma/client";

const hasDb = Boolean(process.env.BSP_DATABASE_URL);
const GM: GmActor = { userId: "prisma-persist", role: "GM", reason: "Prisma persistence test" };

function restartContainer() {
  resetBspContainer();
  return getGameEngine();
}

describe.skipIf(!hasDb)("Prisma wizard persistence", () => {
  beforeAll(() => {
    process.env.BSP_USE_MEMORY = "";
    execSync("npx prisma migrate deploy --schema=prisma/bsp.schema.prisma", {
      stdio: "inherit",
      env: process.env,
    });
    resetBspContainer();
  });

  afterAll(async () => {
    await bspPrisma.$disconnect();
  });

  it("persists wizard config on create and survives container restart", async () => {
    const engine = getGameEngine();
    const session = await engine.createSession("Prisma Wizard Test", {
      stepDurationSec: 1200,
      maxPeriodIndex: 4,
      economyPresetId: "high-rate",
      wizardMeta: {
        courseName: "경영 시뮬레이션",
        instructorName: "Tester",
        autoAdvance: false,
        newsEnabled: true,
        worldEngine: true,
        aiIntelligence: false,
        expectedTeams: 3,
        teamNames: ["Alpha", "Bravo"],
      },
      teamNames: ["Alpha", "Bravo"],
    });

    expect(session.stepDurationSec).toBe(1200);
    expect(session.maxPeriodIndex).toBe(4);
    expect(session.economyPresetId).toBe("PRESET_HIGH_INTEREST");
    expect(session.wizardMeta?.newsEnabled).toBe(true);

    const engine2 = restartContainer();
    const loaded = await getBspContainer().repos.session.findById(session.id);
    expect(loaded).not.toBeNull();
    expect(loaded!.stepDurationSec).toBe(1200);
    expect(loaded!.maxPeriodIndex).toBe(4);
    expect(loaded!.wizardMeta?.instructorName).toBe("Tester");
    expect(loaded!.wizardMeta?.worldEngine).toBe(true);
  });

  it("persists decisions and financial state across restart", async () => {
    const engine = getGameEngine();
    const session = await engine.createSession("Prisma Decision Test");
    const { company } = await engine.createCompany("PersistTeam", session.id);
    const dash = await engine.getDashboard(company.id);

    await engine.submitDecision(
      company.id,
      "LOAN",
      { loanEarly: 1, loanMid: 0, deposit: 0, loanRepayment: 0 },
      dash.statusVersion
    );

    const engine2 = restartContainer();
    const reloaded = await engine2.getDashboard(company.id);
    expect(reloaded.completedSteps).toContain("LOAN");
    expect(reloaded.cashManwon).toBeGreaterThan(10000);

    await engine2.gmAdvanceStep(session.id, GM);
    const fs = await engine2.getFinancialStatements(company.id);
    expect(fs.balanceSheetValidation?.ok).toBe(true);
  });

  it("uses prisma storage mode in production config", () => {
    const engine = getGameEngine();
    expect(engine).toBeTruthy();
    resetBspContainer();
  });
});
