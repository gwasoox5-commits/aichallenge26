/**
 * External API integration — mock tests (default CI)
 * Live tests gated by RUN_LIVE_API_TESTS=true
 */
import { describe, expect, it, beforeEach } from "vitest";
import { getOpenAiConfig, getNewsConfig, isLiveApiTestsEnabled } from "@/lib/integrations/config";
import { IntegrationError, mapOpenAiHttpError } from "@/lib/integrations/errors";
import { clearIntegrationCache } from "@/lib/integrations/cache";
import { analyzeNewsArticles } from "@/lib/v2/intelligence/openai-analyzer";
import { generateIntelligenceScenarios } from "@/lib/v2/intelligence/scenario-generator";
import { searchNewsWithCache } from "@/lib/integrations/news/provider";
import { getIntegrationHealth } from "@/lib/integrations/health-service";
import { getUsageSummary } from "@/lib/integrations/usage-store";
import fixtureArticles from "@/tests/fixtures/v2/news-articles.fixture.json";
import type { NewsArticle } from "@/lib/v2/intelligence/types";

describe("integration config", () => {
  beforeEach(() => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.BSP_OPENAI_API_KEY;
    clearIntegrationCache();
  });

  it("OpenAI unconfigured defaults to fixture mode", () => {
    const cfg = getOpenAiConfig();
    expect(cfg.configured).toBe(false);
    expect(cfg.enabled).toBe(false);
  });

  it("news defaults to fixture provider", () => {
    const cfg = getNewsConfig();
    expect(cfg.provider).toBe("fixture");
    expect(cfg.liveEnabled).toBe(false);
  });
});

describe("OpenAI intelligence (fixture mode)", () => {
  beforeEach(() => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.BSP_OPENAI_API_KEY;
  });

  it("analyzeNewsArticles returns fixture with usedFixture meta", async () => {
    const articles = (fixtureArticles as NewsArticle[]).slice(0, 2);
    const result = await analyzeNewsArticles(articles);
    expect(result.meta.usedFixture).toBe(true);
    expect(result.meta.resultStatus).toBe("fixture");
    expect(result.analysis.citations).toHaveLength(2);
  });

  it("generateIntelligenceScenarios returns 3 scenarios from fixture", async () => {
    const articles = (fixtureArticles as NewsArticle[]).slice(0, 1);
    const analyzed = await analyzeNewsArticles(articles);
    const gen = await generateIntelligenceScenarios(analyzed.analysis);
    expect(gen.scenarios).toHaveLength(3);
    expect(gen.meta.usedFixture).toBe(true);
  });
});

describe("news provider", () => {
  it("searchNewsWithCache returns fixture articles", async () => {
    const result = await searchNewsWithCache({ keywords: ["supply"], limit: 5 });
    expect(result.usedFixture).toBe(true);
    expect(result.articles.length).toBeGreaterThan(0);
    expect(result.articles[0].bodyStatus).toBeDefined();
  });
});

describe("integration health", () => {
  it("returns provider snapshots without live checks", async () => {
    const h = await getIntegrationHealth(false);
    expect(h.openai.name).toBe("openai");
    expect(h.news.name).toBeDefined();
    expect(h.externalData.name).toBeDefined();
  });
});

describe("integration errors", () => {
  it("maps user-friendly messages without secrets", () => {
    const err = new IntegrationError("API_KEY_MISSING");
    const json = err.toClientJson();
    expect(json.error).toContain("OpenAI");
    expect(JSON.stringify(json)).not.toMatch(/sk-/);
  });

  it("maps OpenAI insufficient_quota to QUOTA_EXCEEDED", () => {
    const body = JSON.stringify({ error: { code: "insufficient_quota", type: "insufficient_quota" } });
    const err = mapOpenAiHttpError(429, body);
    expect(err.code).toBe("QUOTA_EXCEEDED");
  });

  it("maps generic 429 to RATE_LIMITED", () => {
    const err = mapOpenAiHttpError(429, "{}");
    expect(err.code).toBe("RATE_LIMITED");
  });
});

describe("usage store", () => {
  it("returns empty summary initially", () => {
    const s = getUsageSummary();
    expect(s.todayCalls).toBeGreaterThanOrEqual(0);
  });
});

const live = isLiveApiTestsEnabled() ? describe : describe.skip;

live("LIVE API tests", () => {
  it("OpenAI connection test", async () => {
    const { testOpenAiConnection } = await import("@/lib/integrations/openai-client");
    const r = await testOpenAiConnection();
    expect(r.ok).toBe(true);
  }, 30_000);

  it("Frankfurter FX provider", async () => {
    const { testFrankfurterProvider } = await import("@/lib/integrations/external-data/frankfurter-provider");
    const r = await testFrankfurterProvider();
    expect(r.ok).toBe(true);
  }, 15_000);
});
