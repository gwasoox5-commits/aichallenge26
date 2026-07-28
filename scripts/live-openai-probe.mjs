#!/usr/bin/env node
/**
 * Minimal OpenAI live probe — loads .env.local internally, never prints secrets.
 * Usage: node scripts/live-openai-probe.mjs
 */
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const root = process.cwd();
const envPath = join(root, ".env.local");
if (existsSync(envPath)) {
  const raw = readFileSync(envPath, "utf8").replace(/^\uFEFF/, "");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (key && !process.env[key]) process.env[key] = val;
  }
}

if (!process.env.OPENAI_API_KEY && !process.env.BSP_OPENAI_API_KEY) {
  console.log(JSON.stringify({ status: "NOT_CONFIGURED", reason: "OPENAI_API_KEY missing" }));
  process.exit(0);
}

process.env.RUN_LIVE_API_TESTS = "true";

const { testOpenAiConnection } = await import("../lib/integrations/openai-client.ts");
const { getOpenAiConfig } = await import("../lib/integrations/config.ts");

try {
  const cfg = getOpenAiConfig();
  const started = Date.now();
  const r = await testOpenAiConnection();
  console.log(
    JSON.stringify({
      status: "LIVE",
      ok: r.ok,
      model: cfg.model,
      latencyMs: Date.now() - started,
      fixtureUsed: false,
      fallbackUsed: false,
      resultStatus: "live",
    })
  );
  process.exit(r.ok ? 0 : 1);
} catch (e) {
  console.log(
    JSON.stringify({
      status: "ERROR",
      code: e?.code ?? "PROVIDER_UNAVAILABLE",
      message: e instanceof Error ? e.message : "OpenAI probe failed",
    })
  );
  process.exit(1);
}
