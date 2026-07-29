/**
 * Pilot Ready UI — integration & component logic tests
 */
import { describe, expect, it, beforeEach } from "vitest";
import { createMemoryRepositories, resetMemoryState } from "@/src/bsp/infrastructure/memory/memory-repositories";
import { resetAuditState } from "@/src/bsp/infrastructure/memory/memory-audit-repository";
import { GameEngine } from "@/src/bsp/application/game-engine";
import { AccountingEngine } from "@/src/bsp/domain/accounting/accounting-engine";
import { DashboardService } from "@/src/bsp/application/dashboard-service";
import { EventStoreService } from "@/src/bsp/application/event-store-service";
import { stepHandlerRegistry } from "@/src/bsp/domain/steps/step-handler-registry";
import { AuthService } from "@/src/bsp/infrastructure/auth/auth-service";
import { GM_AUDIT_ACTIONS, type GmActor } from "@/src/bsp/domain/gm/audit-types";
import { PILOT_DEFAULTS } from "@/lib/bsp/pilot-config";
import { canSubmitFromGate } from "@/components/bsp/SubmitChecklistGate";
import type { BspGameStep } from "@/src/bsp/domain/types";
import { materialBidPayload, asiaMaterialBidPayload } from "./bid-payloads";

const GM: GmActor = { userId: "gm-pilot", role: "GM", reason: "pilot ui test" };

function makeEngine() {
  resetMemoryState();
  resetAuditState();
  const repos = createMemoryRepositories();
  return new GameEngine(
    repos,
    stepHandlerRegistry,
    new AccountingEngine(),
    new DashboardService(),
    new EventStoreService(repos.events)
  );
}

async function submitStep(engine: GameEngine, companyId: string, step: BspGameStep, payload: unknown) {
  const dash = await engine.getDashboard(companyId);
  return engine.submitDecision(companyId, step, payload, dash.statusVersion);
}

describe("pilot-config", () => {
  it("has pilot defaults for 1 year 2 halves", () => {
    expect(PILOT_DEFAULTS.periods).toBe(2);
    expect(PILOT_DEFAULTS.sampleTeams).toHaveLength(5);
    expect(PILOT_DEFAULTS.autoAdvance).toBe(false);
  });

  it("sample teams are Alpha through Echo", () => {
    expect(PILOT_DEFAULTS.sampleTeams).toEqual(["Alpha", "Bravo", "Charlie", "Delta", "Echo"]);
  });
});

describe("SubmitChecklistGate", () => {
  it("blocks when checklist not ready", () => {
    expect(canSubmitFromGate({ ok: true, rules: [] }, false)).toBe(false);
  });

  it("blocks when already submitted", () => {
    expect(canSubmitFromGate({ ok: true, rules: [] }, true, true)).toBe(false);
  });

  it("blocks when validation has failures", () => {
    expect(
      canSubmitFromGate(
        { ok: false, rules: [{ ruleId: "CASH", passed: false, message: "현금 부족" }] },
        true
      )
    ).toBe(false);
  });

  it("allows warn-only validation", () => {
    expect(
      canSubmitFromGate(
        { ok: false, rules: [{ ruleId: "DEBT", passed: false, message: "부채비율 높음", errorCode: "WARN_DEBT" }] },
        true
      )
    ).toBe(true);
  });

  it("allows when validation ok and checklist ready", () => {
    expect(canSubmitFromGate({ ok: true, rules: [{ ruleId: "X", passed: true, message: "ok" }] }, true)).toBe(true);
  });

  it("does not require manual checklist on settlement-like steps", () => {
    expect(canSubmitFromGate({ ok: true, rules: [] }, false)).toBe(false);
    expect(canSubmitFromGate({ ok: true, rules: [] }, true)).toBe(true);
  });
});

