import { describe, expect, it, beforeEach } from "vitest";
import { createMemoryRepositories, resetMemoryState } from "@/src/bsp/infrastructure/memory/memory-repositories";
import { GameEngine } from "@/src/bsp/application/game-engine";
import { AccountingEngine } from "@/src/bsp/domain/accounting/accounting-engine";
import { DashboardService } from "@/src/bsp/application/dashboard-service";
import { EventStoreService } from "@/src/bsp/application/event-store-service";
import { stepHandlerRegistry } from "@/src/bsp/domain/steps/step-handler-registry";
import { GM_AUDIT_ACTIONS, type GmActor } from "@/src/bsp/domain/gm/audit-types";
import { getSessionMaxTeams, normalizeMaxTeams } from "@/lib/bsp/session-create-options";

const ADMIN: GmActor = { userId: "admin-test", role: "PLATFORM_ADMIN", reason: "team test" };

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

describe("team capacity", () => {
  beforeEach(() => {
    resetMemoryState();
  });

  it("normalizes and resolves configured capacity", () => {
    expect(normalizeMaxTeams(0)).toBeUndefined();
    expect(normalizeMaxTeams(undefined)).toBeUndefined();
    expect(normalizeMaxTeams(2)).toBe(2);
    expect(normalizeMaxTeams(999)).toBe(20);
    expect(getSessionMaxTeams({ wizardMeta: { maxTeams: 2 } })).toBe(2);
    expect(getSessionMaxTeams({ wizardMeta: { expectedTeams: 3 } })).toBe(3);
    expect(getSessionMaxTeams({})).toBeUndefined();
  });

  it("does not pre-create teams when only capacity is configured", async () => {
    const { engine } = makeEngine();
    const session = await engine.createSession("2팀 세션", { maxTeams: 2 });
    expect(await engine.listSessionCompanies(session.id)).toHaveLength(0);
  });

  it("rejects joins beyond the configured capacity", async () => {
    const { engine } = makeEngine();
    const session = await engine.createSession("2팀 세션", { maxTeams: 2 });

    await engine.joinGame(session.joinCode, "1팀");
    await engine.joinGame(session.joinCode, "2팀");
    await expect(engine.joinGame(session.joinCode, "3팀")).rejects.toMatchObject({
      code: "ERR_TEAM_CAPACITY",
      status: 409,
    });

    expect(await engine.listSessionCompanies(session.id)).toHaveLength(2);
  });

  it("lets an existing team rejoin when full and matches case-insensitively", async () => {
    const { engine } = makeEngine();
    const session = await engine.createSession("2팀 세션", { maxTeams: 2 });
    const first = await engine.joinGame(session.joinCode, "Alpha");
    await engine.joinGame(session.joinCode, "Bravo");

    const rejoin = await engine.joinGame(session.joinCode, "alpha");
    expect(rejoin.company.id).toBe(first.company.id);
    expect(await engine.listSessionCompanies(session.id)).toHaveLength(2);
  });

  it("caps pre-created team names at the configured capacity", async () => {
    const { engine } = makeEngine();
    const session = await engine.createSession("Pilot", {
      maxTeams: 2,
      teamNames: ["Alpha", "Bravo", "Charlie", "Delta"],
    });
    expect(await engine.listSessionCompanies(session.id)).toHaveLength(2);
  });

  it("leaves legacy sessions without capacity uncapped", async () => {
    const { engine } = makeEngine();
    const session = await engine.createSession("Legacy");
    await engine.joinGame(session.joinCode, "1팀");
    await engine.joinGame(session.joinCode, "2팀");
    await engine.joinGame(session.joinCode, "3팀");
    expect(await engine.listSessionCompanies(session.id)).toHaveLength(3);
  });
});

describe("team delete", () => {
  beforeEach(() => {
    resetMemoryState();
  });

  it("removes a team and frees a capacity slot", async () => {
    const { engine, repos } = makeEngine();
    const session = await engine.createSession("2팀 세션", { maxTeams: 2 });
    const { company } = await engine.joinGame(session.joinCode, "Alpha");
    await engine.joinGame(session.joinCode, "Bravo");

    const result = await engine.deleteSessionTeam(session.id, company.id, ADMIN);
    expect(result).toMatchObject({ deleted: true, teamName: "Alpha" });
    expect(await repos.company.findById(company.id)).toBeNull();
    expect(await engine.listSessionCompanies(session.id)).toHaveLength(1);

    const joined = await engine.joinGame(session.joinCode, "3팀");
    expect(joined.company.teamName).toBe("3팀");

    const audit = await repos.audit.search({ action: GM_AUDIT_ACTIONS.TEAM_DELETE, limit: 5 });
    expect(audit.entries.some((e) => e.targetTeamName === "Alpha")).toBe(true);
  });

  it("blocks deleting a team with submissions unless forced", async () => {
    const { engine } = makeEngine();
    const session = await engine.createSession("제출 세션", { maxTeams: 2 });
    const { company } = await engine.joinGame(session.joinCode, "Alpha");
    await engine.submitDecision(
      company.id,
      "LOAN",
      { loanEarly: 1, loanMid: 0, deposit: 0, loanRepayment: 0 },
      0
    );

    await expect(engine.deleteSessionTeam(session.id, company.id, ADMIN)).rejects.toMatchObject({
      code: "ERR_TEAM_HAS_SUBMISSIONS",
      status: 409,
    });

    const forced = await engine.deleteSessionTeam(session.id, company.id, ADMIN, { force: true });
    expect(forced.deleted).toBe(true);
    expect(await engine.listSessionCompanies(session.id)).toHaveLength(0);
  });

  it("rejects a team from another session", async () => {
    const { engine } = makeEngine();
    const a = await engine.createSession("A", { maxTeams: 2 });
    const b = await engine.createSession("B", { maxTeams: 2 });
    const { company } = await engine.joinGame(a.joinCode, "Alpha");

    await expect(engine.deleteSessionTeam(b.id, company.id, ADMIN)).rejects.toMatchObject({
      code: "ERR_NOT_FOUND",
    });
  });
});
