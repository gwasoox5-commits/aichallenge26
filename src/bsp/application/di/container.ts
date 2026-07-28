import { AccountingEngine } from "../../domain/accounting/accounting-engine";
import { stepHandlerRegistry } from "../../domain/steps/step-handler-registry";
import { GameEngine } from "../game-engine";
import { DashboardService } from "../dashboard-service";
import { EventStoreService } from "../event-store-service";
import type { BspRepositories } from "../ports/repositories";
import { createMemoryRepositories } from "../../infrastructure/memory/memory-repositories";
import { createPrismaRepositories } from "../../infrastructure/prisma/prisma-repositories";

export type StorageMode = "memory" | "prisma";

export interface BspContainer {
  storage: StorageMode;
  repos: BspRepositories;
  gameEngine: GameEngine;
  dashboardService: DashboardService;
  eventStoreService: EventStoreService;
  accountingEngine: AccountingEngine;
}

function resolveStorageMode(): StorageMode {
  const isProd = process.env.NODE_ENV === "production";

  if (isProd) {
    if (process.env.BSP_USE_MEMORY === "1") {
      throw new Error(
        "BSP_USE_MEMORY=1 is not allowed in production. Set BSP_DATABASE_URL and remove BSP_USE_MEMORY."
      );
    }
    if (!process.env.BSP_DATABASE_URL) {
      throw new Error("BSP_DATABASE_URL is required in production.");
    }
    return "prisma";
  }

  if (process.env.BSP_USE_MEMORY === "1") return "memory";
  if (!process.env.BSP_DATABASE_URL) return "memory";
  return "prisma";
}

export function getStorageConfig() {
  const isProd = process.env.NODE_ENV === "production";
  const mode = resolveStorageMode();
  return {
    mode,
    isProduction: isProd,
    databaseUrlConfigured: Boolean(process.env.BSP_DATABASE_URL),
    memoryDemoOnly: mode === "memory",
  };
}

export function createBspContainer(mode?: StorageMode): BspContainer {
  const storage = mode ?? resolveStorageMode();
  const repos = storage === "memory" ? createMemoryRepositories() : createPrismaRepositories();
  const accountingEngine = new AccountingEngine();
  const dashboardService = new DashboardService();
  const eventStoreService = new EventStoreService(repos.events);
  const gameEngine = new GameEngine(
    repos,
    stepHandlerRegistry,
    accountingEngine,
    dashboardService,
    eventStoreService
  );
  return { storage, repos, gameEngine, dashboardService, eventStoreService, accountingEngine };
}

const globalForContainer = globalThis as unknown as { bspContainer?: BspContainer };

export function getBspContainer(): BspContainer {
  if (!globalForContainer.bspContainer) {
    globalForContainer.bspContainer = createBspContainer();
  }
  return globalForContainer.bspContainer;
}

export function resetBspContainer(mode?: StorageMode) {
  globalForContainer.bspContainer = createBspContainer(mode);
}
