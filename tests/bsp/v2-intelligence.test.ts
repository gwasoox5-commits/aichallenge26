/**
 * V2.3 Real-world Intelligence — unit & pipeline tests (fixtures only, no live OpenAI/news)
 */
import { describe, expect, it, beforeEach, vi } from "vitest";
import { FixtureNewsAdapter, getFixtureArticle, searchFixtureArticlesEducational, searchNews } from "@/lib/v2/intelligence/news-adapter";
import { analyzeNewsArticles } from "@/lib/v2/intelligence/openai-analyzer";
import { generateIntelligenceScenarios } from "@/lib/v2/intelligence/scenario-generator";
import { generateConsultantBriefing } from "@/lib/v2/intelligence/consultant-generator";
import {
  clampStudioValue,
  lowAccuracyLabel,
  mapScenarioToEnginePreview,
  STUDIO_VARIABLE_BOUNDS,
  toExplainability,
} from "@/lib/v2/intelligence/economy-mapper";
import { scoreScenarioQuality, qualityBadgeTone } from "@/lib/v2/intelligence/quality-scorer";
import { CURRENT_PROMPT_VERSION, resolvePromptVersion, PROMPT_VERSIONS } from "@/lib/v2/intelligence/prompt-registry";
import { IntelligenceLibraryStore } from "@/lib/v2/intelligence/library-store";
import { IntelligenceSessionStore, getIntelligenceSessionStore, resetIntelligenceSessionStore } from "@/lib/v2/intelligence/session-store";
import { GoogleNewsRssAdapter } from "@/lib/v2/intelligence/google-news-rss-adapter";
import {
  getIntelligenceService,
  resetIntelligenceService,
  searchNewsForIntelligence,
} from "@/lib/v2/intelligence/intelligence-service";
import fixtureArticles from "@/tests/fixtures/v2/news-articles.fixture.json";
import type { NewsArticle } from "@/lib/v2/intelligence/types";

const GM = { userId: "gm-intel", role: "GM" as const, reason: "V2.3 test" };
const SESSION = "sess-v23-intel";
const articles = fixtureArticles as NewsArticle[];

const THEME_KEYWORDS: Array<{ theme: string; keyword: string; articleId: string }> = [
  { theme: "반도체 공급 부족", keyword: "반도체", articleId: "news-semiconductor-001" },
  { theme: "관세 인상", keyword: "관세", articleId: "news-tariff-001" },
  { theme: "환율 급등", keyword: "환율", articleId: "news-fx-001" },
  { theme: "AI 경쟁 심화", keyword: "AI", articleId: "news-ai-001" },
  { theme: "정부 보조금", keyword: "보조금", articleId: "news-subsidy-001" },
  { theme: "친환경 규제", keyword: "ESG", articleId: "news-esg-001" },
  { theme: "항만 파업", keyword: "항만", articleId: "news-port-001" },
  { theme: "에너지 가격 상승", keyword: "에너지", articleId: "news-energy-001" },
  { theme: "대형 경쟁사 진입", keyword: "경쟁", articleId: "news-competitor-001" },
  { theme: "노사분규", keyword: "노사", articleId: "news-labor-001" },
];

beforeEach(() => {
  delete process.env.BSP_OPENAI_API_KEY;
  delete process.env.BSP_GNEWS_API_KEY;
  process.env.BSP_NEWS_PROVIDER = "fixture";
  resetIntelligenceService();
  resetIntelligenceSessionStore({ persist: false });
});

describe("V2.3 News Adapter", () => {
  it("searches fixture articles by keyword", async () => {
    const result = await searchNews({ keywords: ["반도체"], limit: 5 });
    expect(result.usedFixture).toBe(true);
    expect(result.articles.some((a) => a.id === "news-semiconductor-001")).toBe(true);
  });

  it("returns top fixture articles when keywords do not match", async () => {
    const result = await new FixtureNewsAdapter().search({ keywords: ["nonexistent-xyz-404"] });
    expect(result.usedFixture).toBe(true);
    expect(result.articles.length).toBeGreaterThan(0);
  });

  it("searchFixtureArticlesEducational bypasses production guard", () => {
    const result = searchFixtureArticlesEducational({ keywords: ["미국", "이란"], limit: 5 });
    expect(result.usedFixture).toBe(true);
    expect(result.articles.length).toBeGreaterThan(0);
    expect(result.provider).toBe("fixture-educational");
  });

  it("returns all articles when keywords empty", async () => {
    const result = await new FixtureNewsAdapter().search({ keywords: [] });
    expect(result.articles.length).toBe(10);
  });

  it("degrades gracefully when GNews fails", async () => {
    process.env.BSP_GNEWS_API_KEY = "invalid-key-for-test";
    const adapter = new (await import("@/lib/v2/intelligence/news-adapter")).GNewsAdapter(
      "bad",
      new FixtureNewsAdapter()
    );
    const result = await adapter.search({ keywords: ["tariff"] });
    expect(result.degraded).toBe(true);
    expect(result.articles.length).toBeGreaterThan(0);
  });

  it("getFixtureArticle resolves by id", () => {
    expect(getFixtureArticle("news-fx-001")?.title).toMatch(/환율/);
  });
});

