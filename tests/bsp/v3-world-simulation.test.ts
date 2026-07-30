/**
 * V3.0 World Simulation Engine — 50+ scenario tests
 */
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { createMemoryRepositories, resetMemoryState } from "@/src/bsp/infrastructure/memory/memory-repositories";
import { GameEngine } from "@/src/bsp/application/game-engine";
import { AccountingEngine } from "@/src/bsp/domain/accounting/accounting-engine";
import { DashboardService } from "@/src/bsp/application/dashboard-service";
import { EventStoreService } from "@/src/bsp/application/event-store-service";
import { stepHandlerRegistry } from "@/src/bsp/domain/steps/step-handler-registry";
import type { GmActor } from "@/src/bsp/domain/gm/audit-types";
import { resetDraftStore } from "@/lib/v2/event-studio/draft-store";
import { resetIntelligencePublishStore } from "@/lib/v2/intelligence/publish-store";
import { resetIntelligenceService } from "@/lib/v2/intelligence/intelligence-service";
import { resetIntelligenceSessionStore } from "@/lib/v2/intelligence/session-store";
import { resetIntelligencePublishService } from "@/lib/v2/intelligence/publish-service";
import { getGameEngine } from "@/src/bsp/application/bsp-service";
import { getV3WorldSimulation, resetV3WorldSimulation } from "@/lib/v3/v3-service";
import { onWorldHalfEnd } from "@/lib/v3/world/world-lifecycle-hook";
import { resetWorldStore } from "@/lib/v3/world/world-store";
import { WorldSimulationService, resetWorldSimulationService } from "@/lib/v3/world/world-simulation-service";
import { WORLD_PROFILES, applyDimensionDelta, clampDimension, mergeCustomDimensions } from "@/lib/v3/world/world-profiles";
import { buildInitialRegions, buildInitialIndustries } from "@/lib/v3/world/regional-industry";
import { seededRandom, effectiveProbability, rollChainOutcome, formatProbabilityLabel } from "@/lib/v3/world/probability-model";
import { evaluateGameDirector, directorActionToProposalTitle } from "@/lib/v3/world/game-director";
import { generateWorldForecast, highlightTopRisks } from "@/lib/v3/world/forecast-generator";
import { buildEducationalBalance, educationalFocusLabel } from "@/lib/v3/world/educational-balance";
import { evolveWorldState, buildEvolutionProposal, buildChainProposal } from "@/lib/v3/world/evolution-engine";
import { CHAIN_TEMPLATES, getChainTemplate, instantiateChainFromTemplate } from "@/lib/v3/event-chain/chain-templates";
import { evaluateChainAtHalfEnd, getUpcomingChainEvents } from "@/lib/v3/event-chain/chain-executor";
import { buildPreviewFromProposal } from "@/lib/v3/proposals/proposal-bridge";
import type { EvolutionContext, WorldProfileId, WorldState } from "@/lib/v3/world/types";

const GM: GmActor = { userId: "gm-v3", role: "GM", reason: "V3 test" };

const PROFILES: WorldProfileId[] = [
  "STABLE_GROWTH", "HIGH_INFLATION", "AI_BOOM", "RECESSION",
  "TRADE_WAR", "ENERGY_CRISIS", "CLIMATE_TRANSITION",
];

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

function makeWorldService(engine: GameEngine) {
  return new WorldSimulationService(() => engine);
}

function mockCtx(sessionId: string, overrides?: Partial<EvolutionContext>): EvolutionContext {
  return {
    sessionId,
    periodLabel: "Y1H1",
    periodIndex: 1,
    economy: {},
    teamSummary: { avgCash: 10000, avgNetIncome: 100, submitRate: 80, strugglingTeams: 1, totalTeams: 5 },
    activeEventCount: 1,
    recentProposalCount: 0,
    ...overrides,
  };
}

function mockState(overrides?: Partial<WorldState["dimensions"]>): WorldState {
  const dims = { ...WORLD_PROFILES.STABLE_GROWTH.initialDimensions, ...overrides };
  return {
    dimensions: dims,
    regions: buildInitialRegions(dims.globalGrowth, dims.tradeEnvironment),
    industries: buildInitialIndustries(dims.technologyInnovation, dims.supplyStability),
    updatedAt: new Date().toISOString(),
    periodLabel: "Y1H1",
    periodIndex: 1,
  };
}

