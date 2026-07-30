/** V3.0 — World Simulation Service (main orchestrator) */

import type { GameEngine } from "@/src/bsp/application/game-engine";
import { BspError } from "@/src/bsp/application/game-engine";
import type { GmActor } from "@/src/bsp/domain/gm/audit-types";
import type { ScenarioKey } from "@/lib/v2/event-studio/types";
import { getIntelligenceSessionStore } from "@/lib/v2/intelligence/session-store";
import { getIntelligencePublishService } from "@/lib/v2/intelligence/publish-service";
import { getScenarioStudioService } from "@/lib/v2/event-studio/scenario-studio-service";
import { evaluateChainAtHalfEnd, markChainNodePublished } from "../event-chain/chain-executor";
import { instantiateChainFromTemplate } from "../event-chain/chain-templates";
import { buildPreviewFromProposal } from "../proposals/proposal-bridge";
import { buildEducationalBalance, weightProposalByEducation } from "./educational-balance";
import {
  buildEvolutionProposal,
  evolveWorldState,
} from "./evolution-engine";
import { generateWorldForecast, highlightTopRisks } from "./forecast-generator";
import {
  directorActionToProposalTitle,
  evaluateGameDirector,
} from "./game-director";
import { buildInitialIndustries, buildInitialRegions, computeIndustryEventWeight } from "./regional-industry";
import { updateNodeProbability } from "./probability-model";
import type {
  EvolutionContext,
  ReplayWorldConfig,
  WorldEvolutionProposal,
  WorldProfileId,
  WorldSessionRecord,
  WorldState,
  WorldTimelineEntry,
} from "./types";
import { getWorldProfile, mergeCustomDimensions } from "./world-profiles";
import { getWorldStore } from "./world-store";

function nowIso() {
  return new Date().toISOString();
}

function uuid() {
  return crypto.randomUUID();
}

function makeSeed(sessionId: string) {
  return `world-${sessionId}-${Date.now()}`;
}

export class WorldSimulationService {
  constructor(private readonly getEngine: () => GameEngine) {}

  private store() {
    return getWorldStore();
  }

  private publishService() {
    return getIntelligencePublishService(this.getEngine, () => getScenarioStudioService(this.getEngine));
  }

  async initWorld(
    sessionId: string,
    profileId: WorldProfileId,
    actor: GmActor,
    customDimensions?: Partial<import("./types").WorldDimensionValues>
  ): Promise<WorldSessionRecord> {
    await this.getEngine().getGmDesk(sessionId);
    const existing = this.store().getSession(sessionId);
    if (existing) return existing;

    const profile = getWorldProfile(profileId);
    const dimensions = mergeCustomDimensions(profile, customDimensions);
    const desk = await this.getEngine().getGmDesk(sessionId);

    const state: WorldState = {
      dimensions,
      regions: buildInitialRegions(dimensions.globalGrowth, dimensions.tradeEnvironment),
      industries: buildInitialIndustries(dimensions.technologyInnovation, dimensions.supplyStability),
      updatedAt: nowIso(),
      periodLabel: desk.periodLabel ?? "Y1H1",
      periodIndex: desk.periodIndex ?? 1,
    };

    const seed = makeSeed(sessionId);
    const chains = (profile.chainTemplateIds ?? [])
      .map((tid) => instantiateChainFromTemplate(sessionId, tid, seed))
      .filter(Boolean) as import("./types").WorldEventChain[];

    const record: WorldSessionRecord = {
      sessionId,
      profileId,
      customProfile: customDimensions,
      randomSeed: seed,
      currentState: state,
      previousStates: [],
      activeChains: chains,
      proposals: [],
      timeline: [{
        id: uuid(),
        sessionId,
        periodLabel: state.periodLabel,
        periodIndex: state.periodIndex,
        eventLabel: `시나리오 적용 — ${profile.label}`,
        eventType: "EVOLUTION",
        detail: profile.description,
        timestamp: nowIso(),
      }],
      educationalBalance: buildEducationalBalance(profile.educationalFocus ?? []),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };

    record.latestForecast = generateWorldForecast(sessionId, dimensions);
    this.store().saveSession(record);
    return record;
  }