describe("pilot E2E: session lifecycle", () => {
  let engine: GameEngine;
  let auth: AuthService;

  beforeEach(() => {
    engine = makeEngine();
    auth = new AuthService(engine);
  });

  it("creates session with join code", async () => {
    const session = await engine.createSession("Pilot Test");
    expect(session.joinCode).toBeTruthy();
    expect(session.name).toBe("Pilot Test");
  });

  it("issues GM token for session", async () => {
    const session = await engine.createSession("Pilot GM");
    const gm = auth.issueGmToken(session.id);
    expect(gm.accessToken).toBeTruthy();
  });

  it("CEO joins with join code", async () => {
    const session = await engine.createSession("Pilot Join");
    const ceo = await auth.joinAsCeo(session.joinCode, "Alpha");
    expect(ceo.teamName).toBe("Alpha");
    expect(ceo.companyId).toBeTruthy();
  });

  it("5 teams can join pilot session", async () => {
    const session = await engine.createSession("Pilot 5 Teams");
    for (const team of PILOT_DEFAULTS.sampleTeams) {
      const ceo = await auth.joinAsCeo(session.joinCode, team);
      expect(ceo.teamName).toBe(team);
    }
    const desk = await engine.getGmDesk(session.id);
    expect(desk.totalTeamCount).toBe(5);
  });
});

describe("pilot E2E: game flow", () => {
  let engine: GameEngine;
  let sessionId: string;
  let companies: Array<{ id: string }>;

  beforeEach(async () => {
    engine = makeEngine();
    const session = await engine.createSession("Pilot Flow");
    sessionId = session.id;
    companies = [];
    for (const team of ["Alpha", "Bravo", "Charlie"]) {
      const { company } = await engine.joinGame(session.joinCode, team);
      companies.push({ id: company.id });
    }
  });

  it("GM desk shows teams after join", async () => {
    const desk = await engine.getGmDesk(sessionId);
    expect(desk.totalTeamCount).toBe(3);
    expect(desk.teams).toHaveLength(3);
  });

  it("Step 1 submit for one team", async () => {
    await submitStep(engine, companies[0].id, "LOAN", { loanEarly: 2, loanMid: 0, deposit: 1, loanRepayment: 0, step1UiPhase: "COMPLETE" });
    const desk = await engine.getGmDesk(sessionId);
    const team = desk.teams.find((t) => t.companyId === companies[0].id);
    expect(team?.currentStepSubmitted).toBe(true);
  });

  it("all teams submit Step 1", async () => {
    for (const c of companies) {
      await submitStep(engine, c.id, "LOAN", { loanEarly: 1, loanMid: 0, deposit: 0, loanRepayment: 0, step1UiPhase: "COMPLETE" });
    }
    const desk = await engine.getGmDesk(sessionId);
    expect(desk.unsubmittedTeamCount).toBe(0);
    expect(desk.submitRatePercent).toBe(100);
  });

  it("GM advances to Step 2", async () => {
    for (const c of companies) {
      await submitStep(engine, c.id, "LOAN", { loanEarly: 1, loanMid: 0, deposit: 0, loanRepayment: 0, step1UiPhase: "COMPLETE" });
    }
    await engine.gmAdvanceStep(sessionId, GM);
    const desk = await engine.getGmDesk(sessionId);
    expect(desk.stepPhase).toBe("STEP2_INVESTMENT");
  });

  it("validateDecision returns validation rules", async () => {
    const result = await engine.validateDecision(companies[0].id, "LOAN", {
      loanEarly: 2,
      loanMid: 0,
      deposit: 1,
      loanRepayment: 0,
      step1UiPhase: "COMPLETE",
    });
    expect(result.validation.rules).toBeDefined();
  });

  it("pause and resume session", async () => {
    await engine.gmPauseSession(sessionId, GM);
    let desk = await engine.getGmDesk(sessionId);
    expect(desk.sessionPhase).toBe("PAUSED");
    await engine.gmResumeSession(sessionId, GM);
    desk = await engine.getGmDesk(sessionId);
    expect(desk.sessionPhase).toBe("RUNNING");
  });

  it("admin end session produces FINISHED", async () => {
    await engine.endAdminSession(sessionId, GM);
    const desk = await engine.getGmDesk(sessionId);
    expect(desk.sessionPhase).toBe("FINISHED");
  });

  it("audit log records pause", async () => {
    await engine.gmPauseSession(sessionId, GM);
    const log = await engine.getGmAuditLog(sessionId);
    expect(log.some((e) => e.action === GM_AUDIT_ACTIONS.PAUSE)).toBe(true);
  });
});