describe("V2.3 AI Analysis", () => {
  it("returns structured analysis with fixture", async () => {
    const selected = [articles[0]];
    const { analysis, meta } = await analyzeNewsArticles(selected);
    expect(meta.usedFixture).toBe(true);
    expect(analysis.eventSummary).toBeTruthy();
    expect(analysis.keyIssues.length).toBeGreaterThan(0);
    expect(analysis.citations).toHaveLength(1);
    expect(analysis.citations[0].url).toBeTruthy();
  });

  it("stores prompt version on analysis", async () => {
    const { analysis } = await analyzeNewsArticles([articles[1]], "v1.0");
    expect(analysis.promptVersion).toBe("v1.0");
  });

  it("marks estimates on analysis", async () => {
    const { analysis } = await analyzeNewsArticles([articles[2]]);
    expect(analysis.isEstimate).toBe(true);
  });
});

describe("V2.3 Scenario Generation", () => {
  it("generates 3 scenarios with variable impacts", async () => {
    const { analysis } = await analyzeNewsArticles([articles[0]]);
    const { scenarios, meta } = await generateIntelligenceScenarios(analysis);
    expect(meta.usedFixture).toBe(true);
    expect(scenarios).toHaveLength(3);
    expect(scenarios.map((s) => s.scenarioKey).sort()).toEqual(["neutral", "optimistic", "pessimistic"]);
    expect(scenarios[0].variableImpacts.length).toBeGreaterThan(0);
  });

  it("includes assumptions per scenario", async () => {
    const { analysis } = await analyzeNewsArticles([articles[0]]);
    const { scenarios } = await generateIntelligenceScenarios(analysis);
    for (const s of scenarios) {
      expect(s.assumptions.length).toBeGreaterThan(0);
      expect(s.expectedOutcomes.length).toBeGreaterThan(0);
    }
  });
});

describe("V2.3 Economy Mapping & Clamp", () => {
  it("clamps proposed values to studio bounds", () => {
    const clamped = clampStudioValue("demand", -999);
    expect(clamped).toBe(STUDIO_VARIABLE_BOUNDS.demand.min);
  });

  it("explainability shows proposed vs clamped", () => {
    const ex = toExplainability({
      key: "tariff",
      mode: "DELTA",
      value: 999,
      rationale: "test",
      isEstimate: true,
      confidence: "LOW",
      assumption: "policy shock",
    });
    expect(ex.proposedValue).toBe(999);
    expect(ex.clampedValue).toBeLessThanOrEqual(STUDIO_VARIABLE_BOUNDS.tariff.max);
    expect(ex.lowAccuracyWarning).toBe("추정 정확도가 낮음");
  });

  it("does not throw for unknown studio variable keys", () => {
    const ex = toExplainability({
      key: "warRisk" as "demand",
      mode: "PERCENT",
      value: 12,
      rationale: "unknown key from AI",
      isEstimate: true,
    });
    expect(ex.clampedValue).toBe(12);
    expect(ex.allowedMax).toBe(50);
  });

  it("maps scenario effects to engine preview", () => {
    const { engineEffects, boundsWarnings } = mapScenarioToEnginePreview([
      { key: "demand", mode: "PERCENT", value: -10, rationale: "demand drop" },
    ]);
    expect(engineEffects.length).toBeGreaterThan(0);
    expect(Array.isArray(boundsWarnings)).toBe(true);
  });

  it("low accuracy label only for LOW confidence", () => {
    expect(lowAccuracyLabel("LOW")).toBe("추정 정확도가 낮음");
    expect(lowAccuracyLabel("HIGH")).toBeUndefined();
  });
});

describe("V2.3 Quality Scoring", () => {
  it("scores scenario quality", async () => {
    const { analysis } = await analyzeNewsArticles([articles[0]]);
    const { scenarios } = await generateIntelligenceScenarios(analysis);
    const quality = scoreScenarioQuality(analysis, scenarios);
    expect(quality.overall).toBeGreaterThan(0);
    expect(quality.realism).toBeLessThanOrEqual(100);
    expect(typeof quality.recommendRegenerate).toBe("boolean");
  });

  it("quality badge tone reflects score", () => {
    expect(qualityBadgeTone(80)).toBe("green");
    expect(qualityBadgeTone(60)).toBe("amber");
    expect(qualityBadgeTone(40)).toBe("red");
  });
});