  getWorld(sessionId: string): WorldSessionRecord | undefined {
    return this.store().getSession(sessionId);
  }

  requireWorld(sessionId: string): WorldSessionRecord {
    const w = this.store().getSession(sessionId);
    if (!w) {
      throw Object.assign(new Error("World not initialized"), { code: "ERR_WORLD_NOT_INIT", status: 404 });
    }
    return w;
  }

  private async buildContext(sessionId: string): Promise<EvolutionContext> {
    const desk = await this.getEngine().getGmDesk(sessionId);
    const struggling = desk.teams.filter((t) => (t.cashManwon ?? 0) < 5000 || t.warningStatus === "BEHIND").length;
    const avgCash = desk.teams.length
      ? desk.teams.reduce((s, t) => s + (t.cashManwon ?? 0), 0) / desk.teams.length
      : 0;
    const avgNet = desk.teams.length
      ? desk.teams.reduce((s, t) => s + (t.halfYearSalesQty ?? 0), 0) / desk.teams.length
      : 0;

    return {
      sessionId,
      periodLabel: desk.periodLabel,
      periodIndex: desk.periodIndex,
      economy: desk.economy as unknown as Record<string, number>,
      teamSummary: {
        avgCash,
        avgNetIncome: avgNet,
        submitRate: desk.submitRatePercent ?? 0,
        strugglingTeams: struggling,
        totalTeams: desk.totalTeamCount,
      },
      activeEventCount: desk.recentEvents?.length ?? 0,
      recentProposalCount: this.requireWorld(sessionId).proposals.filter((p) => p.status === "PENDING_GM").length,
    };
  }

  async onHalfEnd(sessionId: string, periodLabel: string, periodIndex: number): Promise<WorldSessionRecord> {
    const world = this.requireWorld(sessionId);
    const ctx = await this.buildContext(sessionId);
    ctx.periodLabel = periodLabel;
    ctx.periodIndex = periodIndex;

    world.previousStates.push(structuredClone(world.currentState));
    world.currentState = evolveWorldState(world.currentState, ctx);

    const director = evaluateGameDirector(ctx);
    world.latestDirector = director;

    const evolutionProposal = buildEvolutionProposal(world.currentState, ctx, director);
    const proposals: WorldEvolutionProposal[] = [evolutionProposal];

    let rollIndex = world.proposals.length;
    const chains = world.activeChains.map((chain) => {
      const { chain: updated, proposal } = evaluateChainAtHalfEnd(
        chain,
        periodLabel,
        periodIndex,
        rollIndex++
      );
      if (proposal) proposals.push(proposal);
      return updated;
    });
    world.activeChains = chains;

    const industryIds = computeIndustryEventWeight(
      world.currentState.industries,
      world.educationalBalance.focusAreas
    );
    world.proposals.push(...weightProposalByEducation(proposals, world.educationalBalance, industryIds));

    world.latestForecast = generateWorldForecast(sessionId, world.currentState.dimensions);

    world.timeline.push({
      id: uuid(),
      sessionId,
      periodLabel,
      periodIndex,
      eventLabel: `반기 종료 — ${periodLabel}`,
      eventType: "EVOLUTION",
      detail: `${proposals.length} proposal(s). Director: ${director.action}`,
      timestamp: nowIso(),
    });

    for (const risk of highlightTopRisks(world.latestForecast).slice(0, 2)) {
      world.timeline.push({
        id: uuid(),
        sessionId,
        periodLabel,
        periodIndex,
        eventLabel: "전망 리스크",
        eventType: "FORECAST",
        detail: risk,
        timestamp: nowIso(),
      });
    }

    world.updatedAt = nowIso();
    this.store().saveSession(world);
    return world;
  }

