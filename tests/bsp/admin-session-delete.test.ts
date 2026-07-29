import { describe, expect, it, beforeEach, beforeAll, afterAll } from "vitest";
import { execSync } from "child_process";
import { createMemoryRepositories, resetMemoryState } from "@/src/bsp/infrastructure/memory/memory-repositories";
import { resetBspContainer, getBspContainer } from "@/src/bsp/application/di/container";
import { GameEngine } from "@/src/bsp/application/game-engine";
import { AccountingEngine } from "@/src/bsp/domain/accounting/accounting-engine";
import { DashboardService } from "@/src/bsp/application/dashboard-service";
import { EventStoreService } from "@/src/bsp/application/event-store-service";
import { stepHandlerRegistry } from "@/src/bsp/domain/steps/step-handler-registry";
import { GM_AUDIT_ACTIONS, type GmActor } from "@/src/bsp/domain/gm/audit-types";
import { getV3WorldSimulation } from "@/lib/v3/v3-service";
import { getWorldStore } from "@/lib/v3/world/world-store";
import { bspPrisma } from "@/src/bsp/infrastructure/prisma/client";

const hasDb = Boolean(process.env.BSP_DATABASE_URL);

const ADMIN: GmActor = {
  userId: "admin-test",
  role: "PLATFORM_ADMIN",
  reason: "delete test",
};

function makeEngine() {
  const repos = createMemoryRepositories();
  const engine = new GameEngine(
    repos,
    stepHandlerRegistry,
    new AccountingEngine(),
    new DashboardService(),
    new EventStoreService(repos.events)
  );
  return { engine, repos };
}

describe("Admin session delete", () => {
  beforeEach(() => {
    resetMemoryState();
    getWorldStore().reset();
  });

  it("permanently deletes session, companies, and world data", async () => {
    const { engine, repos } = makeEngine();
    const session = await engine.createSession("Delete Me");
    await engine.createCompany("Team A", session.id);
    await getV3WorldSimulation().initWorld(session.id, "STABLE_GROWTH", ADMIN);

    const result = await engine.deleteAdminSession(session.id, ADMIN);
    expect(result.deleted).toBe(true);

    expect(await repos.session.findById(session.id)).toBeNull();
    expect(await repos.company.listBySession(session.id)).toHaveLength(0);
    expect(getWorldStore().getSession(session.id)).toBeUndefined();
    expect(await repos.simulationEvents.listBySession(session.id)).toHaveLength(0);

    const audit = await repos.audit.search({ action: GM_AUDIT_ACTIONS.SESSION_DELETE, limit: 5 });
    expect(audit.entries.some((e) => e.payload.deletedSessionId === session.id)).toBe(true);
  });
});

describe.skipIf(!hasDb)("Admin session delete (Prisma)", () => {
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

  it("deletes a session with posted decisions and journal data", async () => {
    const engine = getBspContainer().gameEngine;
    const session = await engine.createSession("Prisma Delete Test", { teamNames: ["Alpha", "Bravo"] });
    const { company } = await engine.createCompany("Alpha", session.id);
    const dash = await engine.getDashboard(company.id);
    await engine.submitDecision(
      company.id,
      "LOAN",
      { loanEarly: 1, loanMid: 0, deposit: 0, loanRepayment: 0 },
      dash.statusVersion
    );

    const result = await engine.deleteAdminSession(session.id, ADMIN);
    expect(result.deleted).toBe(true);
    expect(await bspPrisma.bspGameSession.findUnique({ where: { id: session.id } })).toBeNull();
    expect(await bspPrisma.bspDecision.count({ where: { companyId: company.id } })).toBe(0);
    expect(await bspPrisma.bspFiscalPeriod.count({ where: { sessionId: session.id } })).toBe(0);
  });
});