describe("V2.3 Consultant Output", () => {
  it("generates GM-only consultant briefing", async () => {
    const { analysis } = await analyzeNewsArticles([articles[0]]);
    const { scenarios } = await generateIntelligenceScenarios(analysis);
    const { consultant, meta } = await generateConsultantBriefing(analysis, scenarios);
    expect(meta.usedFixture).toBe(true);
    expect(consultant.gmOnly).toBe(true);
    expect(consultant.coreRisks.length).toBeGreaterThan(0);
    expect(consultant.instructorDiscussionQuestions.length).toBeGreaterThan(0);
    expect(consultant.learningObjectives.length).toBeGreaterThan(0);
  });
});

describe("V2.3 Prompt Registry", () => {
  it("resolves prompt versions", () => {
    expect(resolvePromptVersion("v1.0")).toBe("v1.0");
    expect(resolvePromptVersion(undefined)).toBe(CURRENT_PROMPT_VERSION);
  });

  it("has metadata for all versions", () => {
    expect(PROMPT_VERSIONS["v1.1"].analysis).toContain("citation");
    expect(PROMPT_VERSIONS["v1.2"].analysis).toContain("Korean");
    expect(PROMPT_VERSIONS["v1.3"].scenarios).toContain("manufacturing");
  });
});

describe("V2.3 Library Store", () => {
  it("save favorite duplicate export import", async () => {
    const lib = new IntelligenceLibraryStore({ persist: false });
    const svc = getIntelligenceService();
    const preview = await svc.createPreviewFromArticles(SESSION, [articles[0]], GM);
    await svc.analyzePreview(preview.previewId);
    await svc.generateScenariosForPreview(preview.previewId);
    const full = await svc.buildFullPreview(preview.previewId);

    const saved = lib.saveFromPreview(full, "Test Scenario", ["tariff"]);
    expect(saved.libraryId).toBeTruthy();

    const fav = lib.setFavorite(saved.libraryId, true);
    expect(fav?.favorite).toBe(true);

    const dup = lib.duplicate(saved.libraryId);
    expect(dup?.title).toContain("복사");

    const exported = lib.exportJson(saved.libraryId);
    expect(exported).toContain("previewId");

    const imported = lib.importJson(exported!);
    expect(imported.libraryId).not.toBe(saved.libraryId);

    expect(lib.deleteEntry(saved.libraryId)).toBe(true);
  });
});

describe("V2.3 Session Store", () => {
  it("persists preview lifecycle", async () => {
    const store = new IntelligenceSessionStore({ persist: false });
    const svc = getIntelligenceService();
    const preview = await svc.createPreviewFromArticles(SESSION, [articles[1]], GM);
    store.savePreview(preview);
    expect(store.getPreview(preview.previewId)?.status).toBe("DRAFT");
    expect(store.listBySession(SESSION).length).toBe(1);
  });
});

describe("V2.3 Full Pipeline", () => {
  it("runs news → analysis → scenarios → preview without V1 side effects", async () => {
    const svc = getIntelligenceService();
    const news = await svc.searchNews({ keywords: ["관세"] });
    expect(news.articles.length).toBeGreaterThan(0);

    const preview = await svc.createPreviewFromArticles(SESSION, news.articles.slice(0, 1), GM);
    const analyzed = await svc.analyzePreview(preview.previewId);
    expect(analyzed.status).toBe("ANALYZED");

    const withScenarios = await svc.generateScenariosForPreview(preview.previewId);
    expect(withScenarios.status).toBe("SCENARIOS");

    const full = await svc.buildFullPreview(preview.previewId);
    expect(full.status).toBe("PREVIEW");
    expect(full.consultant?.gmOnly).toBe(true);
    expect(full.quality?.overall).toBeGreaterThan(0);

    const economy = svc.getEconomyPreview(preview.previewId, "neutral");
    expect(economy.explainability.length).toBeGreaterThan(0);

    const intent = svc.buildPublishIntent(preview.previewId, "neutral");
    expect(intent.readyForV24).toBe(true);
    expect(intent.note).toContain("V2.4");
  });

  it("publish intent does not mutate game state", async () => {
    const svc = getIntelligenceService();
    const preview = await svc.createPreviewFromArticles(SESSION, [articles[2]], GM);
    await svc.buildFullPreview(preview.previewId);
    const intent = svc.buildPublishIntent(preview.previewId, "pessimistic");
    expect(intent.selectedScenario).toBe("pessimistic");
  });
});

