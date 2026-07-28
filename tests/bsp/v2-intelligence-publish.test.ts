/**
 * V2.4 — Live Event Publishing & Simulation Integration E2E
 */
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import WebSocket from "ws";
import { createMemoryRepositories, resetMemoryState } from "@/src/bsp/infrastructure/memory/memory-repositories";
import { GameEngine } from "@/src/bsp/application/game-engine";
import { AccountingEngine } from "@/src/bsp/domain/accounting/accounting-engine";
import { DashboardService } from "@/src/bsp/application/dashboard-service";
import { EventStoreService } from "@/src/bsp/application/event-store-service";
import { stepHandlerRegistry } from "@/src/bsp/domain/steps/step-handler-registry";
import type { GmActor } from "@/src/bsp/domain/gm/audit-types";
import { issueToken } from "@/src/bsp/infrastructure/auth/token-service";
import { RealtimeHub, setRealtimeHub } from "@/src/bsp/infrastructure/realtime/realtime-hub";
import {
  REALTIME_EVENT_TYPES,
  REALTIME_WS_PATH,
  type RealtimeEventEnvelope,
  type RealtimeServerMessage,
} from "@/src/bsp/domain/realtime/realtime-event-types";
import { DEFAULT_ECONOMY_VALUES } from "@/src/bsp/domain/types";
import { getFixtureArticle } from "@/lib/v2/intelligence/news-adapter";
import { getIntelligenceService, resetIntelligenceService } from "@/lib/v2/intelligence/intelligence-service";
import { resetIntelligenceSessionStore } from "@/lib/v2/intelligence/session-store";
import { resetIntelligencePublishStore } from "@/lib/v2/intelligence/publish-store";
import { IntelligencePublishService } from "@/lib/v2/intelligence/publish-service";
import { ScenarioStudioService } from "@/lib/v2/event-studio/scenario-studio-service";
import { resetDraftStore } from "@/lib/v2/event-studio/draft-store";
import {
  buildIntelligenceDraft,
  buildStudioOutputFromIntelligence,
  extractSourceCitations,
} from "@/lib/v2/intelligence/publish-bridge";
import { checkPatchConflicts } from "@/lib/v2/intelligence/conflict-resolver";
import { createEventChainStub } from "@/lib/v2/intelligence/event-chain-types";
import { generateConsultantFollowUp } from "@/lib/v2/intelligence/consultant-followup";
import { generateEducationalDebrief } from "@/lib/v2/intelligence/debrief-generator";
import type { ScenarioKey } from "@/lib/v2/event-studio/types";

const GM: GmActor = { userId: "gm-v24", role: "GM", reason: "V2.4 E2E" };

const THEME_ARTICLES: Array<{ theme: string; articleId: string }> = [
  { theme: "반도체 공급 부족", articleId: "news-semiconductor-001" },
  { theme: "관세 인상", articleId: "news-tariff-001" },
  { theme: "환율 급등", articleId: "news-fx-001" },
  { theme: "AI 경쟁 심화", articleId: "news-ai-001" },
  { theme: "정부 보조금", articleId: "news-subsidy-001" },
  { theme: "친환경 규제", articleId: "news-esg-001" },
  { theme: "항만 파업", articleId: "news-port-001" },
  { theme: "에너지 가격 상승", articleId: "news-energy-001" },
  { theme: "대형 경쟁사 진입", articleId: "news-competitor-001" },
  { theme: "노사분규", articleId: "news-labor-001" },
];

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

function makeStudio(engine: GameEngine) {
  return new ScenarioStudioService(() => engine);
}

function makePublishService(engine: GameEngine, studio: ScenarioStudioService) {
  return new IntelligencePublishService(() => engine, () => studio);
}

async function buildPreview(sessionId: string, articleId: string) {
  const intel = getIntelligenceService();
  const article = getFixtureArticle(articleId)!;
  const preview = await intel.createPreviewFromArticles(sessionId, [article], GM);
  await intel.buildFullPreview(preview.previewId);
  return preview.previewId;
}

