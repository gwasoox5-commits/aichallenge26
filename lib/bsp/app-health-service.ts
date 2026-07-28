import { getStorageConfig } from "@/src/bsp/application/di/container";
import { bspPrisma } from "@/src/bsp/infrastructure/prisma/client";
import { getRealtimeHub } from "@/src/bsp/infrastructure/realtime/realtime-hub";
import { getIntegrationHealth } from "@/lib/integrations/health-service";
import { isProductionRuntime } from "@/lib/bsp/runtime-config";
import type { ProviderHealthSnapshot } from "@/lib/integrations/types";

export type HealthState = "READY" | "DEGRADED" | "NOT_CONFIGURED" | "FAILED";

export interface ComponentHealth {
  status: HealthState;
  message?: string;
  details?: Record<string, unknown>;
}

export interface AppHealthResponse {
  status: HealthState;
  checkedAt: string;
  application: ComponentHealth;
  database: ComponentHealth;
  websocket: ComponentHealth;
  openai: ComponentHealth;
  news: ComponentHealth;
}

function mapIntegrationMode(mode: ProviderHealthSnapshot["mode"]): HealthState {
  switch (mode) {
    case "LIVE":
      return "READY";
    case "FIXTURE":
    case "FALLBACK":
    case "MOCK":
      return "DEGRADED";
    case "NOT_CONFIGURED":
    case "DISABLED":
      return "NOT_CONFIGURED";
    case "ERROR":
      return "FAILED";
    default:
      return "NOT_CONFIGURED";
  }
}

function integrationComponent(
  snapshot: ProviderHealthSnapshot,
  label: string
): ComponentHealth {
  const status = mapIntegrationMode(snapshot.mode);
  return {
    status,
    message: `${label} mode: ${snapshot.mode}`,
    details: {
      configured: snapshot.configured,
      enabled: snapshot.enabled,
      mode: snapshot.mode,
      lastErrorCode: snapshot.lastErrorCode,
    },
  };
}

async function checkDatabase(): Promise<ComponentHealth> {
  const storage = getStorageConfig();

  if (isProductionRuntime()) {
    if (!storage.databaseUrlConfigured) {
      return { status: "FAILED", message: "BSP_DATABASE_URL is required in production." };
    }
    try {
      await bspPrisma.$queryRaw`SELECT 1`;
      return { status: "READY", message: "PostgreSQL connected.", details: { mode: storage.mode } };
    } catch (e) {
      return {
        status: "FAILED",
        message: e instanceof Error ? e.message : "Database query failed.",
        details: { mode: storage.mode },
      };
    }
  }

  if (storage.mode === "memory") {
    return {
      status: "DEGRADED",
      message: "In-memory storage (development/demo).",
      details: { mode: storage.mode, memoryDemoOnly: storage.memoryDemoOnly },
    };
  }

  try {
    await bspPrisma.$queryRaw`SELECT 1`;
    return { status: "READY", message: "PostgreSQL connected.", details: { mode: storage.mode } };
  } catch (e) {
    return {
      status: "FAILED",
      message: e instanceof Error ? e.message : "Database query failed.",
      details: { mode: storage.mode },
    };
  }
}

function checkWebSocket(): ComponentHealth {
  const hub = getRealtimeHub();
  if (!hub) {
    return {
      status: isProductionRuntime() ? "FAILED" : "NOT_CONFIGURED",
      message: "Realtime hub not initialized. Run via tsx server.ts (not plain next start).",
    };
  }
  const stats = hub.getStats();
  return {
    status: "READY",
    message: "WebSocket hub active.",
    details: { ...stats },
  };
}

function checkApplication(): ComponentHealth {
  try {
    const storage = getStorageConfig();
    return {
      status: "READY",
      message: "Application runtime OK.",
      details: {
        nodeEnv: process.env.NODE_ENV ?? "development",
        storageMode: storage.mode,
      },
    };
  } catch (e) {
    return {
      status: "FAILED",
      message: e instanceof Error ? e.message : "Application configuration invalid.",
    };
  }
}

function aggregateOverall(components: ComponentHealth[]): HealthState {
  const statuses = components.map((c) => c.status);
  if (statuses.includes("FAILED")) return "FAILED";
  if (statuses.includes("DEGRADED")) return "DEGRADED";
  if (statuses.every((s) => s === "NOT_CONFIGURED")) return "NOT_CONFIGURED";
  if (statuses.includes("NOT_CONFIGURED")) return "DEGRADED";
  return "READY";
}

export async function getAppHealth(runLiveChecks = false): Promise<AppHealthResponse> {
  const application = checkApplication();
  const database = await checkDatabase();
  const websocket = checkWebSocket();

  const integrations = await getIntegrationHealth(runLiveChecks);
  const openai = integrationComponent(integrations.openai, "OpenAI");
  const news = integrationComponent(integrations.news, "News");

  const critical = [application, database, websocket];
  const status = aggregateOverall([...critical, openai, news]);

  return {
    status,
    checkedAt: new Date().toISOString(),
    application,
    database,
    websocket,
    openai,
    news,
  };
}

export function healthHttpStatus(status: HealthState): number {
  if (status === "FAILED") return 503;
  return 200;
}
