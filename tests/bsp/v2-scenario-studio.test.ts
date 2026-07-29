/**
 * V2.1a — Scenario Publishing & Global Event Integration E2E
 */
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import WebSocket from "ws";
import { createMemoryRepositories, resetMemoryState } from "@/src/bsp/infrastructure/memory/memory-repositories";
import { GameEngine } from "@/src/bsp/application/game-engine";
import { AccountingEngine } from "@/src/bsp/domain/accounting/accounting-engine";
import { DashboardService } from "@/src/bsp/application/dashboard-service";
import { EventStoreService } from "@/src/bsp/application/event-store-service";
import { stepHandlerRegistry } from "@/src/bsp/domain/steps/step-handler-registry";
import { type GmActor } from "@/src/bsp/domain/gm/audit-types";
import { issueToken } from "@/src/bsp/infrastructure/auth/token-service";
import { RealtimeHub, setRealtimeHub } from "@/src/bsp/infrastructure/realtime/realtime-hub";
import {
  REALTIME_EVENT_TYPES,
  REALTIME_WS_PATH,
  type RealtimeEventEnvelope,
  type RealtimeServerMessage,
} from "@/src/bsp/domain/realtime/realtime-event-types";
import { DEFAULT_ECONOMY_VALUES } from "@/src/bsp/domain/types";
import { ScenarioStudioService } from "@/lib/v2/event-studio/scenario-studio-service";
import { DraftStore, resetDraftStore } from "@/lib/v2/event-studio/draft-store";
import { selectScenarioOutcome } from "@/lib/v2/event-studio/scenario-selector";
import type { EventStudioInput, ScenarioKey } from "@/lib/v2/event-studio/types";

const GM: GmActor = { userId: "gm-v2", role: "GM", reason: "V2.1a E2E" };