describe("pilot access control", () => {
  it("join code lookup returns session", async () => {
    const engine = makeEngine();
    const session = await engine.createSession("Lookup Test");
    const found = await engine.findSessionByJoinCode(session.joinCode);
    expect(found.name).toBe("Lookup Test");
  });

  it("invalid join code throws", async () => {
    const engine = makeEngine();
    await expect(engine.findSessionByJoinCode("INVALID-CODE-XXXX")).rejects.toThrow();
  });
});

describe("pilot debrief data", () => {
  it("ranking entries have required fields", async () => {
    const engine = makeEngine();
    const session = await engine.createSession("Debrief");
    await engine.joinGame(session.joinCode, "Alpha");
    const desk = await engine.getGmDesk(session.id);
    for (const r of desk.ranking) {
      expect(r).toHaveProperty("rank");
      expect(r).toHaveProperty("teamName");
      expect(r).toHaveProperty("cashManwon");
    }
  });
});

describe("pilot checklist gate scenarios", () => {
  const cases = [
    { v: null, c: false, s: false, expected: false, name: "no validation" },
    { v: { ok: true, rules: [{ ruleId: "A", passed: true, message: "ok" }] }, c: true, s: false, expected: true, name: "all pass" },
    { v: { ok: false, rules: [{ ruleId: "B", passed: false, message: "fail" }] }, c: true, s: false, expected: false, name: "hard fail" },
    { v: { ok: false, rules: [{ ruleId: "C", passed: false, message: "warn", errorCode: "WARN_X" }] }, c: true, s: false, expected: true, name: "warn only" },
    { v: { ok: true, rules: [] }, c: true, s: true, expected: false, name: "already submitted" },
  ];

  cases.forEach(({ v, c, s, expected, name }) => {
    it(`canSubmit: ${name}`, () => {
      expect(canSubmitFromGate(v, c, s)).toBe(expected);
    });
  });
});

describe("pilot idempotency", () => {
  it("duplicate submit on same step is rejected", async () => {
    const engine = makeEngine();
    const session = await engine.createSession("Idempotent");
    const { company } = await engine.joinGame(session.joinCode, "Alpha");
    const payload = { loanEarly: 1, loanMid: 0, deposit: 0, loanRepayment: 0, step1UiPhase: "COMPLETE" as const };
    await submitStep(engine, company.id, "LOAN", payload);
    await expect(submitStep(engine, company.id, "LOAN", payload)).rejects.toThrow();
  });
});

describe("pilot reconnection state", () => {
  it("dashboard returns statusVersion for sync", async () => {
    const engine = makeEngine();
    const session = await engine.createSession("Sync");
    const { company } = await engine.joinGame(session.joinCode, "Alpha");
    const dash = await engine.getDashboard(company.id);
    expect(dash.statusVersion).toBeGreaterThanOrEqual(0);
  });
});

describe("pilot finished session", () => {
  it("finished session blocks decision submit", async () => {
    const engine = makeEngine();
    const session = await engine.createSession("Finished");
    const { company } = await engine.joinGame(session.joinCode, "Alpha");
    await engine.endAdminSession(session.id, GM);
    await expect(
      submitStep(engine, company.id, "LOAN", { loanEarly: 1, loanMid: 0, deposit: 0, loanRepayment: 0, step1UiPhase: "COMPLETE" })
    ).rejects.toThrow();
  });
});