beforeEach(() => {
  resetMemoryState();
  resetWorldStore({ persist: false });
  resetWorldSimulationService();
  resetV3WorldSimulation();
  resetDraftStore({ persist: false });
  resetIntelligencePublishStore({ persist: false });
  resetIntelligenceService();
  resetIntelligenceSessionStore({ persist: false });
  resetIntelligencePublishService();
});

describe("V3.0 World Profiles", () => {
  for (const profileId of PROFILES) {
    it(`profile: ${profileId} has valid dimensions`, () => {
      const p = WORLD_PROFILES[profileId];
      expect(p.label).toBeTruthy();
      for (const val of Object.values(p.initialDimensions)) {
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThanOrEqual(100);
      }
    });
  }

  it("mergeCustomDimensions applies overrides", () => {
    const merged = mergeCustomDimensions(WORLD_PROFILES.AI_BOOM, { technologyInnovation: 95 });
    expect(merged.technologyInnovation).toBe(95);
  });

  it("clampDimension bounds 0-100", () => {
    expect(clampDimension(150)).toBe(100);
    expect(clampDimension(-10)).toBe(0);
  });

  it("applyDimensionDelta shifts values", () => {
    const base = WORLD_PROFILES.STABLE_GROWTH.initialDimensions;
    const next = applyDimensionDelta(base, { inflation: 10 });
    expect(next.inflation).toBe(base.inflation + 10);
  });
});

describe("V3.0 Regional & Industry Layer", () => {
  it("builds 7 game regions", () => {
    const regions = buildInitialRegions(60, 55);
    expect(regions).toHaveLength(7);
    expect(regions.map((r) => r.regionId)).toContain("ASIA");
    expect(regions.map((r) => r.label)).toContain("유럽");
  });

  it("builds 8 industries including power and energy", () => {
    const industries = buildInitialIndustries(70, 50);
    expect(industries).toHaveLength(8);
    expect(industries.find((i) => i.industryId === "SEMICONDUCTOR")?.impactMultiplier).toBe(1.3);
    expect(industries.find((i) => i.industryId === "POWER")?.label).toBe("전력");
    expect(industries.find((i) => i.industryId === "ENERGY")?.label).toBe("에너지");
  });
});

describe("V3.0 Probability Model", () => {
  it("seededRandom is deterministic", () => {
    expect(seededRandom("seed-1", 0)).toBe(seededRandom("seed-1", 0));
  });

  it("effectiveProbability respects gm override", () => {
    expect(effectiveProbability({ nodeId: "n", label: "l", probability: 0.3, gmProbability: 0.8, parentNodeId: "p" })).toBe(0.8);
  });

  it("formatProbabilityLabel", () => {
    expect(formatProbabilityLabel(0.3)).toBe("30%");
  });

  it("rollChainOutcome selects child", () => {
    const nodes = [
      { nodeId: "root", label: "R", description: "", triggerCondition: "x", probability: 1, parentNodeId: undefined, childNodeIds: ["c1"], status: "PLANNED" as const },
      { nodeId: "c1", label: "C1", description: "", triggerCondition: "x", probability: 1, parentNodeId: "root", childNodeIds: [], status: "PLANNED" as const },
    ];
    const winner = rollChainOutcome(nodes, "root", "test-seed", 0);
    expect(winner?.nodeId).toBe("c1");
  });
});

describe("V3.0 Chain Templates", () => {
  for (const template of CHAIN_TEMPLATES) {
    it(`template: ${template.id}`, () => {
      expect(template.nodes.length).toBeGreaterThan(0);
      const chain = instantiateChainFromTemplate("sess-1", template.id, "seed-t");
      expect(chain?.nodes.length).toBe(template.nodes.length);
    });
  }

  it("getChainTemplate returns tariff chain", () => {
    expect(getChainTemplate("tariff-supply-cost")?.label).toContain("관세");
  });
});

