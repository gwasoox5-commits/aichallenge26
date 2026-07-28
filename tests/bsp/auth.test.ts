import { describe, expect, it, beforeEach } from "vitest";
import { resetMemoryState, createMemoryRepositories } from "@/src/bsp/infrastructure/memory/memory-repositories";
import { GameEngine } from "@/src/bsp/application/game-engine";
import { stepHandlerRegistry } from "@/src/bsp/domain/steps/step-handler-registry";
import { AccountingEngine } from "@/src/bsp/domain/accounting/accounting-engine";
import { DashboardService } from "@/src/bsp/application/dashboard-service";
import { EventStoreService } from "@/src/bsp/application/event-store-service";
import { AuthService } from "@/src/bsp/infrastructure/auth/auth-service";
import { issueToken, verifyToken } from "@/src/bsp/infrastructure/auth/token-service";
import { generateJoinCode, isValidJoinCodeFormat } from "@/src/bsp/infrastructure/auth/join-code";
import { assertCompanyAccess, assertSessionAccess } from "@/src/bsp/infrastructure/auth/access-control";
import { AuthError } from "@/src/bsp/domain/auth/types";
import { DEFAULT_ADMIN_PASSWORD, DEMO_JOIN_CODE } from "@/src/bsp/domain/auth/demo-constants";

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

describe("Auth — join code", () => {
  it("generates 5-character join codes", () => {
    const code = generateJoinCode();
    expect(code).toHaveLength(5);
    expect(isValidJoinCodeFormat(code)).toBe(true);
  });

  it("rejects invalid join codes", () => {
    expect(isValidJoinCodeFormat("ABC123")).toBe(false);
    expect(isValidJoinCodeFormat("AB")).toBe(false);
  });
});

describe("Auth — session tokens", () => {
  it("issues and verifies CEO token", () => {
    const token = issueToken({
      userId: "u1",
      role: "CEO",
      sessionId: "s1",
      companyId: "c1",
      teamName: "Alpha",
    });
    const ctx = verifyToken(token);
    expect(ctx.role).toBe("CEO");
    expect(ctx.companyId).toBe("c1");
  });

  it("rejects tampered token", () => {
    const token = issueToken({ userId: "u1", role: "GM", sessionId: "s1" });
    expect(() => verifyToken(token + "x")).toThrow();
  });
});

describe("Auth — role & scope (NFR-S01/S02)", () => {
  beforeEach(() => resetMemoryState());

  it("CEO cannot access another company", async () => {
    const engine = makeEngine();
    const session = await engine.createSession("Auth-Test");
    const { company: a } = await engine.createCompany("A", session.id);
    const { company: b } = await engine.createCompany("B", session.id);
    const ceoCtx = {
      userId: a.id,
      role: "CEO" as const,
      sessionId: session.id,
      companyId: a.id,
    };
    await expect(assertCompanyAccess(ceoCtx, engine, b.id)).rejects.toMatchObject({
      code: "ERR_FORBIDDEN_COMPANY",
    });
  });

  it("GM token is session-scoped", () => {
    const gmCtx = { userId: "g1", role: "GM" as const, sessionId: "session-a" };
    expect(() => assertSessionAccess(gmCtx, "session-b")).toThrow(AuthError);
    assertSessionAccess(gmCtx, "session-a");
  });

  it("admin login and CEO join flow", async () => {
    const engine = makeEngine();
    const auth = new AuthService(engine);
    const admin = auth.loginPlatformAdmin(DEFAULT_ADMIN_PASSWORD);
    expect(admin.role).toBe("PLATFORM_ADMIN");

    await engine.ensureDemoSession();
    const ceo = await auth.joinAsCeo(DEMO_JOIN_CODE, "Team-Auth");
    expect(ceo.role).toBe("CEO");
    expect(ceo.companyId).toBeDefined();
  });

  it("rejects invalid admin password", () => {
    const auth = new AuthService(makeEngine());
    expect(() => auth.loginPlatformAdmin("wrong")).toThrow(AuthError);
  });
});

describe("Auth — join code entropy", () => {
  it("generates mostly unique codes", () => {
    const codes = new Set(Array.from({ length: 50 }, () => generateJoinCode()));
    expect(codes.size).toBe(50);
  });
});