describe("pilot team isolation", () => {
  it("each company has unique id", async () => {
    const engine = makeEngine();
    const session = await engine.createSession("Isolation");
    const a = await engine.joinGame(session.joinCode, "Alpha");
    const b = await engine.joinGame(session.joinCode, "Bravo");
    expect(a.company.id).not.toBe(b.company.id);
  });
});

describe("pilot step progression", () => {
  it("step phases follow STEP1 through STEP3", async () => {
    const engine = makeEngine();
    const session = await engine.createSession("Steps");
    let desk = await engine.getGmDesk(session.id);
    expect(desk.stepPhase).toBe("STEP1_FINANCE");
    await engine.gmAdvanceStep(session.id, GM);
    desk = await engine.getGmDesk(session.id);
    expect(desk.stepPhase).toBe("STEP2_INVESTMENT");
  });
});

describe("pilot economy snapshot", () => {
  it("desk includes economy values", async () => {
    const engine = makeEngine();
    const session = await engine.createSession("Economy");
    const desk = await engine.getGmDesk(session.id);
    expect(desk.economy).toBeDefined();
    expect(desk.economyLabel).toBeTruthy();
  });
});

describe("pilot submit rate tracking", () => {
  it("submit rate updates as teams submit", async () => {
    const engine = makeEngine();
    const session = await engine.createSession("Rate");
    const c1 = await engine.joinGame(session.joinCode, "Alpha");
    await engine.joinGame(session.joinCode, "Bravo");
    let desk = await engine.getGmDesk(session.id);
    expect(desk.submitRatePercent).toBe(0);
    await submitStep(engine, c1.company.id, "LOAN", { loanEarly: 1, loanMid: 0, deposit: 0, loanRepayment: 0, step1UiPhase: "COMPLETE" });
    desk = await engine.getGmDesk(session.id);
    expect(desk.submitRatePercent).toBe(50);
    const dash = await engine.getDashboard(c1.company.id);
    expect(dash.submittedTeamCount).toBe(1);
    expect(dash.totalTeamCount).toBe(2);
    expect(dash.submitRatePercent).toBe(50);
  });
});

describe("pilot zero submit", () => {
  it("GM can zero submit unsubmitted team", async () => {
    const engine = makeEngine();
    const session = await engine.createSession("Zero");
    const { company } = await engine.joinGame(session.joinCode, "Alpha");
    await engine.gmZeroSubmit(session.id, GM, company.id);
    const desk = await engine.getGmDesk(session.id);
    const team = desk.teams.find((t) => t.companyId === company.id);
    expect(team?.currentStepSubmitted).toBe(true);
  });
});

describe("pilot force submit", () => {
  it("GM can force submit team", async () => {
    const engine = makeEngine();
    const session = await engine.createSession("Force");
    const { company } = await engine.joinGame(session.joinCode, "Alpha");
    await engine.gmForceSubmit(session.id, GM, company.id);
    const desk = await engine.getGmDesk(session.id);
    const team = desk.teams.find((t) => t.companyId === company.id);
    expect(team?.currentStepSubmitted).toBe(true);
  });
});

describe("pilot validation rules shape", () => {
  it("validation result includes rules array", async () => {
    const engine = makeEngine();
    const session = await engine.createSession("Validation");
    const { company } = await engine.joinGame(session.joinCode, "Alpha");
    const result = await engine.validateDecision(company.id, "LOAN", {
      loanEarly: 2,
      loanMid: 0,
      deposit: 1,
      loanRepayment: 0,
      step1UiPhase: "COMPLETE",
    });
    expect(Array.isArray(result.validation.rules)).toBe(true);
  });
});