describe("V3.0 Game Director", () => {
  it("suggests INCREASE_DIFFICULTY when teams doing well", () => {
    const d = evaluateGameDirector(mockCtx("s1", {
      teamSummary: { avgCash: 20000, avgNetIncome: 500, submitRate: 90, strugglingTeams: 0, totalTeams: 5 },
    }));
    expect(d.action).toBe("INCREASE_DIFFICULTY");
    expect(d.gmOnly).toBe(true);
  });

  it("suggests RECOVERY when many struggling", () => {
    const d = evaluateGameDirector(mockCtx("s1", {
      teamSummary: { avgCash: 1000, avgNetIncome: -100, submitRate: 50, strugglingTeams: 4, totalTeams: 5 },
    }));
    expect(d.action).toBe("RECOVERY_EVENT");
  });

  it("suggests BUFFER when many active events", () => {
    const d = evaluateGameDirector(mockCtx("s1", { activeEventCount: 4 }));
    expect(d.action).toBe("BUFFER_EVENT");
  });

  it("directorActionToProposalTitle", () => {
    expect(directorActionToProposalTitle("RECOVERY_EVENT")).toContain("회복");
  });
});

describe("V3.0 Forecast", () => {
  it("generates 3 horizons", () => {
    const f = generateWorldForecast("s1", WORLD_PROFILES.AI_BOOM.initialDimensions);
    expect(f.horizons).toHaveLength(3);
    expect(f.gmOnly).toBe(true);
  });

  it("highlightTopRisks returns strings", () => {
    const f = generateWorldForecast("s1", WORLD_PROFILES.RECESSION.initialDimensions);
    expect(Array.isArray(highlightTopRisks(f))).toBe(true);
  });
});

describe("V3.0 Educational Balance", () => {
  it("boosts supply chain focus", () => {
    const b = buildEducationalBalance(["공급망"]);
    expect(b.supplyChainWeight).toBeGreaterThan(0.35);
  });

  it("educationalFocusLabel", () => {
    expect(educationalFocusLabel({ focusAreas: ["재무", "ESG"], supplyChainWeight: 0.3, financialWeight: 0.3, innovationWeight: 0.2, esgWeight: 0.2 })).toContain("재무");
  });
});

describe("V3.0 Evolution Engine", () => {
  it("evolves world state", () => {
    const state = mockState({ technologyInnovation: 80 });
    const next = evolveWorldState(state, mockCtx("s1"));
    expect(next.dimensions.supplyStability).not.toBe(state.dimensions.supplyStability);
  });

  it("builds evolution proposal", () => {
    const p = buildEvolutionProposal(mockState({ technologyInnovation: 80 }), mockCtx("s1"));
    expect(p.status).toBe("PENDING_GM");
    expect(p.gmOnly).toBe(true);
    expect(p.isEstimate).toBe(true);
  });

  it("builds chain proposal", () => {
    const p = buildChainProposal("s1", "Y1H1", 1, "관세", "desc", "node-1");
    expect(p.source).toBe("EVENT_CHAIN");
  });
});