describe("V2.3 Theme Scenarios (fixture news)", () => {
  for (const { theme, keyword, articleId } of THEME_KEYWORDS) {
    it(`theme: ${theme}`, async () => {
      const result = await searchNews({ keywords: [keyword] });
      expect(result.articles.some((a) => a.id === articleId)).toBe(true);

      const article = getFixtureArticle(articleId)!;
      const { analysis } = await analyzeNewsArticles([article]);
      expect(analysis.citations[0].articleId).toBe(articleId);

      const { scenarios } = await generateIntelligenceScenarios(analysis);
      expect(scenarios).toHaveLength(3);

      const quality = scoreScenarioQuality(analysis, scenarios);
      expect(quality.overall).toBeGreaterThan(30);
    });
  }
});

describe("V2.3 Citation & Confidence", () => {
  it("citations include title outlet date url", async () => {
    const { analysis } = await analyzeNewsArticles([articles[3]]);
    const c = analysis.citations[0];
    expect(c.title).toBeTruthy();
    expect(c.outlet).toBeTruthy();
    expect(c.publishedAt).toBeTruthy();
    expect(c.url).toMatch(/^https?:/);
  });

  it("variable impacts carry confidence levels", async () => {
    const { analysis } = await analyzeNewsArticles([articles[0]]);
    const { scenarios } = await generateIntelligenceScenarios(analysis);
    const impacts = scenarios.flatMap((s) => s.variableImpacts);
    expect(impacts.every((i) => ["LOW", "MEDIUM", "HIGH"].includes(i.confidence))).toBe(true);
  });
});

describe("V2.3 Intelligence news fallback", () => {
  it("falls back to educational fixtures when Google RSS returns empty", async () => {
    const spy = vi.spyOn(GoogleNewsRssAdapter.prototype, "search").mockResolvedValue({
      articles: [],
      provider: "google-news-rss",
      usedFixture: false,
    });
    vi.spyOn(await import("@/lib/v2/intelligence/news-adapter"), "searchNews").mockResolvedValue({
      articles: [],
      provider: "gnews",
      usedFixture: false,
    });

    const result = await searchNewsForIntelligence({ keywords: ["미국", "이란", "전쟁"] }, SESSION);
    expect(result.usedFixture).toBe(true);
    expect(result.degraded).toBe(true);
    expect(result.articles.length).toBeGreaterThan(0);
    expect(result.note).toContain("샘플");

    spy.mockRestore();
  });

  it("falls back to educational fixtures when Google RSS throws", async () => {
    vi.spyOn(GoogleNewsRssAdapter.prototype, "search").mockRejectedValue(new Error("network"));
    vi.spyOn(await import("@/lib/v2/intelligence/news-adapter"), "searchNews").mockRejectedValue(
      Object.assign(new Error("PROVIDER_DISABLED"), { code: "PROVIDER_DISABLED" })
    );

    const result = await searchNewsForIntelligence({ keywords: ["economy"] }, SESSION);
    expect(result.usedFixture).toBe(true);
    expect(result.degraded).toBe(true);
    expect(result.articles.length).toBeGreaterThan(0);

    vi.restoreAllMocks();
  });

  it("caches articles on successful intelligence search", async () => {
    vi.spyOn(GoogleNewsRssAdapter.prototype, "search").mockResolvedValue({
      articles: articles.slice(0, 2),
      provider: "google-news-rss",
      usedFixture: false,
    });

    const svc = getIntelligenceService();
    const result = await svc.searchNews({ keywords: ["관세"] }, SESSION);
    expect(result.articles.length).toBeGreaterThan(0);

    const store = getIntelligenceSessionStore();
    for (const article of result.articles) {
      expect(store.getCachedArticle(SESSION, article.id)?.id).toBe(article.id);
    }

    vi.restoreAllMocks();
  });
});

describe("V2.3 External failure isolation", () => {
  it("OpenAI absence uses fixture without throwing", async () => {
    delete process.env.BSP_OPENAI_API_KEY;
    await expect(analyzeNewsArticles([articles[0]])).resolves.toMatchObject({
      meta: { usedFixture: true },
    });
  });

  it("news search never throws on fixture provider", async () => {
    const result = await searchNews({ keywords: ["nonexistent-xyz-404"] });
    expect(result.usedFixture).toBe(true);
    expect(result.articles.length).toBeGreaterThan(0);
  });
});