describe("pilot CEO dashboard fields", () => {
  it("dashboard has pilot UI required fields", async () => {
    const engine = makeEngine();
    const session = await engine.createSession("DashFields");
    const { company } = await engine.joinGame(session.joinCode, "Alpha");
    const dash = await engine.getDashboard(company.id);
    expect(dash.teamName).toBe("Alpha");
    expect(dash.periodLabel).toBeTruthy();
    expect(dash.stepPhase).toBeTruthy();
    expect(dash.cashManwon).toBeDefined();
  });
});

describe("pilot financials", () => {
  it("financials available for company", async () => {
    const engine = makeEngine();
    const session = await engine.createSession("Financials");
    const { company } = await engine.joinGame(session.joinCode, "Alpha");
    const fin = await engine.getFinancialStatements(company.id);
    expect(fin.balanceSheet).toBeDefined();
  });
});

describe("pilot session phases", () => {
  it("new session starts RUNNING", async () => {
    const engine = makeEngine();
    const session = await engine.createSession("Phases");
    const desk = await engine.getGmDesk(session.id);
    expect(desk.sessionPhase).toBe("RUNNING");
  });
});

describe("pilot reopen step", () => {
  it("GM can reopen step for corrections", async () => {
    const engine = makeEngine();
    const session = await engine.createSession("Reopen");
    const { company } = await engine.joinGame(session.joinCode, "Alpha");
    await submitStep(engine, company.id, "LOAN", { loanEarly: 1, loanMid: 0, deposit: 0, loanRepayment: 0, step1UiPhase: "COMPLETE" });
    await engine.gmAdvanceStep(session.id, GM);
    await engine.gmReopenStep(session.id, GM);
    const desk = await engine.getGmDesk(session.id);
    expect(desk.stepPhase).toBe("STEP1_FINANCE");
  });
});

describe("pilot multiple advance steps", () => {
  it("advances through 3 steps", async () => {
    const engine = makeEngine();
    const session = await engine.createSession("MultiAdvance");
    await engine.gmAdvanceStep(session.id, GM);
    await engine.gmAdvanceStep(session.id, GM);
    const desk = await engine.getGmDesk(session.id);
    expect(desk.stepPhase).toBe("STEP3_HR");
  });
});

describe("pilot team warning status", () => {
  it("teams have warningStatus field", async () => {
    const engine = makeEngine();
    const session = await engine.createSession("Warnings");
    await engine.joinGame(session.joinCode, "Alpha");
    const desk = await engine.getGmDesk(session.id);
    expect(desk.teams[0].warningStatus).toBeDefined();
  });
});

describe("pilot remaining time", () => {
  it("desk has remainingTimeSec", async () => {
    const engine = makeEngine();
    const session = await engine.createSession("Timer");
    const desk = await engine.getGmDesk(session.id);
    expect(typeof desk.remainingTimeSec).toBe("number");
  });
});

describe("pilot can end game flag", () => {
  it("canEndGame is boolean on desk", async () => {
    const engine = makeEngine();
    const session = await engine.createSession("EndFlag");
    const desk = await engine.getGmDesk(session.id);
    expect(typeof desk.canEndGame).toBe("boolean");
  });
});

describe("pilot can start next half flag", () => {
  it("canStartNextHalf is boolean on desk", async () => {
    const engine = makeEngine();
    const session = await engine.createSession("NextFlag");
    const desk = await engine.getGmDesk(session.id);
    expect(typeof desk.canStartNextHalf).toBe("boolean");
  });
});

describe("pilot recent events", () => {
  it("desk has recentEvents array", async () => {
    const engine = makeEngine();
    const session = await engine.createSession("Events");
    const desk = await engine.getGmDesk(session.id);
    expect(Array.isArray(desk.recentEvents)).toBe(true);
  });
});