describe("V3.0 World Simulation Service — E2E", () => {
  for (const profileId of PROFILES) {
    it(`init world: ${profileId}`, async () => {
      const engine = makeEngine();
      const svc = makeWorldService(engine);
      const session = await engine.createSession(`V3-${profileId}`);
      const world = await svc.initWorld(session.id, profileId, GM);
      expect(world.profileId).toBe(profileId);
      expect(world.currentState.dimensions.globalGrowth).toBeDefined();
      expect(world.activeChains.length).toBeGreaterThanOrEqual(0);
      expect(world.randomSeed).toBeTruthy();
    });
  }

  it("re-applies world when profile changes", async () => {
    const engine = makeEngine();
    const svc = makeWorldService(engine);
    const session = await engine.createSession("V3-ProfileSwitch");
    const recession = await svc.initWorld(session.id, "RECESSION", GM);
    expect(recession.currentState.dimensions.technologyInnovation).toBe(50);

    const aiBoom = await svc.initWorld(session.id, "AI_BOOM", GM);
    expect(aiBoom.profileId).toBe("AI_BOOM");
    expect(aiBoom.currentState.dimensions.technologyInnovation).toBe(85);
    expect(aiBoom.currentState.dimensions.energyPrice).toBe(65);

    const energy = await svc.initWorld(session.id, "ENERGY_CRISIS", GM);
    expect(energy.currentState.dimensions.energyPrice).toBe(90);
    expect(energy.currentState.dimensions.inflation).toBe(75);
  });

  it("half-end evolution creates proposals", async () => {
    const engine = makeEngine();
    const svc = makeWorldService(engine);
    const session = await engine.createSession("V3-Evolve");
    await svc.initWorld(session.id, "AI_BOOM", GM);
    const world = await svc.onHalfEnd(session.id, "Y1H1", 1);
    expect(world.proposals.length).toBeGreaterThan(0);
    expect(world.latestDirector).toBeTruthy();
    expect(world.latestForecast).toBeTruthy();
    expect(world.timeline.length).toBeGreaterThan(1);
  });

  it("manual evolve via evolveManually", async () => {
    const engine = makeEngine();
    const svc = makeWorldService(engine);
    const session = await engine.createSession("V3-Manual");
    await svc.initWorld(session.id, "TRADE_WAR", GM);
    const world = await svc.evolveManually(session.id, GM);
    expect(world.proposals.some((p) => p.status === "PENDING_GM")).toBe(true);
  });

  it("approve and publish proposal via V2.4", async () => {
    const engine = makeEngine();
    const svc = makeWorldService(engine);
    const session = await engine.createSession("V3-Publish");
    await svc.initWorld(session.id, "STABLE_GROWTH", GM);
    await svc.onHalfEnd(session.id, "Y1H1", 1);
    const pending = svc.listProposals(session.id, "PENDING_GM");
    expect(pending.length).toBeGreaterThan(0);

    const approved = svc.approveProposal(pending[0].proposalId, session.id, GM, "Test approve");
    expect(approved.status).toBe("APPROVED");

    const { result } = await svc.publishProposal(pending[0].proposalId, session.id, GM, {
      applyTiming: "IMMEDIATE",
      reason: "V3 test publish",
    });
    expect(result.newsId).toBeTruthy();
  });

  it("reject proposal", async () => {
    const engine = makeEngine();
    const svc = makeWorldService(engine);
    const session = await engine.createSession("V3-Reject");
    await svc.initWorld(session.id, "RECESSION", GM);
    await svc.onHalfEnd(session.id, "Y1H1", 1);
    const pending = svc.listProposals(session.id, "PENDING_GM")[0];
    const rejected = svc.rejectProposal(pending.proposalId, session.id, GM, "Not now");
    expect(rejected.status).toBe("REJECTED");
  });

  it("rejects approve/publish for proposal from another session", async () => {
    const engine = makeEngine();
    const svc = makeWorldService(engine);
    const sessionA = await engine.createSession("V3-Session-A");
    const sessionB = await engine.createSession("V3-Session-B");
    await svc.initWorld(sessionA.id, "STABLE_GROWTH", GM);
    await svc.onHalfEnd(sessionA.id, "Y1H1", 1);
    const pending = svc.listProposals(sessionA.id, "PENDING_GM")[0];

    expect(() => svc.approveProposal(pending.proposalId, sessionB.id, GM, "wrong session")).toThrow(
      /ERR_FORBIDDEN_SESSION|Proposal does not belong/
    );
  });

  it("update chain probability", async () => {
    const engine = makeEngine();
    const svc = makeWorldService(engine);
    const session = await engine.createSession("V3-Prob");
    const world = await svc.initWorld(session.id, "TRADE_WAR", GM);
    const chain = world.activeChains[0];
    if (chain) {
      const node = chain.nodes.find((n) => n.parentNodeId)!;
      const updated = svc.updateChainProbability(session.id, chain.chainId, node.nodeId, 0.5);
      const newNode = updated.activeChains[0].nodes.find((n) => n.nodeId === node.nodeId);
      expect(newNode?.gmProbability).toBe(0.5);
    }
  });

  it("replay world preserves seed", async () => {
    const engine = makeEngine();
    const svc = makeWorldService(engine);
    const s1 = await engine.createSession("V3-Source");
    const s2 = await engine.createSession("V3-Replay");
    await svc.initWorld(s1.id, "AI_BOOM", GM);
    await svc.onHalfEnd(s1.id, "Y1H1", 1);
    const replay = svc.replayWorld(s1.id, s2.id, GM);
    expect(replay.randomSeed).toBeTruthy();
    expect(replay.profileId).toBe("AI_BOOM");
    expect(svc.getWorld(s2.id)).toBeTruthy();
  });

  it("getTimeline returns entries", async () => {
    const engine = makeEngine();
    const svc = makeWorldService(engine);
    const session = await engine.createSession("V3-Timeline");
    await svc.initWorld(session.id, "ENERGY_CRISIS", GM);
    await svc.onHalfEnd(session.id, "Y1H1", 1);
    expect(svc.getTimeline(session.id).length).toBeGreaterThan(0);
  });

  it("chain evaluation at half end", () => {
    const chain = instantiateChainFromTemplate("s1", "supply-crisis-chain", "seed-chain")!;
    const { proposal } = evaluateChainAtHalfEnd(chain, "Y1H1", 1, 0);
    expect(proposal).toBeTruthy();
  });

  it("getUpcomingChainEvents lists planned nodes", () => {
    const chain = instantiateChainFromTemplate("s1", "ai-boom-chain", "seed-up")!;
    expect(getUpcomingChainEvents(chain).length).toBeGreaterThan(0);
  });
});