  async onPeriodStart(sessionId: string, periodLabel: string, periodIndex: number): Promise<WorldSessionRecord> {
    const world = this.requireWorld(sessionId);
    world.currentState.periodLabel = periodLabel;
    world.currentState.periodIndex = periodIndex;
    world.updatedAt = nowIso();
    this.store().saveSession(world);
    return world;
  }

  async evolveManually(sessionId: string, actor: GmActor): Promise<WorldSessionRecord> {
    const desk = await this.getEngine().getGmDesk(sessionId);
    return this.onHalfEnd(sessionId, desk.periodLabel, desk.periodIndex);
  }

  listProposals(sessionId: string, status?: WorldEvolutionProposal["status"]) {
    const world = this.requireWorld(sessionId);
    return status ? world.proposals.filter((p) => p.status === status) : world.proposals;
  }

  approveProposal(proposalId: string, actor: GmActor, reason: string): WorldEvolutionProposal {
    const world = this.store().listSessions().find((s) =>
      s.proposals.some((p) => p.proposalId === proposalId)
    );
    if (!world) throw new BspError("ERR_WORLD_PROPOSAL", "Proposal not found", 404);

    const proposal = world.proposals.find((p) => p.proposalId === proposalId)!;
    if (proposal.status !== "PENDING_GM") {
      throw new BspError("ERR_WORLD_STATE", "Proposal not pending", 409);
    }
    proposal.status = "APPROVED";
    proposal.approvedAt = nowIso();
    proposal.approvedBy = actor.userId;

    world.timeline.push({
      id: uuid(),
      sessionId: world.sessionId,
      periodLabel: proposal.periodLabel,
      periodIndex: proposal.periodIndex,
      eventLabel: `Approved: ${proposal.title}`,
      eventType: "GM_OVERRIDE",
      detail: reason,
      timestamp: nowIso(),
    });
    world.updatedAt = nowIso();
    this.store().saveSession(world);
    return proposal;
  }

  rejectProposal(proposalId: string, actor: GmActor, reason: string): WorldEvolutionProposal {
    const world = this.store().listSessions().find((s) =>
      s.proposals.some((p) => p.proposalId === proposalId)
    );
    if (!world) throw new BspError("ERR_WORLD_PROPOSAL", "Proposal not found", 404);

    const proposal = world.proposals.find((p) => p.proposalId === proposalId)!;
    proposal.status = "REJECTED";
    world.updatedAt = nowIso();
    this.store().saveSession(world);
    return proposal;
  }

  /** Approved proposal → V2.4 Publish (GM must have approved first) */
  async publishProposal(
    proposalId: string,
    actor: GmActor,
    options?: { applyTiming?: "IMMEDIATE" | "NEXT_STEP" | "NEXT_HALF"; reason?: string }
  ) {
    const world = this.store().listSessions().find((s) =>
      s.proposals.some((p) => p.proposalId === proposalId)
    );
    if (!world) throw new BspError("ERR_WORLD_PROPOSAL", "Proposal not found", 404);

    const proposal = world.proposals.find((p) => p.proposalId === proposalId)!;
    if (proposal.status !== "APPROVED") {
      throw new BspError("ERR_WORLD_STATE", "Approve proposal before publish", 422);
    }

    const preview = buildPreviewFromProposal(proposal, actor);
    getIntelligenceSessionStore().savePreview(preview);

    const result = await this.publishService().publishFromPreview(
      preview.previewId,
      proposal.selectedScenario as ScenarioKey,
      {
        applyTiming: options?.applyTiming ?? "NEXT_HALF",
        displayMode: "DIRECTIONAL",
        reason: options?.reason ?? actor.reason ?? "V3 World proposal publish",
      },
      options?.reason ?? "V3 World Engine GM approved publish",
      actor
    );

    proposal.status = "PUBLISHED";
    proposal.publishId = result.publishId;

    if (proposal.chainNodeId) {
      world.activeChains = world.activeChains.map((chain) =>
        markChainNodePublished(chain, proposal.chainNodeId!, result.publishId)
      );
    }

    world.timeline.push({
      id: uuid(),
      sessionId: world.sessionId,
      periodLabel: proposal.periodLabel,
      periodIndex: proposal.periodIndex,
      eventLabel: `Published: ${proposal.title}`,
      eventType: "CHAIN",
      detail: result.newsId,
      timestamp: nowIso(),
    });

    world.updatedAt = nowIso();
    this.store().saveSession(world);
    return { result, proposal };
  }

