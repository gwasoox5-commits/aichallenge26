/** Server-side integration configuration — never expose secrets to client */

import { isProductionRuntime } from "@/lib/bsp/runtime-config";

export type IntegrationMode = "live" | "fixture" | "disabled";

function envBool(key: string, fallback = false): boolean {
  const v = process.env[key];
  if (v === undefined || v === "") return fallback;
  return v === "1" || v.toLowerCase() === "true";
}

function envInt(key: string, fallback: number): number {
  const v = process.env[key];
  if (!v) return fallback;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

/** OpenAI — supports OPENAI_* and legacy BSP_OPENAI_* */
export function getOpenAiConfig() {
  const apiKey = process.env.OPENAI_API_KEY ?? process.env.BSP_OPENAI_API_KEY ?? "";
  const enabled = envBool("OPENAI_ENABLED", true);
  return {
    apiKey,
    model: process.env.OPENAI_MODEL ?? process.env.BSP_OPENAI_MODEL ?? "gpt-4.1-mini",
    timeoutMs: envInt("OPENAI_TIMEOUT_MS", 60_000),
    maxRetries: envInt("OPENAI_MAX_RETRIES", 2),
    enabled: enabled && apiKey.length > 0,
    configured: apiKey.length > 0,
    intelligenceMaxTokens: envInt("BSP_INTELLIGENCE_MAX_TOKENS", 3500),
    studioMaxTokens: envInt("BSP_STUDIO_MAX_TOKENS", 2500),
  };
}

export function getNewsConfig() {
  const rawProvider = (process.env.BSP_NEWS_PROVIDER ?? process.env.NEWS_PROVIDER ?? "fixture").toLowerCase();
  const apiKey = (process.env.BSP_GNEWS_API_KEY ?? process.env.GNEWS_API_KEY ?? "").trim();
  let provider = rawProvider;
  if (rawProvider === "fixture" && isProductionRuntime()) {
    provider = "google-rss";
  }
  // Intelligence workflow uses Google News RSS directly; keep global default on RSS unless explicitly gnews.
  if (rawProvider === "gnews" && !apiKey) {
    provider = "google-rss";
  }
  const isGoogleRss = provider === "google-rss" || provider === "google-news-rss";
  const isGnews = provider === "gnews";
  return {
    provider,
    rawProvider,
    apiKey,
    timeoutMs: envInt("NEWS_TIMEOUT_MS", 8000),
    maxRetries: envInt("NEWS_MAX_RETRIES", 2),
    liveEnabled: (isGnews && apiKey.length > 0) || isGoogleRss,
    configured: provider === "fixture" || isGoogleRss || apiKey.length > 0,
  };
}

export function getExternalDataConfig() {
  const fxProvider = (process.env.BSP_FX_PROVIDER ?? "frankfurter").toLowerCase();
  return {
    fxProvider,
    fxEnabled: envBool("BSP_FX_ENABLED", true),
    timeoutMs: envInt("EXTERNAL_DATA_TIMEOUT_MS", 8000),
  };
}

/** Configured model pricing (USD per 1M tokens) — not hardcoded in logic */
export function getModelPricing(): Record<string, { inputPer1M: number; outputPer1M: number }> {
  try {
    const raw = process.env.OPENAI_MODEL_PRICING_JSON;
    if (raw) return JSON.parse(raw) as Record<string, { inputPer1M: number; outputPer1M: number }>;
  } catch {
    /* ignore */
  }
  return {
    "gpt-4.1-mini": { inputPer1M: 0.4, outputPer1M: 1.6 },
    "gpt-4.1": { inputPer1M: 2.0, outputPer1M: 8.0 },
  };
}

export function isLiveApiTestsEnabled(): boolean {
  return envBool("RUN_LIVE_API_TESTS", false);
}
