/**
 * App health aggregator — unit tests
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { getAppHealth, healthHttpStatus } from "@/lib/bsp/app-health-service";

vi.mock("@/src/bsp/infrastructure/prisma/client", () => ({
  bspPrisma: {
    $queryRaw: vi.fn().mockResolvedValue([{ "?column?": 1 }]),
  },
}));

vi.mock("@/src/bsp/infrastructure/realtime/realtime-hub", () => ({
  getRealtimeHub: vi.fn(),
}));

vi.mock("@/lib/integrations/health-service", () => ({
  getIntegrationHealth: vi.fn().mockResolvedValue({
    checkedAt: new Date().toISOString(),
    openai: { name: "openai", configured: false, enabled: false, mode: "NOT_CONFIGURED", recentFailures: 0 },
    news: { name: "fixture", configured: true, enabled: false, mode: "FIXTURE", recentFailures: 0 },
    externalData: { name: "frankfurter", configured: true, enabled: true, mode: "LIVE", recentFailures: 0 },
  }),
}));

import { getRealtimeHub } from "@/src/bsp/infrastructure/realtime/realtime-hub";

describe("app health", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.mocked(getRealtimeHub).mockReturnValue({
      getStats: () => ({ sessions: 0, connections: 0, eventsSent: 0 }),
    } as ReturnType<typeof getRealtimeHub>);
  });

  it("returns component statuses without live checks", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("BSP_DATABASE_URL", "postgresql://test:test@localhost:5432/test");

    const health = await getAppHealth(false);
    expect(health.application.status).toBe("READY");
    expect(health.database.status).toBe("READY");
    expect(health.websocket.status).toBe("READY");
    expect(health.openai.status).toBe("NOT_CONFIGURED");
    expect(health.news.status).toBe("DEGRADED");
    expect(["READY", "DEGRADED"]).toContain(health.status);
  });

  it("maps FAILED to HTTP 503", () => {
    expect(healthHttpStatus("FAILED")).toBe(503);
    expect(healthHttpStatus("READY")).toBe(200);
    expect(healthHttpStatus("DEGRADED")).toBe(200);
  });

  it("reports websocket NOT_CONFIGURED when hub missing", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.mocked(getRealtimeHub).mockReturnValue(undefined);

    const health = await getAppHealth(false);
    expect(health.websocket.status).toBe("NOT_CONFIGURED");
  });
});
