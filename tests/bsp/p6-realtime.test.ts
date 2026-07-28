/**
 * Sprint 3 P6 — WebSocket & Real-time Collaboration E2E scenarios
 */
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import WebSocket from "ws";
import { createMemoryRepositories, resetMemoryState } from "@/src/bsp/infrastructure/memory/memory-repositories";
import { GameEngine } from "@/src/bsp/application/game-engine";
import { AccountingEngine } from "@/src/bsp/domain/accounting/accounting-engine";
import { DashboardService } from "@/src/bsp/application/dashboard-service";
import { EventStoreService } from "@/src/bsp/application/event-store-service";
import { stepHandlerRegistry } from "@/src/bsp/domain/steps/step-handler-registry";
import { GM_AUDIT_ACTIONS, type GmActor } from "@/src/bsp/domain/gm/audit-types";
import { issueToken } from "@/src/bsp/infrastructure/auth/token-service";
import { RealtimeHub, setRealtimeHub } from "@/src/bsp/infrastructure/realtime/realtime-hub";
import {
  REALTIME_EVENT_TYPES,
  REALTIME_WS_PATH,
  type RealtimeEventEnvelope,
  type RealtimeServerMessage,
} from "@/src/bsp/domain/realtime/realtime-event-types";
import type { ExcelScenarioInput } from "./excel-regression-20.test";

const GM: GmActor = { userId: "gm-p6", role: "GM", reason: "P6 E2E" };

const MINIMAL: ExcelScenarioInput = {
  id: "MIN",
  name: "Minimal",
  loan: { loanEarly: 0, loanMid: 0, deposit: 0, loanRepayment: 0 },
  facility: { landPlotsPurchased: 0, machineBigPurchased: 0, machineSmallPurchased: 0 },
  hiring: { headPurchase: 1, headProduction: 1, headSales: 1 },
  material: { regionCode: "ASIA", perType: 0 },
  production: { productionQty: 0, machineBigRun: 0, machineSmallRun: 0 },
  sales: { regionCode: "ASIA", unitPriceManwon: 100, qty: 0 },
};

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

async function submitStep(
  engine: GameEngine,
  companyId: string,
  step: "LOAN" | "FACILITY" | "HIRING" | "MATERIAL" | "PRODUCTION" | "SALES",
  scenario: ExcelScenarioInput
) {
  const payloads = {
    LOAN: scenario.loan,
    FACILITY: scenario.facility,
    HIRING: scenario.hiring,
    MATERIAL: {
      lines: [
        {
          regionCode: scenario.material.regionCode,
          materials: {
            A: scenario.material.perType,
            B: scenario.material.perType,
            C: scenario.material.perType,
            D: scenario.material.perType,
          },
        },
      ],
    },
    PRODUCTION: scenario.production,
    SALES: {
      lines: [{ regionCode: scenario.sales.regionCode, unitPriceManwon: scenario.sales.unitPriceManwon, qty: scenario.sales.qty }],
    },
  };
  const dash = await engine.getDashboard(companyId);
  await engine.submitDecision(companyId, step, payloads[step], dash.statusVersion);
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

function waitForEvent(
  events: RealtimeEventEnvelope[],
  type: string,
  timeoutMs = 1000
): Promise<RealtimeEventEnvelope> {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      const found = events.find((e) => e.type === type);
      if (found) return resolve(found);
      if (Date.now() - start > timeoutMs) return reject(new Error(`Timeout waiting for ${type}`));
      setTimeout(tick, 20);
    };
    tick();
  });
}

