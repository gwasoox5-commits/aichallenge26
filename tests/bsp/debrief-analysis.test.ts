import { describe, expect, it } from "vitest";
import { GameEngine } from "@/src/bsp/application/game-engine";
import { AccountingEngine } from "@/src/bsp/domain/accounting/accounting-engine";
import { DashboardService } from "@/src/bsp/application/dashboard-service";
import { EventStoreService } from "@/src/bsp/application/event-store-service";
import { createMemoryRepositories } from "@/src/bsp/infrastructure/memory/memory-repositories";
import { stepHandlerRegistry } from "@/src/bsp/domain/steps/step-handler-registry";
import type { BspGameStep } from "@/src/bsp/domain/types";

function makeEngine() {
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

describe("debrief analysis", () => {
  it("summarizes team loan decisions for the current period", async () => {
    const engine = makeEngine();
    const session = await engine.createSession("Debrief Analysis");
    const { company: team1 } = await engine.joinGame(session.joinCode, "1팀");
    const { company: team2 } = await engine.joinGame(session.joinCode, "2팀");

    await submitStep(engine, team1.id, "LOAN", {
      loanEarly: 2,
      loanMid: 0,
      deposit: 0,
      loanRepayment: 0,
      step1UiPhase: "COMPLETE",
    });
    await submitStep(engine, team2.id, "LOAN", {
      loanEarly: 0,
      loanMid: 0,
      deposit: 1,
      loanRepayment: 0,
      step1UiPhase: "COMPLETE",
    });

    const analysis = await engine.getSessionDebriefAnalysis(session.id);
    expect(analysis.teams).toHaveLength(2);
    expect(analysis.teams.find((t) => t.teamName === "1팀")?.highlights.some((h) => h.includes("차입"))).toBe(true);
    expect(analysis.teams.find((t) => t.teamName === "2팀")?.highlights.some((h) => h.includes("예금"))).toBe(true);
    expect(analysis.crossTeamNotes.some((n) => n.includes("현금 1위"))).toBe(true);
  });

  it("reports no decisions when teams have not submitted", async () => {
    const engine = makeEngine();
    const session = await engine.createSession("Empty Debrief");
    await engine.joinGame(session.joinCode, "Alpha");
    const analysis = await engine.getSessionDebriefAnalysis(session.id);
    expect(analysis.teams[0].highlights[0]).toContain("아직 제출된 의사결정이 없습니다");
  });
});