function connectClient(port: number, token: string): Promise<{ ws: WebSocket; events: RealtimeEventEnvelope[] }> {
  return new Promise((resolve, reject) => {
    const events: RealtimeEventEnvelope[] = [];
    const ws = new WebSocket(`ws://127.0.0.1:${port}${REALTIME_WS_PATH}?token=${encodeURIComponent(token)}`);
    ws.on("open", () => resolve({ ws, events }));
    ws.on("message", (data) => {
      const msg = JSON.parse(String(data)) as RealtimeServerMessage;
      if (msg.op === "event") events.push(msg.event);
    });
    ws.on("error", reject);
  });
}

function waitForEvent(events: RealtimeEventEnvelope[], type: string, timeoutMs = 2000): Promise<RealtimeEventEnvelope> {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      const found = events.find((e) => e.type === type);
      if (found) return resolve(found);
      if (Date.now() - start > timeoutMs) return reject(new Error(`Timeout waiting for ${type}`));
      setTimeout(tick, 25);
    };
    tick();
  });
}

describe("V2.4 Publish Bridge", () => {
  beforeEach(() => {
    delete process.env.BSP_OPENAI_API_KEY;
    resetIntelligenceService();
    resetIntelligenceSessionStore({ persist: false });
  });

  it("builds studio output from intelligence preview", async () => {
    const previewId = await buildPreview("bridge-sess", "news-tariff-001");
    const preview = getIntelligenceService().getPreview(previewId)!;
    const output = buildStudioOutputFromIntelligence(preview);
    expect(output.meta.title).toBeTruthy();
    expect(output.scenarios.pessimistic).toBeTruthy();
    expect(output.economyVariableChanges.neutral.effects.length).toBeGreaterThan(0);
  });

  it("extracts source citations from articles", async () => {
    const previewId = await buildPreview("bridge-sess-2", "news-fx-001");
    const preview = getIntelligenceService().getPreview(previewId)!;
    const citations = extractSourceCitations(preview);
    expect(citations[0].url).toMatch(/^https?:/);
    expect(citations[0].outlet).toBeTruthy();
  });

  it("builds draft with mapped engine effects", async () => {
    const { engine } = makeEngine();
    const session = await engine.createSession("V2-Bridge");
    const previewId = await buildPreview(session.id, "news-semiconductor-001");
    const preview = getIntelligenceService().getPreview(previewId)!;
    const desk = await engine.getGmDesk(session.id);
    const draft = buildIntelligenceDraft(preview, GM, desk.economy);
    expect(draft.outcomes?.neutral.mappedEngineEffects.length).toBeGreaterThan(0);
    expect(draft.studioOutput!.meta.sourcePromptHash).toContain("intel-");
  });
});