const BASE_INPUT: EventStudioInput = {
  naturalLanguagePrompt:
    "미국과 EU가 전기차 보조금을 축소하고, 아시아산 부품에 관세 인상을 검토하고 있습니다. 교육용 시나리오입니다.",
  targetIndustry: "자동차·부품",
  targetMarketOrRegion: "북미 · EU",
  expectedDuration: "1~2반기",
  targetHalfLabel: "Y2H1",
  analysisIntensity: "STANDARD",
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

function makeStudio(engine: GameEngine) {
  return new ScenarioStudioService(() => engine);
}

async function pipelineToSelected(
  studio: ScenarioStudioService,
  sessionId: string,
  scenario: ScenarioKey,
  mode: "MANUAL" | "EQUAL_RANDOM" | "WEIGHTED_RANDOM" = "MANUAL",
  weights?: { pessimistic: number; neutral: number; optimistic: number },
  seed?: string
) {
  const draft = await studio.createDraft(sessionId, BASE_INPUT, GM);
  await studio.generateDraft(draft.draftId, GM);
  studio.selectOutcome(
    draft.draftId,
    { mode, selectedOutcome: mode === "MANUAL" ? scenario : undefined, weights, randomSeed: seed },
    GM
  );
  studio.scheduleDraft(
    draft.draftId,
    { applyTiming: "IMMEDIATE", displayMode: "DIRECTIONAL", reason: "E2E test" },
    GM
  );
  return draft.draftId;
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

describe("V2.1a Scenario Studio — E2E", () => {
  let hub: RealtimeHub;
  let port: number;

  beforeEach(async () => {
    resetMemoryState();
    resetDraftStore({ persist: false });
    delete process.env.BSP_OPENAI_API_KEY;
    hub = new RealtimeHub();
    port = await hub.listen(0);
    setRealtimeHub(hub);
  });

  afterEach(async () => {
    setRealtimeHub(undefined);
    await hub.close();
  });

  it("Scenario 1: Manual pessimistic selection", async () => {
    const { engine } = makeEngine();
    const studio = makeStudio(engine);
    const session = await engine.createSession("V2-Pess");
    const draftId = await pipelineToSelected(studio, session.id, "pessimistic");
    const result = await studio.approveDraft(draftId, { reason: "Manual pessimistic" }, GM);
    expect(result.status).toBe("ACTIVE");
    const draft = studio.getDraft(draftId);
    expect(draft.selection?.selectedOutcome).toBe("pessimistic");
    expect(draft.status).toBe("APPLIED");
  });

  it("Scenario 2: Manual neutral selection", async () => {
    const { engine } = makeEngine();
    const studio = makeStudio(engine);
    const session = await engine.createSession("V2-Neut");
    const draftId = await pipelineToSelected(studio, session.id, "neutral");
    await studio.approveDraft(draftId, { reason: "Manual neutral" }, GM);
    expect(studio.getDraft(draftId).selection?.selectedOutcome).toBe("neutral");
  });

  it("Scenario 3: Manual optimistic selection", async () => {
    const { engine } = makeEngine();
    const studio = makeStudio(engine);
    const session = await engine.createSession("V2-Opt");
    const draftId = await pipelineToSelected(studio, session.id, "optimistic");
    await studio.approveDraft(draftId, { reason: "Manual optimistic" }, GM);
    expect(studio.getDraft(draftId).selection?.selectedOutcome).toBe("optimistic");
  });

  it("Scenario 4: Equal random selection", async () => {
    const { engine } = makeEngine();
    const studio = makeStudio(engine);
    const session = await engine.createSession("V2-EqRand");
    const draft = await studio.createDraft(session.id, BASE_INPUT, GM);
    await studio.generateDraft(draft.draftId, GM);
    const { selection } = studio.selectOutcome(
      draft.draftId,
      { mode: "EQUAL_RANDOM", randomSeed: "equal-seed-42" },
      GM
    );
    expect(["pessimistic", "neutral", "optimistic"]).toContain(selection.selectedOutcome);
    expect(selection.mode).toBe("EQUAL_RANDOM");
  });

  it("Scenario 5: Weighted random selection", async () => {
    const { engine } = makeEngine();
    const studio = makeStudio(engine);
    const session = await engine.createSession("V2-WtRand");
    const draft = await studio.createDraft(session.id, BASE_INPUT, GM);
    await studio.generateDraft(draft.draftId, GM);
    const { selection } = studio.selectOutcome(
      draft.draftId,
      {
        mode: "WEIGHTED_RANDOM",
        weights: { pessimistic: 10, neutral: 80, optimistic: 10 },
        randomSeed: "weighted-seed-99",
      },
      GM
    );
    expect(selection.mode).toBe("WEIGHTED_RANDOM");
    expect(selection.weights?.neutral).toBe(80);
  });

  it("Scenario 6: Random seed reproducibility", () => {
    const seed = "repro-seed-v2";
    const a = selectScenarioOutcome("EQUAL_RANDOM", seed);
    const b = selectScenarioOutcome("EQUAL_RANDOM", seed);
    expect(a).toBe(b);
  });

  it("Scenario 7: Immediate news publish", async () => {
    const { engine } = makeEngine();
    const studio = makeStudio(engine);
    const session = await engine.createSession("V2-ImmNews");
    const draftId = await pipelineToSelected(studio, session.id, "neutral");
    const result = await studio.approveDraft(draftId, { reason: "Immediate" }, GM);
    const gmNews = studio.listSessionNews(session.id);
    expect(gmNews.length).toBe(1);
    expect(gmNews[0].newsId).toBe(result.newsId);
    expect(gmNews[0].publishedAt).toBeTruthy();
    expect(gmNews[0].instructorSummary).toBeTruthy();

    const learnerNews = studio.listSessionNews(session.id, "ceo-company-1");
    expect(learnerNews[0].instructorSummary).toBeUndefined();
    expect(learnerNews[0].summary).not.toMatch(/본 시나리오는/);
  });

  it("Scenario 8: Next step scheduled publish", async () => {
    const { engine } = makeEngine();
    const studio = makeStudio(engine);
    const session = await engine.createSession("V2-NextStep");
    await engine.createCompany("T1", session.id);
    const draft = await studio.createDraft(session.id, BASE_INPUT, GM);
    await studio.generateDraft(draft.draftId, GM);
    studio.selectOutcome(draft.draftId, { mode: "MANUAL", selectedOutcome: "neutral" }, GM);
    studio.scheduleDraft(
      draft.draftId,
      { applyTiming: "NEXT_STEP", displayMode: "DIRECTIONAL", reason: "Next step" },
      GM
    );
    const result = await studio.approveDraft(draft.draftId, { reason: "Schedule next step" }, GM);
    expect(result.status).toBe("SCHEDULED");
    expect(studio.listSessionNews(session.id).length).toBe(0);

    await engine.gmAdvanceStep(session.id, GM);
    const news = studio.listSessionNews(session.id);
    expect(news.length).toBe(1);
    expect(studio.getDraft(draft.draftId).status).toBe("APPLIED");
  });

  it("Scenario 9: Next half scheduled publish", async () => {
    const { engine } = makeEngine();
    const studio = makeStudio(engine);
    const session = await engine.createSession("V2-NextHalf");
    await engine.createCompany("T1", session.id);
    const draft = await studio.createDraft(session.id, BASE_INPUT, GM);
    await studio.generateDraft(draft.draftId, GM);
    studio.selectOutcome(draft.draftId, { mode: "MANUAL", selectedOutcome: "neutral" }, GM);
    studio.scheduleDraft(
      draft.draftId,
      { applyTiming: "NEXT_HALF", displayMode: "DIRECTIONAL", reason: "Next half" },
      GM
    );
    await studio.approveDraft(draft.draftId, { reason: "Schedule next half" }, GM);

    for (let i = 0; i < 6; i++) await engine.gmAdvanceStep(session.id, GM);
    await engine.closePeriod(session.id, {}, GM);
    await engine.startNextHalf(session.id, GM);

    expect(studio.listSessionNews(session.id).length).toBe(1);
  });

  it("Scenario 10: WebSocket news.published to CEOs", async () => {
    const { engine } = makeEngine();
    const studio = makeStudio(engine);
    const session = await engine.createSession("V2-WS");
    const { company } = await engine.createCompany("CEO-WS", session.id);
    const token = issueToken({
      userId: company.id,
      role: "CEO",
      sessionId: session.id,
      companyId: company.id,
      teamName: company.teamName,
    });
    const { ws, events } = await connectClient(port, token);

    const draftId = await pipelineToSelected(studio, session.id, "neutral");
    await studio.approveDraft(draftId, { reason: "WS test" }, GM);

    const evt = await waitForEvent(events, REALTIME_EVENT_TYPES.NEWS_PUBLISHED);
    expect(evt.payload.headline).toBeTruthy();
    ws.close();
  });

  it("Scenario 11: News and economy patch applied atomically", async () => {
    const { engine } = makeEngine();
    const studio = makeStudio(engine);
    const session = await engine.createSession("V2-Atomic");
    const before = (await engine.getGmDesk(session.id)).economy.marketDemandIndex;
    const draftId = await pipelineToSelected(studio, session.id, "pessimistic");
    await studio.approveDraft(draftId, { reason: "Atomic" }, GM);
    const after = (await engine.getGmDesk(session.id)).economy.marketDemandIndex;
    const news = studio.listSessionNews(session.id);
    expect(news.length).toBe(1);
    expect(after).not.toBe(before);
    expect(studio.getDraft(draftId).patchSequence).toBeDefined();
  });

  it("Scenario 12: AI values bounds clamp preview", async () => {
    const { engine } = makeEngine();
    const studio = makeStudio(engine);
    const session = await engine.createSession("V2-Bounds");
    const draft = await studio.createDraft(session.id, BASE_INPUT, GM);
    const generated = await studio.generateDraft(draft.draftId, GM);
    expect(generated.validation.schemaValid).toBe(true);
    expect(Array.isArray(generated.validation.boundsWarnings)).toBe(true);
  });

  it("Scenario 13: No apply before GM approve", async () => {
    const { engine } = makeEngine();
    const studio = makeStudio(engine);
    const session = await engine.createSession("V2-NoApply");
    const before = (await engine.getGmDesk(session.id)).economy;
    const draft = await studio.createDraft(session.id, BASE_INPUT, GM);
    await studio.generateDraft(draft.draftId, GM);
    studio.selectOutcome(draft.draftId, { mode: "MANUAL", selectedOutcome: "neutral" }, GM);
    const after = (await engine.getGmDesk(session.id)).economy;
    expect(after).toEqual(before);
    expect(studio.listSessionNews(session.id).length).toBe(0);
  });

  it("Scenario 14: Duplicate approve idempotency", async () => {
    const { engine } = makeEngine();
    const studio = makeStudio(engine);
    const session = await engine.createSession("V2-Idem");
    const draftId = await pipelineToSelected(studio, session.id, "neutral");
    const key = "idem-key-001";
    const first = await studio.approveDraft(draftId, { reason: "First", idempotencyKey: key }, GM);
    const second = await studio.approveDraft(draftId, { reason: "Second", idempotencyKey: key }, GM);
    expect(second.simulationEventId).toBe(first.simulationEventId);
    expect(studio.listSessionNews(session.id).length).toBe(1);
  });

  it("Scenario 15: Server restart preserves scheduled drafts", () => {
    const store1 = new DraftStore({ persist: false });
    const draft = {
      draftId: "persist-draft-1",
      sessionId: "sess-persist",
      status: "SCHEDULED" as const,
      input: BASE_INPUT,
      idempotencyResults: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: "gm",
    };
    store1.saveDraft(draft);
    const snap = store1.getSnapshot();

    const store2 = new DraftStore({ persist: false, initial: snap });
    expect(store2.getDraft("persist-draft-1")?.status).toBe("SCHEDULED");
    expect(store2.getSnapshot().drafts.length).toBe(1);
  });

  it("Scenario 16: Settlement blocks immediate approve", async () => {
    const { engine } = makeEngine();
    const studio = makeStudio(engine);
    const session = await engine.createSession("V2-Settle");
    await engine.createCompany("T1", session.id);
    for (let i = 0; i < 6; i++) await engine.gmAdvanceStep(session.id, GM);
    await engine.closePeriod(session.id, {}, GM);

    const draftId = await pipelineToSelected(studio, session.id, "neutral");
    await expect(studio.approveDraft(draftId, { reason: "During settlement" }, GM)).rejects.toMatchObject({
      code: "ERR_STUDIO_SETTLEMENT",
    });
  });

  it("Scenario 17: Event end reverses patch", async () => {
    const { engine } = makeEngine();
    const studio = makeStudio(engine);
    const session = await engine.createSession("V2-End");
    const before = (await engine.getGmDesk(session.id)).economy.marketDemandIndex;
    const draftId = await pipelineToSelected(studio, session.id, "neutral");
    const approved = await studio.approveDraft(draftId, { reason: "End test" }, GM);
    expect((await engine.getGmDesk(session.id)).economy.marketDemandIndex).not.toBe(before);
    await engine.endEvent(session.id, approved.simulationEventId, GM);
    expect((await engine.getGmDesk(session.id)).economy.marketDemandIndex).toBe(before);
  });

  it("Scenario 18: Event history through pipeline", async () => {
    const { engine } = makeEngine();
    const studio = makeStudio(engine);
    const session = await engine.createSession("V2-Hist");
    for (const scenario of ["pessimistic", "neutral", "optimistic"] as ScenarioKey[]) {
      const draftId = await pipelineToSelected(studio, session.id, scenario);
      await studio.approveDraft(draftId, { reason: `History ${scenario}`, idempotencyKey: scenario }, GM);
    }
    const history = await engine.getEventHistory(session.id);
    expect(history.filter((h) => h.templateId.startsWith("AI-")).length).toBeGreaterThanOrEqual(3);
  });

  it("Scenario 19: Audit on approve path", async () => {
    const { engine, repos } = makeEngine();
    const studio = makeStudio(engine);
    const session = await engine.createSession("V2-Audit");
    const draftId = await pipelineToSelected(studio, session.id, "neutral");
    await studio.approveDraft(draftId, { reason: "Audit test" }, GM);
    const logs = await repos.audit.listBySession(session.id);
    expect(logs.some((l) => l.action === "EVENT_AI_APPROVED")).toBe(true);
    expect(logs.some((l) => l.action === "EVENT_FIRED")).toBe(true);
  });

  it("Scenario 20: OpenAI failure uses fixture without game impact", async () => {
    const { engine } = makeEngine();
    const studio = makeStudio(engine);
    const session = await engine.createSession("V2-Fixture");
    const economyBefore = { ...(await engine.getGmDesk(session.id)).economy };

    const draft = await studio.createDraft(session.id, BASE_INPUT, GM);
    const generated = await studio.generateDraft(draft.draftId, GM);
    expect(generated.meta.usedFixture).toBe(true);
    expect(generated.draft.studioOutput?.meta.title).toBeTruthy();

    const economyAfter = (await engine.getGmDesk(session.id)).economy;
    expect(economyAfter).toEqual(economyBefore);
    expect(economyAfter.marketDemandIndex).toBe(DEFAULT_ECONOMY_VALUES.marketDemandIndex);
  });
});