  updateChainProbability(
    sessionId: string,
    chainId: string,
    nodeId: string,
    probability: number
  ): WorldSessionRecord {
    const world = this.requireWorld(sessionId);
    world.activeChains = world.activeChains.map((chain) => {
      if (chain.chainId !== chainId) return chain;
      return {
        ...chain,
        nodes: updateNodeProbability(chain.nodes, nodeId, probability),
      };
    });
    world.updatedAt = nowIso();
    this.store().saveSession(world);
    return world;
  }

  getTimeline(sessionId: string): WorldTimelineEntry[] {
    return this.requireWorld(sessionId).timeline;
  }

  getForecast(sessionId: string) {
    const world = this.requireWorld(sessionId);
    return world.latestForecast ?? generateWorldForecast(sessionId, world.currentState.dimensions);
  }

  getDirector(sessionId: string) {
    const world = this.requireWorld(sessionId);
    return world.latestDirector ?? evaluateGameDirector({
      sessionId,
      periodLabel: world.currentState.periodLabel,
      periodIndex: world.currentState.periodIndex,
      economy: {},
      teamSummary: { avgCash: 0, avgNetIncome: 0, submitRate: 0, strugglingTeams: 0, totalTeams: 0 },
      activeEventCount: 0,
      recentProposalCount: 0,
    });
  }

  replayWorld(sourceSessionId: string, newSessionId: string, actor: GmActor): ReplayWorldConfig {
    const source = this.requireWorld(sourceSessionId);
    const profile = getWorldProfile(source.profileId);
    const initialState: WorldState = {
      ...structuredClone(source.previousStates[0] ?? source.currentState),
      updatedAt: nowIso(),
      periodLabel: "Y1H1",
      periodIndex: 1,
    };

    const record: WorldSessionRecord = {
      sessionId: newSessionId,
      profileId: source.profileId,
      customProfile: source.customProfile,
      randomSeed: source.randomSeed,
      currentState: initialState,
      previousStates: [],
      activeChains: source.activeChains.map((c) =>
        instantiateChainFromTemplate(newSessionId, c.templateId, source.randomSeed)!
      ).filter(Boolean),
      proposals: [],
      timeline: [{
        id: uuid(),
        sessionId: newSessionId,
        periodLabel: "Y1H1",
        periodIndex: 1,
        eventLabel: `Replay from ${sourceSessionId}`,
        eventType: "GM_OVERRIDE",
        detail: `Seed: ${source.randomSeed}`,
        timestamp: nowIso(),
      }],
      educationalBalance: source.educationalBalance,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };

    this.store().saveSession(record);

    return {
      sessionId: newSessionId,
      sourceSessionId,
      randomSeed: source.randomSeed,
      profileId: source.profileId,
      initialState,
    };
  }
}

const globalRef = globalThis as unknown as { v3WorldSimulationService?: WorldSimulationService };

export function getWorldSimulationService(getEngine: () => GameEngine): WorldSimulationService {
  if (!globalRef.v3WorldSimulationService) {
    globalRef.v3WorldSimulationService = new WorldSimulationService(getEngine);
  }
  return globalRef.v3WorldSimulationService;
}

export function resetWorldSimulationService() {
  delete globalRef.v3WorldSimulationService;
}