describe("V2.4 Publish Workflow — E2E", () => {
  let hub: RealtimeHub;
  let port: number;

  beforeEach(async () => {
    resetMemoryState();
    resetDraftStore({ persist: false });
    resetIntelligencePublishStore({ persist: false });
    resetIntelligenceService();
    resetIntelligenceSessionStore({ persist: false });
    delete process.env.BSP_OPENAI_API_KEY;
    hub = new RealtimeHub();
    port = await hub.listen(0);
    setRealtimeHub(hub);
  });

  afterEach(async () => {
    setRealtimeHub(undefined);
    await hub.close();
  });

  it("Scenario 1: Manual immediate publish from intelligence preview", async () => {
    const { engine } = makeEngine();
    const studio = makeStudio(engine);
    const publish = makePublishService(engine, studio);
    const session = await engine.createSession("V24-Imm");
    const previewId = await buildPreview(session.id, "news-tariff-001");

    const result = await publish.publishFromPreview(
      previewId,
      "neutral",
      { applyTiming: "IMMEDIATE", displayMode: "DIRECTIONAL", reason: "Immediate intel publish" },
      "GM approved",
      GM
    );

    expect(result.status).toBe("ACTIVE");
    expect(result.newsId).toBeTruthy();
    expect(result.simulationEventId).toBeTruthy();
    const record = publish.getRecord(result.publishId);
    expect(record?.status).toBe("ACTIVE");
    expect(record?.followUp?.gmOnly).toBe(true);
  });

  it("Scenario 2: Breaking news created on publish", async () => {
    const { engine } = makeEngine();
    const studio = makeStudio(engine);
    const publish = makePublishService(engine, studio);
    const session = await engine.createSession("V24-News");
    const previewId = await buildPreview(session.id, "news-fx-001");

    const result = await publish.publishFromPreview(
      previewId,
      "pessimistic",
      { applyTiming: "IMMEDIATE", displayMode: "DIRECTIONAL", reason: "News test" },
      "GM approved",
      GM
    );

    const news = studio.listSessionNews(session.id);
    expect(news.some((n) => n.newsId === result.newsId)).toBe(true);
    expect(news.find((n) => n.newsId === result.newsId)?.publishedAt).toBeTruthy();
  });

  it("Scenario 3: Economy patch applied on immediate publish", async () => {
    const { engine } = makeEngine();
    const studio = makeStudio(engine);
    const publish = makePublishService(engine, studio);
    const session = await engine.createSession("V24-Econ");
    const before = (await engine.getGmDesk(session.id)).economy.marketDemandIndex;
    const previewId = await buildPreview(session.id, "news-competitor-001");

    await publish.publishFromPreview(
      previewId,
      "pessimistic",
      { applyTiming: "IMMEDIATE", displayMode: "DIRECTIONAL", reason: "Economy test" },
      "GM approved",
      GM
    );

    const after = (await engine.getGmDesk(session.id)).economy.marketDemandIndex;
    expect(after).not.toBe(before);
  });

  it("Scenario 4: Next step scheduled publish", async () => {
    const { engine } = makeEngine();
    const studio = makeStudio(engine);
    const publish = makePublishService(engine, studio);
    const session = await engine.createSession("V24-NextStep");
    await engine.createCompany("T1", session.id);
    const previewId = await buildPreview(session.id, "news-port-001");

    const result = await publish.publishFromPreview(
      previewId,
      "neutral",
      { applyTiming: "NEXT_STEP", displayMode: "DIRECTIONAL", reason: "Next step" },
      "GM approved",
      GM
    );

    expect(result.status).toBe("SCHEDULED");
    expect(studio.listSessionNews(session.id).length).toBe(0);

    await engine.gmAdvanceStep(session.id, GM);
    expect(studio.listSessionNews(session.id).length).toBe(1);
  });

  it("Scenario 5: Next half scheduled publish", async () => {
    const { engine } = makeEngine();
    const studio = makeStudio(engine);
    const publish = makePublishService(engine, studio);
    const session = await engine.createSession("V24-NextHalf");
    await engine.createCompany("T1", session.id);
    const previewId = await buildPreview(session.id, "news-energy-001");

    await publish.publishFromPreview(
      previewId,
      "neutral",
      { applyTiming: "NEXT_HALF", displayMode: "DIRECTIONAL", reason: "Next half" },
      "GM approved",
      GM
    );

    for (let i = 0; i < 6; i++) await engine.gmAdvanceStep(session.id, GM);
    await engine.closePeriod(session.id, {}, GM);
    await engine.startNextHalf(session.id, GM);

    expect(studio.listSessionNews(session.id).length).toBe(1);
  });

  it("Scenario 6: WebSocket news.published to CEOs", async () => {
    const { engine } = makeEngine();
    const studio = makeStudio(engine);
    const publish = makePublishService(engine, studio);
    const session = await engine.createSession("V24-WS");
    const { company } = await engine.createCompany("CEO-WS", session.id);
    const token = issueToken({
      userId: company.id,
      role: "CEO",
      sessionId: session.id,
      companyId: company.id,
      teamName: company.teamName,
    });
    const { ws, events } = await connectClient(port, token);
    const previewId = await buildPreview(session.id, "news-ai-001");

    await publish.publishFromPreview(
      previewId,
      "neutral",
      { applyTiming: "IMMEDIATE", displayMode: "DIRECTIONAL", reason: "WS test" },
      "GM approved",
      GM
    );

    const evt = await waitForEvent(events, REALTIME_EVENT_TYPES.NEWS_PUBLISHED);
    expect(evt.payload.headline).toBeTruthy();
    ws.close();
  });

  it("Scenario 7: Duplicate publish idempotency", async () => {
    const { engine } = makeEngine();
    const studio = makeStudio(engine);
    const publish = makePublishService(engine, studio);
    const session = await engine.createSession("V24-Idem");
    const previewId = await buildPreview(session.id, "news-subsidy-001");
    const key = "intel-idem-001";

    const first = await publish.publishFromPreview(
      previewId,
      "neutral",
      { applyTiming: "IMMEDIATE", displayMode: "DIRECTIONAL", reason: "First" },
      "GM approved",
      GM,
      key
    );
    const second = await publish.publishFromPreview(
      previewId,
      "neutral",
      { applyTiming: "IMMEDIATE", displayMode: "DIRECTIONAL", reason: "Second" },
      "GM approved",
      GM,
      key
    );

    expect(second.simulationEventId).toBe(first.simulationEventId);
    expect(studio.listSessionNews(session.id).length).toBe(1);
  });

  it("Scenario 8: Publish audit timeline recorded", async () => {
    const { engine } = makeEngine();
    const studio = makeStudio(engine);
    const publish = makePublishService(engine, studio);
    const session = await engine.createSession("V24-Timeline");
    const previewId = await buildPreview(session.id, "news-esg-001");

    const result = await publish.publishFromPreview(
      previewId,
      "neutral",
      { applyTiming: "IMMEDIATE", displayMode: "DIRECTIONAL", reason: "Timeline test" },
      "GM approved",
      GM
    );

    const timeline = publish.getTimeline(result.publishId);
    expect(timeline.some((t) => t.phase === "PUBLISHED")).toBe(true);
    expect(timeline.some((t) => t.phase === "CREATED")).toBe(true);
    expect(publish.getAudits(result.publishId).length).toBeGreaterThan(0);
  });

  it("Scenario 9: Conflict check before publish", async () => {
    const { engine } = makeEngine();
    const studio = makeStudio(engine);
    const publish = makePublishService(engine, studio);
    const session = await engine.createSession("V24-Conflict");
    const previewId1 = await buildPreview(session.id, "news-tariff-001");
    const previewId2 = await buildPreview(session.id, "news-fx-001");

    await publish.publishFromPreview(
      previewId1,
      "pessimistic",
      { applyTiming: "IMMEDIATE", displayMode: "DIRECTIONAL", reason: "First event" },
      "GM approved",
      GM
    );

    const record2 = await publish.initiatePublish(previewId2, "pessimistic", GM);
    const conflicts = await publish.checkConflicts(record2.publishId);
    expect(conflicts.activeEventCount).toBeGreaterThanOrEqual(1);
    expect(typeof conflicts.canProceed).toBe("boolean");
  });

  it("Scenario 10: Expire reverses economy patch", async () => {
    const { engine } = makeEngine();
    const studio = makeStudio(engine);
    const publish = makePublishService(engine, studio);
    const session = await engine.createSession("V24-Expire");
    const before = (await engine.getGmDesk(session.id)).economy.marketDemandIndex;
    const previewId = await buildPreview(session.id, "news-labor-001");

    const result = await publish.publishFromPreview(
      previewId,
      "neutral",
      { applyTiming: "IMMEDIATE", displayMode: "DIRECTIONAL", reason: "Expire test" },
      "GM approved",
      GM
    );

    expect((await engine.getGmDesk(session.id)).economy.marketDemandIndex).not.toBe(before);
    await publish.expire(result.publishId, GM);
    expect((await engine.getGmDesk(session.id)).economy.marketDemandIndex).toBe(before);
    expect(publish.getRecord(result.publishId)?.debrief?.gmOnly).toBe(true);
  });

  it("Scenario 11: Archive after expire", async () => {
    const { engine } = makeEngine();
    const studio = makeStudio(engine);
    const publish = makePublishService(engine, studio);
    const session = await engine.createSession("V24-Archive");
    const previewId = await buildPreview(session.id, "news-semiconductor-001");

    const result = await publish.publishFromPreview(
      previewId,
      "neutral",
      { applyTiming: "IMMEDIATE", displayMode: "DIRECTIONAL", reason: "Archive test" },
      "GM approved",
      GM
    );

    await publish.expire(result.publishId, GM);
    const archived = publish.archive(result.publishId, GM);
    expect(archived.status).toBe("ARCHIVED");
    expect(archived.archivedAt).toBeTruthy();
  });

  it("Scenario 12: Replay with different scenario", async () => {
    const { engine } = makeEngine();
    const studio = makeStudio(engine);
    const publish = makePublishService(engine, studio);
    const session = await engine.createSession("V24-Replay");
    const previewId = await buildPreview(session.id, "news-tariff-001");

    const first = await publish.publishFromPreview(
      previewId,
      "neutral",
      { applyTiming: "IMMEDIATE", displayMode: "DIRECTIONAL", reason: "Original" },
      "GM approved",
      GM
    );

    const { replay, result } = await publish.createReplay(
      first.publishId,
      "pessimistic",
      { applyTiming: "IMMEDIATE", displayMode: "DIRECTIONAL", reason: "Replay pessimistic" },
      "Replay test",
      GM
    );

    expect(replay.originalScenario).toBe("neutral");
    expect(replay.replayScenario).toBe("pessimistic");
    expect(result.simulationEventId).not.toBe(first.simulationEventId);
  });

  it("Scenario 13: AI consultant follow-up generated", async () => {
    const { engine } = makeEngine();
    const studio = makeStudio(engine);
    const publish = makePublishService(engine, studio);
    const session = await engine.createSession("V24-FollowUp");
    const previewId = await buildPreview(session.id, "news-fx-001");

    const result = await publish.publishFromPreview(
      previewId,
      "neutral",
      { applyTiming: "IMMEDIATE", displayMode: "DIRECTIONAL", reason: "Follow-up test" },
      "GM approved",
      GM
    );

    const record = publish.getRecord(result.publishId)!;
    expect(record.followUp?.comments.length).toBeGreaterThan(0);
    expect(record.followUp?.gmOnly).toBe(true);
  });

  it("Scenario 14: Educational debrief on expire", async () => {
    const previewId = await buildPreview("debrief-sess", "news-ai-001");
    const preview = getIntelligenceService().getPreview(previewId)!;
    const debrief = generateEducationalDebrief("pub-test", preview);
    expect(debrief.majorChoices.length).toBeGreaterThan(0);
    expect(debrief.nextDiscussionQuestions.length).toBeGreaterThan(0);
    expect(debrief.gmOnly).toBe(true);
  });

  it("Scenario 15: Event chain stub created on publish", async () => {
    const { engine } = makeEngine();
    const studio = makeStudio(engine);
    const publish = makePublishService(engine, studio);
    const session = await engine.createSession("V24-Chain");
    const previewId = await buildPreview(session.id, "news-tariff-001");

    const result = await publish.publishFromPreview(
      previewId,
      "neutral",
      { applyTiming: "IMMEDIATE", displayMode: "DIRECTIONAL", reason: "Chain test" },
      "GM approved",
      GM
    );

    const record = publish.getRecord(result.publishId)!;
    expect(record.eventChainId).toBeTruthy();
    const chain = createEventChainStub(session.id, result.publishId, "Test event");
    expect(chain.nodes[0].status).toBe("PLANNED");
  });

  it("Scenario 16: Acknowledgement summary tracks teams", async () => {
    const { engine } = makeEngine();
    const studio = makeStudio(engine);
    const publish = makePublishService(engine, studio);
    const session = await engine.createSession("V24-Ack");
    await engine.createCompany("T1", session.id);
    await engine.createCompany("T2", session.id);
    const previewId = await buildPreview(session.id, "news-port-001");

    const result = await publish.publishFromPreview(
      previewId,
      "neutral",
      { applyTiming: "IMMEDIATE", displayMode: "DIRECTIONAL", reason: "Ack test" },
      "GM approved",
      GM
    );

    const summary = await publish.getAcknowledgementSummary(session.id, result.newsId);
    expect(summary.totalTeams).toBe(2);
    expect(summary.acknowledgedTeams).toBe(0);
    expect(summary.pendingTeams.length).toBe(2);
  });

  it("Scenario 17: Step-by-step workflow (initiate → approve → publish)", async () => {
    const { engine } = makeEngine();
    const studio = makeStudio(engine);
    const publish = makePublishService(engine, studio);
    const session = await engine.createSession("V24-Steps");
    const previewId = await buildPreview(session.id, "news-esg-001");

    let record = await publish.initiatePublish(previewId, "optimistic", GM);
    expect(record.status).toBe("GENERATED");

    record = publish.markReviewed(record.publishId, GM);
    expect(record.status).toBe("REVIEWED");

    record = publish.approve(record.publishId, "Reviewed and approved", GM);
    expect(record.status).toBe("APPROVED");

    record = publish.schedule(
      record.publishId,
      { applyTiming: "IMMEDIATE", displayMode: "DIRECTIONAL", reason: "Step publish" },
      GM
    );
    expect(record.status).toBe("SCHEDULED");

    const result = await publish.publish(record.publishId, { reason: "Final publish" }, GM);
    expect(result.status).toBe("ACTIVE");
  });

  it("Scenario 18: V1 game audit on intelligence publish path", async () => {
    const { engine, repos } = makeEngine();
    const studio = makeStudio(engine);
    const publish = makePublishService(engine, studio);
    const session = await engine.createSession("V24-Audit");
    const previewId = await buildPreview(session.id, "news-subsidy-001");

    await publish.publishFromPreview(
      previewId,
      "neutral",
      { applyTiming: "IMMEDIATE", displayMode: "DIRECTIONAL", reason: "Audit test" },
      "GM approved",
      GM
    );

    const logs = await repos.audit.listBySession(session.id);
    expect(logs.some((l) => l.action === "EVENT_AI_APPROVED")).toBe(true);
    expect(logs.some((l) => l.action === "EVENT_FIRED")).toBe(true);
  });

  it("Scenario 19: No economy change before GM publish", async () => {
    const { engine } = makeEngine();
    const session = await engine.createSession("V24-NoApply");
    const economyBefore = { ...(await engine.getGmDesk(session.id)).economy };
    await buildPreview(session.id, "news-fx-001");
    const economyAfter = (await engine.getGmDesk(session.id)).economy;
    expect(economyAfter).toEqual(economyBefore);
    expect(economyAfter.marketDemandIndex).toBe(DEFAULT_ECONOMY_VALUES.marketDemandIndex);
  });

  it("Scenario 20: Publish store survives snapshot restore", () => {
    const { engine } = makeEngine();
    const studio = makeStudio(engine);
    const publish = makePublishService(engine, studio);
    const snap = publish["store"]().getSnapshot();
    publish["store"]().restoreSnapshot(snap);
    expect(publish["store"]().getSnapshot().records).toEqual(snap.records);
  });
});