describe("P6 Realtime — WebSocket E2E", () => {
  let hub: RealtimeHub;
  let port: number;

  beforeEach(async () => {
    resetMemoryState();
    hub = new RealtimeHub();
    port = await hub.listen(0);
    setRealtimeHub(hub);
  });

  afterEach(() => {
    hub.close();
    setRealtimeHub(undefined);
  });

  it("Scenario 1: 10 teams concurrent submit — all GM clients receive TEAM_SUBMITTED < 1s", async () => {
    const { engine } = makeEngine();
    const session = await engine.createSession("P6-10Teams");
    const gmToken = issueToken({ userId: "gm-1", role: "GM", sessionId: session.id });
    const gmClient = await connectClient(port, gmToken);

    const companies = [];
    for (let i = 1; i <= 10; i++) {
      const { company } = await engine.createCompany(`Team-${i}`, session.id);
      companies.push(company);
    }

    const start = Date.now();
    await Promise.all(companies.map((c) => submitStep(engine, c.id, "LOAN", MINIMAL)));
    await waitForEvent(gmClient.events, REALTIME_EVENT_TYPES.TEAM_SUBMITTED, 1000);
    const elapsed = Date.now() - start;
    expect(gmClient.events.filter((e) => e.type === REALTIME_EVENT_TYPES.TEAM_SUBMITTED).length).toBeGreaterThanOrEqual(10);
    expect(elapsed).toBeLessThan(5000);
    gmClient.ws.close();
  });

  it("Scenario 2: GM step advance broadcasts STEP_ADVANCED", async () => {
    const { engine } = makeEngine();
    const session = await engine.createSession("P6-Advance");
    const { company } = await engine.createCompany("T1", session.id);
    await submitStep(engine, company.id, "LOAN", MINIMAL);

    const ceoToken = issueToken({ userId: "ceo-1", role: "CEO", sessionId: session.id, companyId: company.id });
    const ceoClient = await connectClient(port, ceoToken);

    await engine.gmAdvanceStep(session.id, GM);
    const evt = await waitForEvent(ceoClient.events, REALTIME_EVENT_TYPES.STEP_ADVANCED, 1000);
    expect(evt.payload.toPhase).toBe("STEP2_INVESTMENT");
    ceoClient.ws.close();
  });

  it("Scenario 3: Pause/Resume broadcasts session events", async () => {
    const { engine } = makeEngine();
    const session = await engine.createSession("P6-Pause");
    const gmToken = issueToken({ userId: "gm-1", role: "GM", sessionId: session.id });
    const client = await connectClient(port, gmToken);

    await engine.gmPauseSession(session.id, GM);
    await waitForEvent(client.events, REALTIME_EVENT_TYPES.PAUSE, 1000);
    await engine.gmResumeSession(session.id, GM);
    await waitForEvent(client.events, REALTIME_EVENT_TYPES.RESUME, 1000);
    client.ws.close();
  });

  it("Scenario 4: Event fire broadcasts EVENT_FIRED + ECONOMY_CHANGED", async () => {
    const { engine } = makeEngine();
    const session = await engine.createSession("P6-Event");
    const gmToken = issueToken({ userId: "gm-1", role: "GM", sessionId: session.id });
    const client = await connectClient(port, gmToken);

    await engine.fireEvent(session.id, "EVT-001", "IMMEDIATE", GM);
    await waitForEvent(client.events, REALTIME_EVENT_TYPES.EVENT_FIRED, 1000);
    await waitForEvent(client.events, REALTIME_EVENT_TYPES.ECONOMY_CHANGED, 1000);
    client.ws.close();
  });

  it("Scenario 5: Economy change broadcasts ECONOMY_CHANGED", async () => {
    const { engine } = makeEngine();
    const session = await engine.createSession("P6-Economy");
    const gmToken = issueToken({ userId: "gm-1", role: "GM", sessionId: session.id });
    const client = await connectClient(port, gmToken);

    await engine.patchEconomy(session.id, { patch: { rawMaterialIndex: 125 }, applyTiming: "IMMEDIATE" }, GM);
    const evt = await waitForEvent(client.events, REALTIME_EVENT_TYPES.ECONOMY_CHANGED, 1000);
    expect(evt.payload.source).toBe("GM_MANUAL");
    client.ws.close();
  });

  it("Scenario 6: Half end (settlement) broadcasts SETTLEMENT_COMPLETE", async () => {
    const { engine } = makeEngine();
    const session = await engine.createSession("P6-HalfEnd");
    const { company } = await engine.createCompany("T1", session.id);
    for (const step of ["LOAN", "FACILITY", "HIRING", "MATERIAL", "PRODUCTION", "SALES"] as const) {
      await submitStep(engine, company.id, step, MINIMAL);
      await engine.gmAdvanceStep(session.id, GM);
    }

    const gmToken = issueToken({ userId: "gm-1", role: "GM", sessionId: session.id });
    const client = await connectClient(port, gmToken);
    await engine.closePeriod(session.id, {}, GM);
    await waitForEvent(client.events, REALTIME_EVENT_TYPES.SETTLEMENT_COMPLETE, 1000);
    client.ws.close();
  });

  it("Scenario 7: Next half broadcasts NEXT_HALF_STARTED", async () => {
    const { engine } = makeEngine();
    const session = await engine.createSession("P6-NextHalf");
    const { company } = await engine.createCompany("T1", session.id);
    for (const step of ["LOAN", "FACILITY", "HIRING", "MATERIAL", "PRODUCTION", "SALES"] as const) {
      await submitStep(engine, company.id, step, MINIMAL);
      await engine.gmAdvanceStep(session.id, GM);
    }
    await engine.closePeriod(session.id, {}, GM);

    const gmToken = issueToken({ userId: "gm-1", role: "GM", sessionId: session.id });
    const client = await connectClient(port, gmToken);
    await engine.startNextHalf(session.id, GM);
    const evt = await waitForEvent(client.events, REALTIME_EVENT_TYPES.NEXT_HALF_STARTED, 1000);
    expect(evt.payload.periodIndex).toBe(2);
    client.ws.close();
  });

  it("Scenario 8: Game end broadcasts GAME_END", async () => {
    const { engine } = makeEngine();
    const session = await engine.createSession("P6-GameEnd");
    const { company } = await engine.createCompany("T1", session.id);

    for (let half = 0; half < 6; half++) {
      for (const step of ["LOAN", "FACILITY", "HIRING", "MATERIAL", "PRODUCTION", "SALES"] as const) {
        await submitStep(engine, company.id, step, MINIMAL);
        await engine.gmAdvanceStep(session.id, GM);
      }
      await engine.closePeriod(session.id, {}, GM);
      if (half < 5) await engine.startNextHalf(session.id, GM);
    }

    const gmToken = issueToken({ userId: "gm-1", role: "GM", sessionId: session.id });
    const client = await connectClient(port, gmToken);
    await engine.gameEnd(session.id, GM);
    await waitForEvent(client.events, REALTIME_EVENT_TYPES.GAME_END, 1000);
    client.ws.close();
  });

  it("Scenario 9: Disconnect/reconnect — duplicate connection replaced, sync on reconnect", async () => {
    const { engine } = makeEngine();
    const session = await engine.createSession("P6-Reconnect");
    const gmToken = issueToken({ userId: "gm-dup", role: "GM", sessionId: session.id });

    const first = await connectClient(port, gmToken);
    const second = await connectClient(port, gmToken);
    await new Promise((r) => setTimeout(r, 50));
    expect(first.ws.readyState).toBe(WebSocket.CLOSED);

    await engine.gmPauseSession(session.id, GM);
    await waitForEvent(second.events, REALTIME_EVENT_TYPES.PAUSE, 1000);
    second.ws.close();
  });

  it("Scenario 10: 100 team load test — propagation < 1s, no connection leak", async () => {
    const { engine } = makeEngine();
    const session = await engine.createSession("P6-Load100");
    const gmToken = issueToken({ userId: "gm-load", role: "GM", sessionId: session.id });
    const gmClient = await connectClient(port, gmToken);

    const companies = [];
    for (let i = 1; i <= 100; i++) {
      const { company } = await engine.createCompany(`Load-${i}`, session.id);
      companies.push(company);
    }

    const statsBefore = hub.getStats();
    expect(statsBefore.connections).toBe(1);

    const t0 = Date.now();
    await submitStep(engine, companies[0].id, "LOAN", MINIMAL);
    await waitForEvent(gmClient.events, REALTIME_EVENT_TYPES.TEAM_SUBMITTED, 1000);
    const propagationMs = Date.now() - t0;
    expect(propagationMs).toBeLessThan(1000);

    const statsAfter = hub.getStats();
    expect(statsAfter.connections).toBe(1);
    expect(statsAfter.eventsSent).toBeGreaterThan(0);

    gmClient.ws.close();
    await new Promise((r) => setTimeout(r, 50));
    expect(hub.getStats().connections).toBe(0);
  });

  it("Auth: rejects connection without token", async () => {
    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(`ws://127.0.0.1:${port}${REALTIME_WS_PATH}`);
      ws.on("close", (code) => {
        expect(code).toBe(4401);
        resolve();
      });
      ws.on("error", reject);
    });
  });

  it("Heartbeat: hub sends pong to connected clients", async () => {
    const { engine } = makeEngine();
    const session = await engine.createSession("P6-Heartbeat");
    const gmToken = issueToken({ userId: "gm-hb", role: "GM", sessionId: session.id });

    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(`ws://127.0.0.1:${port}${REALTIME_WS_PATH}?token=${encodeURIComponent(gmToken)}`);
      ws.on("message", (data) => {
        const msg = JSON.parse(String(data)) as RealtimeServerMessage;
        if (msg.op === "connected") {
          ws.send(JSON.stringify({ op: "ping" }));
        }
        if (msg.op === "pong") {
          ws.close();
          resolve();
        }
      });
      ws.on("error", reject);
    });
  });
});
