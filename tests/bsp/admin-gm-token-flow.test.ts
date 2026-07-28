/**
 * Admin GM token flow — WebSocket gating & session token attach
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
import { issueToken, verifyToken } from "@/src/bsp/infrastructure/auth/token-service";
import { DEFAULT_ADMIN_PASSWORD } from "@/src/bsp/domain/auth/demo-constants";
import { canConnectRealtime, parseTokenClaims } from "@/lib/bsp/token-client";
import { resolveAdminRealtimeStatus } from "@/lib/bsp/admin-realtime-status";
import WebSocket from "ws";
import { RealtimeHub } from "@/src/bsp/infrastructure/realtime/realtime-hub";
import { REALTIME_WS_PATH } from "@/src/bsp/domain/realtime/realtime-event-types";

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

describe("token-client", () => {
  it("parseTokenClaims reads GM sessionId from token", () => {
    const token = issueToken({ userId: "gm-1", role: "GM", sessionId: "sess-abc" });
    const claims = parseTokenClaims(token);
    expect(claims?.role).toBe("GM");
    expect(claims?.sessionId).toBe("sess-abc");
  });

  it("PLATFORM_ADMIN token has no sessionId", () => {
    const token = issueToken({ userId: "admin-1", role: "PLATFORM_ADMIN" });
    expect(parseTokenClaims(token)?.sessionId).toBeUndefined();
    expect(canConnectRealtime(token, "sess-abc")).toBe(false);
  });

  it("canConnectRealtime true for matching GM token", () => {
    const token = issueToken({ userId: "gm-1", role: "GM", sessionId: "sess-abc" });
    expect(canConnectRealtime(token, "sess-abc")).toBe(true);
    expect(canConnectRealtime(token, "other")).toBe(false);
  });

  it("parseTokenClaims works without Node Buffer base64url (browser path)", () => {
    const token = issueToken({ userId: "gm-1", role: "GM", sessionId: "sess-browser" });
    const body = token.split(".")[0]!;
    const pad = body.length % 4 === 0 ? "" : "=".repeat(4 - (body.length % 4));
    const decoded = atob(body.replace(/-/g, "+").replace(/_/g, "/") + pad);
    const claims = JSON.parse(decoded) as { role: string; sessionId: string };
    expect(claims.role).toBe("GM");
    expect(claims.sessionId).toBe("sess-browser");
    expect(canConnectRealtime(token, "sess-browser")).toBe(true);
  });

  it("canConnectRealtime true for CEO with company", () => {
    const token = issueToken({
      userId: "ceo-1",
      role: "CEO",
      sessionId: "sess-abc",
      companyId: "co-1",
    });
    expect(canConnectRealtime(token, "sess-abc")).toBe(true);
  });
});

describe("admin-realtime-status", () => {
  it("shows platform ready when logged in without session", () => {
    const s = resolveAdminRealtimeStatus({
      authRole: "PLATFORM_ADMIN",
      sessionId: null,
      gmTokenReady: false,
      tokenAttachError: null,
      connectionState: "disconnected",
    });
    expect(s.label).toBe("플랫폼 로그인 완료");
    expect(s.hint).toContain("세션 생성");
  });

  it("shows GM connecting while token attaches", () => {
    const s = resolveAdminRealtimeStatus({
      authRole: "PLATFORM_ADMIN",
      sessionId: "sess-1",
      gmTokenReady: false,
      tokenAttachError: null,
      connectionState: "disconnected",
    });
    expect(s.label).toBe("GM 세션 연결 중");
  });

  it("shows connected when WS open", () => {
    const s = resolveAdminRealtimeStatus({
      authRole: "GM",
      sessionId: "sess-1",
      gmTokenReady: true,
      tokenAttachError: null,
      connectionState: "connected",
    });
    expect(s.label).toBe("실시간 연결됨");
  });
});

describe("GM token attach flow", () => {
  let engine: GameEngine;
  let auth: AuthService;
  let sessionId: string;

  beforeEach(async () => {
    engine = makeEngine();
    auth = new AuthService(engine);
    const session = await engine.createSession("GM-Token-Flow");
    sessionId = session.id;
  });

  it("admin login token cannot pass WebSocket session gate", () => {
    const admin = auth.loginPlatformAdmin(DEFAULT_ADMIN_PASSWORD);
    expect(canConnectRealtime(admin.accessToken, sessionId)).toBe(false);
  });

  it("issueGmToken after session create enables WebSocket gate", () => {
    auth.loginPlatformAdmin(DEFAULT_ADMIN_PASSWORD);
    const gm = auth.issueGmToken(sessionId);
    expect(canConnectRealtime(gm.accessToken, sessionId)).toBe(true);
    const ctx = verifyToken(gm.accessToken);
    expect(ctx.role).toBe("GM");
    expect(ctx.sessionId).toBe(sessionId);
  });

  it("demo session path: GM token matches session", async () => {
    const session = await engine.createSession("Pilot Demo");
    const gm = auth.issueGmToken(session.id);
    expect(parseTokenClaims(gm.accessToken)?.sessionId).toBe(session.id);
    expect(canConnectRealtime(gm.accessToken, session.id)).toBe(true);
  });
});

describe("WebSocket auth — no 4401 for GM token", () => {
  it("GM token connects; PLATFORM_ADMIN token rejected", async () => {
    const hub = new RealtimeHub();
    const port = await hub.listen(0);
    const engine = makeEngine();
    const auth = new AuthService(engine);
    const session = await engine.createSession("WS-Auth");
    const gmToken = auth.issueGmToken(session.id).accessToken;
    const adminToken = auth.loginPlatformAdmin(DEFAULT_ADMIN_PASSWORD).accessToken;

    const gmClose = await new Promise<{ code: number }>((resolve) => {
      const ws = new WebSocket(`ws://127.0.0.1:${port}${REALTIME_WS_PATH}?token=${encodeURIComponent(gmToken)}`);
      ws.on("open", () => ws.close());
      ws.on("close", (code) => resolve({ code }));
    });
    expect(gmClose.code).not.toBe(4401);

    const adminClose = await new Promise<{ code: number }>((resolve) => {
      const ws = new WebSocket(`ws://127.0.0.1:${port}${REALTIME_WS_PATH}?token=${encodeURIComponent(adminToken)}`);
      ws.on("close", (code) => resolve({ code }));
    });
    expect(adminClose.code).toBe(4401);

    hub.close();
  });
});