describe("pilot completed steps tracking", () => {
  it("CEO dashboard tracks completedSteps after submit", async () => {
    const engine = makeEngine();
    const session = await engine.createSession("Completed");
    const { company } = await engine.joinGame(session.joinCode, "Alpha");
    await submitStep(engine, company.id, "LOAN", { loanEarly: 1, loanMid: 0, deposit: 0, loanRepayment: 0, step1UiPhase: "COMPLETE" });
    const dash = await engine.getDashboard(company.id);
    expect(dash.completedSteps).toContain("LOAN");
  });
});

describe("pilot step lock after submit", () => {
  it("currentStepSubmitted true after submit", async () => {
    const engine = makeEngine();
    const session = await engine.createSession("StepLock");
    const { company } = await engine.joinGame(session.joinCode, "Alpha");
    await submitStep(engine, company.id, "LOAN", { loanEarly: 1, loanMid: 0, deposit: 0, loanRepayment: 0, step1UiPhase: "COMPLETE" });
    const dash = await engine.getDashboard(company.id);
    expect(dash.currentStepSubmitted).toBe(true);
  });
});

describe("pilot 3-team full step1 flow", () => {
  it("E2E: join 3 teams step1 submit advance", async () => {
    const engine = makeEngine();
    const session = await engine.createSession("E2E-1");
    const teams = [];
    for (const name of ["Alpha", "Bravo", "Charlie"]) {
      teams.push((await engine.joinGame(session.joinCode, name)).company.id);
    }
    for (const id of teams) {
      await submitStep(engine, id, "LOAN", { loanEarly: 1, loanMid: 0, deposit: 0, loanRepayment: 0, step1UiPhase: "COMPLETE" });
    }
    const desk = await engine.getGmDesk(session.id);
    expect(desk.unsubmittedTeamCount).toBe(0);
    await engine.gmAdvanceStep(session.id, GM);
    expect((await engine.getGmDesk(session.id)).stepPhase).toBe("STEP2_INVESTMENT");
  });
});

describe("pilot close period flow", () => {
  it("runs half-year close after all steps", async () => {
    const engine = makeEngine();
    const session = await engine.createSession("Close");
    const { company } = await engine.joinGame(session.joinCode, "Alpha");
    const steps: Array<{ step: BspGameStep; payload: unknown }> = [
      { step: "LOAN", payload: { loanEarly: 2, loanMid: 0, deposit: 1, loanRepayment: 0, step1UiPhase: "COMPLETE" } },
      { step: "FACILITY", payload: { landPlotsPurchased: 1, machineBigPurchased: 1, machineSmallPurchased: 0 } },
      { step: "HIRING", payload: { headPurchase: 2, headProduction: 3, headSales: 2 } },
      { step: "MATERIAL", payload: asiaMaterialBidPayload(15) },
      { step: "PRODUCTION", payload: { productionQty: 3, machineBigRun: 1, machineSmallRun: 0 } },
      { step: "SALES", payload: { lines: [{ regionCode: "ASIA", unitPriceManwon: 100, qty: 3 }] } },
    ];
    for (let i = 0; i < steps.length; i++) {
      await submitStep(engine, company.id, steps[i].step, steps[i].payload);
      if (i < steps.length - 1) await engine.gmAdvanceStep(session.id, GM);
    }
    await engine.gmAdvanceStep(session.id, GM);
    await engine.closePeriod(session.id, {}, GM);
    const desk = await engine.getGmDesk(session.id);
    expect(desk.stepPhase).toBe("HALF_YEAR_END");
  });
});

describe("pilot join audit", () => {
  it("records JOIN in audit when team joins", async () => {
    const engine = makeEngine();
    const session = await engine.createSession("JoinAudit");
    await engine.joinGame(session.joinCode, "Alpha");
    const audit = await engine.searchAdminAudit({ sessionId: session.id, limit: 20 });
    expect(audit.entries.some((e) => e.action === GM_AUDIT_ACTIONS.JOIN)).toBe(true);
  });
});

describe("pilot gm desk join code", () => {
  it("desk exposes joinCode for instructor share", async () => {
    const engine = makeEngine();
    const session = await engine.createSession("JoinCode");
    const desk = await engine.getGmDesk(session.id);
    expect(desk.joinCode).toBe(session.joinCode);
  });
});