describe("V3.0 Proposal Bridge", () => {
  it("builds intelligence preview from proposal", () => {
    const p = buildEvolutionProposal(mockState(), mockCtx("s1"));
    const preview = buildPreviewFromProposal(p, GM);
    expect(preview.status).toBe("PREVIEW");
    expect(preview.scenarios).toHaveLength(3);
    expect(preview.consultant?.gmOnly).toBe(true);
  });
});

describe("V3.0 World Lifecycle Hook", () => {
  it("onWorldHalfEnd hook creates proposals", async () => {
    const engine = getGameEngine();
    const svc = getV3WorldSimulation();
    const session = await engine.createSession("V3-Hook");
    await svc.initWorld(session.id, "STABLE_GROWTH", GM);
    await onWorldHalfEnd(session.id, "Y1H1", 1);
    expect(svc.getWorld(session.id)?.proposals.length).toBeGreaterThan(0);
  });

  it("onHalfEnd via game engine closePeriod", async () => {
    const engine = getGameEngine();
    const svc = getV3WorldSimulation();
    const session = await engine.createSession("V3-Lifecycle");
    await engine.createCompany("T1", session.id);
    await svc.initWorld(session.id, "STABLE_GROWTH", GM);

    for (let i = 0; i < 6; i++) await engine.gmAdvanceStep(session.id, GM);
    await engine.closePeriod(session.id, {}, GM);

    const world = svc.getWorld(session.id);
    expect(world?.proposals.length).toBeGreaterThan(0);
  });
});

describe("V3.0 Theme Scenarios", () => {
  const themes = [
    { name: "AI Boom evolution", profile: "AI_BOOM" as WorldProfileId, dim: { technologyInnovation: 85 } },
    { name: "Trade War tension", profile: "TRADE_WAR" as WorldProfileId, dim: { geopoliticalTension: 85 } },
    { name: "Energy crisis", profile: "ENERGY_CRISIS" as WorldProfileId, dim: { energyPrice: 90 } },
    { name: "Recession recovery", profile: "RECESSION" as WorldProfileId, dim: { globalGrowth: 25 } },
    { name: "Climate transition", profile: "CLIMATE_TRANSITION" as WorldProfileId, dim: { climateRisk: 80 } },
    { name: "High inflation", profile: "HIGH_INFLATION" as WorldProfileId, dim: { inflation: 80 } },
    { name: "Stable growth", profile: "STABLE_GROWTH" as WorldProfileId, dim: {} },
  ];

  for (const { name, profile, dim } of themes) {
    it(`theme: ${name}`, async () => {
      const engine = makeEngine();
      const svc = makeWorldService(engine);
      const session = await engine.createSession(`V3-theme-${profile}`);
      await svc.initWorld(session.id, profile, GM);
      const world = await svc.onHalfEnd(session.id, "Y1H1", 1);
      expect(world.currentState.dimensions.globalGrowth).toBeDefined();
      const p = buildEvolutionProposal(mockState(dim), mockCtx(session.id));
      expect(p.economyImpacts.length).toBeGreaterThan(0);
    });
  }
});

describe("V3.0 Multi-period evolution", () => {
  it("evolves across 3 half periods", async () => {
    const engine = makeEngine();
    const svc = makeWorldService(engine);
    const session = await engine.createSession("V3-Multi");
    await engine.createCompany("T1", session.id);
    await svc.initWorld(session.id, "AI_BOOM", GM);

    for (let half = 1; half <= 3; half++) {
      await svc.onHalfEnd(session.id, `Y1H${half}`, half);
      if (half < 3) {
        for (let i = 0; i < 6; i++) await engine.gmAdvanceStep(session.id, GM);
        await engine.closePeriod(session.id, {}, GM);
        await engine.startNextHalf(session.id, GM);
      }
    }

    const world = svc.getWorld(session.id)!;
    expect(world.previousStates.length).toBeGreaterThanOrEqual(2);
    expect(world.proposals.length).toBeGreaterThan(2);
  });
});
