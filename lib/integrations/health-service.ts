import { getOpenAiConfig, getNewsConfig, getExternalDataConfig } from "./config";

import { getProviderSnapshot, recordProviderCall } from "./usage-store";

import type { IntegrationHealthResponse } from "./types";

import { testOpenAiConnection } from "./openai-client";

import { searchNewsWithCache } from "./news/provider";

import { testFrankfurterProvider } from "./external-data/frankfurter-provider";

import { isFixtureFallbackAllowed, isProductionRuntime } from "@/lib/bsp/runtime-config";



function resolveOpenAiMode(): IntegrationHealthResponse["openai"]["mode"] {

  const cfg = getOpenAiConfig();

  if (!cfg.configured) {

    return isProductionRuntime() && !isFixtureFallbackAllowed() ? "NOT_CONFIGURED" : "FIXTURE";

  }

  if (!cfg.enabled) return "DISABLED";

  return "LIVE";

}



function resolveNewsMode(): IntegrationHealthResponse["news"]["mode"] {

  const cfg = getNewsConfig();

  if (cfg.provider === "gnews" && cfg.apiKey) return "LIVE";

  if (isProductionRuntime() && !isFixtureFallbackAllowed()) return "NOT_CONFIGURED";

  if (cfg.provider === "fixture" || !cfg.apiKey) return "FIXTURE";

  return "NOT_CONFIGURED";

}



export async function getIntegrationHealth(runLiveChecks = false): Promise<IntegrationHealthResponse> {

  const openaiCfg = getOpenAiConfig();

  const newsCfg = getNewsConfig();

  const extCfg = getExternalDataConfig();



  const openaiMode = resolveOpenAiMode();

  let newsMode = resolveNewsMode();



  const health: IntegrationHealthResponse = {

    checkedAt: new Date().toISOString(),

    openai: getProviderSnapshot("openai", openaiCfg.configured, openaiCfg.enabled, openaiMode),

    news: getProviderSnapshot(newsCfg.provider, newsCfg.configured, newsCfg.liveEnabled, newsMode),

    externalData: getProviderSnapshot(extCfg.fxProvider, true, extCfg.fxEnabled, extCfg.fxEnabled ? "LIVE" : "DISABLED"),

  };



  if (runLiveChecks && openaiCfg.configured && openaiCfg.enabled) {

    try {

      const t = await testOpenAiConnection();

      recordProviderCall("openai", true, t.latencyMs);

      health.openai.lastSuccessAt = new Date().toISOString();

      health.openai.avgLatencyMs = t.latencyMs;

    } catch (e) {

      recordProviderCall("openai", false, 0, (e as { code?: string }).code);

      health.openai.lastFailureAt = new Date().toISOString();

      health.openai.lastErrorCode = (e as { code?: string }).code ?? "PROVIDER_UNAVAILABLE";

      health.openai.mode = "ERROR";

    }

  }



  if (runLiveChecks && newsCfg.liveEnabled) {

    try {

      const r = await searchNewsWithCache({ keywords: ["economy"], limit: 1, language: "en" });

      if (r.usedFixture) {

        health.news.lastFailureAt = new Date().toISOString();

        health.news.lastErrorCode = "FIXTURE_NOT_ALLOWED";

        newsMode = isProductionRuntime() && !isFixtureFallbackAllowed() ? "NOT_CONFIGURED" : "FIXTURE";

        health.news.mode = newsMode;

      } else if (!r.degraded) {

        health.news.lastSuccessAt = new Date().toISOString();

        health.news.mode = "LIVE";

      } else {

        health.news.lastFailureAt = new Date().toISOString();

        health.news.lastErrorCode = "PROVIDER_UNAVAILABLE";

        health.news.mode = "ERROR";

      }

    } catch (e) {

      health.news.lastFailureAt = new Date().toISOString();

      health.news.lastErrorCode = (e as { code?: string }).code ?? "PROVIDER_UNAVAILABLE";

      health.news.mode = "ERROR";

    }

  }



  return health;

}

