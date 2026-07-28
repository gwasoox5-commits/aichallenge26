/**
 * Production news fixture guard — fixture must not succeed in production without BSP_ALLOW_FIXTURE
 */
import { describe, expect, it, afterEach, vi } from "vitest";
import { searchNews, createNewsAdapter } from "@/lib/v2/intelligence/news-adapter";
import { getIntegrationHealth } from "@/lib/integrations/health-service";
import { IntegrationError } from "@/lib/integrations/errors";

describe("production news fixture guard", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses Google News RSS in production when provider is fixture and no GNews key", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("BSP_ALLOW_FIXTURE", "false");
    vi.stubEnv("BSP_NEWS_PROVIDER", "fixture");
    vi.stubEnv("BSP_GNEWS_API_KEY", "");
    expect(createNewsAdapter().name).toBe("google-news-rss");
  });

  it("uses GNews only when provider is explicitly gnews with API key", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("BSP_ALLOW_FIXTURE", "false");
    vi.stubEnv("BSP_NEWS_PROVIDER", "gnews");
    vi.stubEnv("BSP_GNEWS_API_KEY", "test-key-present");
    expect(createNewsAdapter().name).toBe("gnews");
  });

  it("reports LIVE for google-rss in production without API key", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("BSP_ALLOW_FIXTURE", "false");
    vi.stubEnv("BSP_NEWS_PROVIDER", "google-rss");
    vi.stubEnv("BSP_GNEWS_API_KEY", "");

    const health = await getIntegrationHealth(false);
    expect(health.news.mode).toBe("LIVE");
  });

  it("allows fixture in development by default", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("BSP_NEWS_PROVIDER", "fixture");
    const result = await searchNews({ keywords: [], limit: 1 });
    expect(result.usedFixture).toBe(true);
    expect(result.articles.length).toBeGreaterThan(0);
  });

  it("GNews failure does not silently succeed with fixture in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("BSP_ALLOW_FIXTURE", "false");
    vi.stubEnv("BSP_NEWS_PROVIDER", "gnews");
    vi.stubEnv("BSP_GNEWS_API_KEY", "invalid-key-for-test");

    await expect(searchNews({ keywords: ["economy"], limit: 1, language: "en" })).rejects.toBeInstanceOf(IntegrationError);
  });
});