describe("V2.4 Conflict Resolver", () => {
  it("returns canProceed true when no active events", () => {
    const { engine } = makeEngine();
    const result = checkPatchConflicts(
      DEFAULT_ECONOMY_VALUES,
      [{ key: "marketDemandIndex", mode: "PERCENT", value: -5 }],
      [],
      []
    );
    expect(result.canProceed).toBe(true);
    expect(result.conflicts).toHaveLength(0);
  });
});

describe("V2.4 Consultant Follow-up", () => {
  beforeEach(() => {
    resetIntelligenceService();
    resetIntelligenceSessionStore({ persist: false });
  });

  it("generates GM-only follow-up comments", async () => {
    const previewId = await buildPreview("followup-sess", "news-fx-001");
    const preview = getIntelligenceService().getPreview(previewId)!;
    const followUp = generateConsultantFollowUp("pub-1", preview);
    expect(followUp.gmOnly).toBe(true);
    expect(followUp.comments.length).toBeGreaterThan(0);
  });
});

describe("V2.4 Theme Publish Scenarios", () => {
  beforeEach(async () => {
    resetMemoryState();
    resetDraftStore({ persist: false });
    resetIntelligencePublishStore({ persist: false });
    resetIntelligenceService();
    resetIntelligenceSessionStore({ persist: false });
    delete process.env.BSP_OPENAI_API_KEY;
  });

  for (const { theme, articleId } of THEME_ARTICLES) {
    it(`theme publish: ${theme}`, async () => {
      const { engine } = makeEngine();
      const studio = makeStudio(engine);
      const publish = makePublishService(engine, studio);
      const session = await engine.createSession(`V24-${articleId}`);
      const previewId = await buildPreview(session.id, articleId);

      const result = await publish.publishFromPreview(
        previewId,
        "neutral" as ScenarioKey,
        { applyTiming: "IMMEDIATE", displayMode: "DIRECTIONAL", reason: theme },
        "GM approved",
        GM
      );

      expect(result.newsId).toBeTruthy();
      expect(studio.listSessionNews(session.id).length).toBe(1);
      expect(publish.getRecord(result.publishId)?.sourceCitations.length).toBeGreaterThan(0);
    });
  }
});