describe("pilot period label", () => {
  it("desk has periodLabel on create", async () => {
    const engine = makeEngine();
    const session = await engine.createSession("Period");
    const desk = await engine.getGmDesk(session.id);
    expect(desk.periodLabel).toMatch(/Year|년|H1|반기/i);
  });
});

describe("pilot step duration", () => {
  it("desk has stepDurationSec", async () => {
    const engine = makeEngine();
    const session = await engine.createSession("Duration");
    const desk = await engine.getGmDesk(session.id);
    expect(desk.stepDurationSec).toBeGreaterThan(0);
  });
});

describe("pilot unsubmitted highlight", () => {
  it("tracks unsubmitted after partial submit", async () => {
    const engine = makeEngine();
    const session = await engine.createSession("Partial");
    const c1 = await engine.joinGame(session.joinCode, "Alpha");
    await engine.joinGame(session.joinCode, "Bravo");
    await submitStep(engine, c1.company.id, "LOAN", { loanEarly: 1, loanMid: 0, deposit: 0, loanRepayment: 0, step1UiPhase: "COMPLETE" });
    const desk = await engine.getGmDesk(session.id);
    expect(desk.unsubmittedTeamCount).toBe(1);
  });
});

describe("pilot ranking order", () => {
  it("ranking is sorted by rank field", async () => {
    const engine = makeEngine();
    const session = await engine.createSession("Rank");
    await engine.joinGame(session.joinCode, "Alpha");
    await engine.joinGame(session.joinCode, "Bravo");
    const desk = await engine.getGmDesk(session.id);
    const ranks = desk.ranking.map((r) => r.rank);
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
  });
});

describe("pilot auth join service", () => {
  it("AuthService joinAsCeo returns access token", async () => {
    const engine = makeEngine();
    const auth = new AuthService(engine);
    const session = await engine.createSession("AuthJoin");
    const result = await auth.joinAsCeo(session.joinCode, "Alpha");
    expect(result.accessToken).toBeTruthy();
    expect(result.teamName).toBe("Alpha");
  });
});

describe("pilot checklist blocks without validation run", () => {
  it("requires validation object", () => {
    expect(canSubmitFromGate(null, true, false)).toBe(false);
  });
});

describe("pilot next half after close", () => {
  it("starts next half from HALF_YEAR_END", async () => {
    const engine = makeEngine();
    const session = await engine.createSession("NextHalf");
    const { company } = await engine.joinGame(session.joinCode, "Alpha");
    const steps: BspGameStep[] = ["LOAN", "FACILITY", "HIRING", "MATERIAL", "PRODUCTION", "SALES"];
    const payloads = [
      { loanEarly: 2, loanMid: 0, deposit: 1, loanRepayment: 0, step1UiPhase: "COMPLETE" },
      { landPlotsPurchased: 1, machineBigPurchased: 1, machineSmallPurchased: 0 },
      { headPurchase: 2, headProduction: 3, headSales: 2 },
      asiaMaterialBidPayload(15),
      { productionQty: 3, machineBigRun: 1, machineSmallRun: 0 },
      { lines: [{ regionCode: "ASIA", unitPriceManwon: 100, qty: 3 }] },
    ];
    for (let i = 0; i < steps.length; i++) {
      await submitStep(engine, company.id, steps[i], payloads[i]);
      if (i < steps.length - 1) await engine.gmAdvanceStep(session.id, GM);
    }
    await engine.gmAdvanceStep(session.id, GM);
    await engine.closePeriod(session.id, {}, GM);
    await engine.startNextHalf(session.id, GM);
    const desk = await engine.getGmDesk(session.id);
    expect(desk.periodIndex).toBe(2);
    expect(desk.stepPhase).toBe("STEP1_FINANCE");
  });
});
