/** BSP runtime mode and production safety gates (server-side). */

export type BspRuntimeMode = "development" | "test" | "production";

function envFlag(key: string): boolean {
  const v = process.env[key];
  return v === "1" || v?.toLowerCase() === "true";
}

export function getRuntimeMode(): BspRuntimeMode {
  const env = process.env.NODE_ENV;
  if (env === "production") return "production";
  if (env === "test") return "test";
  return "development";
}

export function isProductionRuntime(): boolean {
  return getRuntimeMode() === "production";
}

/** Explicit demo bootstrap (demo session API, pilot demo button). Default: off. */
export function isDemoModeEnabled(): boolean {
  return envFlag("BSP_DEMO_MODE");
}

/** Allow fixture AI/news responses when external APIs are unavailable. Default: off in production. */
export function isFixtureFallbackAllowed(): boolean {
  if (isProductionRuntime()) return envFlag("BSP_ALLOW_FIXTURE");
  return process.env.BSP_ALLOW_FIXTURE !== "false";
}

/** Auto-create demo session on pilot health check. Dev-only unless BSP_PILOT_BOOTSTRAP=true. */
export function isPilotBootstrapEnabled(): boolean {
  if (isProductionRuntime()) return false;
  return envFlag("BSP_PILOT_BOOTSTRAP");
}

export function assertDemoBootstrapAllowed(): { ok: true } | { ok: false; message: string } {
  if (isProductionRuntime() && !isDemoModeEnabled()) {
    return { ok: false, message: "Demo bootstrap is disabled in production (set BSP_DEMO_MODE=true to enable)." };
  }
  if (!isDemoModeEnabled() && !isPilotBootstrapEnabled()) {
    return { ok: false, message: "Demo bootstrap is disabled (BSP_DEMO_MODE or BSP_PILOT_BOOTSTRAP required)." };
  }
  return { ok: true };
}

const DEV_ADMIN_PASSWORD = "admin10193";

/** Public dev defaults blocked in production even if set via env. */
const BLOCKED_PRODUCTION_ADMIN_PASSWORDS = new Set([
  "bsp-admin-dev",
  "admin",
  "password",
  "admin123",
]);

export function getAdminPasswordOrThrow(): string {
  const password = process.env.BSP_ADMIN_PASSWORD;
  if (isProductionRuntime()) {
    if (!password || password.length < 8) {
      throw new Error("BSP_ADMIN_PASSWORD must be set in production (≥8 chars).");
    }
    if (BLOCKED_PRODUCTION_ADMIN_PASSWORDS.has(password)) {
      throw new Error("BSP_ADMIN_PASSWORD must not use a known default password in production.");
    }
    return password;
  }
  return password ?? DEV_ADMIN_PASSWORD;
}

export function getIntegrationResultStatus(opts: {
  live: boolean;
  fixture: boolean;
  error?: boolean;
}): "LIVE" | "FIXTURE" | "FALLBACK" | "ERROR" | "NOT_CONFIGURED" {
  if (opts.error) return "ERROR";
  if (opts.live) return "LIVE";
  if (opts.fixture && !isFixtureFallbackAllowed()) return "NOT_CONFIGURED";
  if (opts.fixture) return "FIXTURE";
  return "FALLBACK";
}
