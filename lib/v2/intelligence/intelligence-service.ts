import type { GmActor } from "@/src/bsp/domain/gm/audit-types";
import type { ScenarioKey } from "@/lib/v2/event-studio/types";
import { getFixtureArticle, listFixtureArticles, searchFixtureArticlesEducational, searchNews } from "./news-adapter";
import { GoogleNewsRssAdapter } from "./google-news-rss-adapter";
import { analyzeNewsArticles } from "./openai-analyzer";
import { generateIntelligenceScenarios } from "./scenario-generator";
import { generateConsultantBriefing } from "./consultant-generator";
import { scoreScenarioQuality } from "./quality-scorer";
import { buildEconomyPreviewTable } from "./economy-mapper";
import { getIntelligenceSessionStore } from "./session-store";
import { getIntelligenceLibraryStore } from "./library-store";
import type {
  AnalyzeArticlesInput,
  BuildPreviewInput,
  IntelligencePreview,
  IntelligencePublishIntent,
  NewsArticle,
  NewsSearchQuery,
  NewsSearchResult,
} from "./types";

function newPreviewId(): string {
  return `prev-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export class IntelligenceService {
  async searchNews(query: NewsSearchQuery, sessionId?: string): Promise<NewsSearchResult> {
    return searchNewsForIntelligence(query, sessionId);
  }

  async createPreviewFromArticles(
    sessionId: string,
    articles: NewsArticle[],
    actor: GmActor
  ): Promise<IntelligencePreview> {
    const now = new Date().toISOString();
    const preview: IntelligencePreview = {
      previewId: newPreviewId(),
      sessionId,
      articles,
      status: "DRAFT",
      createdAt: now,
      updatedAt: now,
      createdBy: actor.userId,
    };
    getIntelligenceSessionStore().savePreview(preview);
    return preview;
  }

  async analyzePreview(previewId: string, promptVersion?: string): Promise<IntelligencePreview> {
    const store = getIntelligenceSessionStore();
    const preview = store.getPreview(previewId);
    if (!preview) throw Object.assign(new Error("Preview not found"), { code: "ERR_INTEL_PREVIEW", status: 404 });
    if (preview.articles.length === 0) {
      throw Object.assign(new Error("No articles selected"), { code: "ERR_INTEL_ARTICLES", status: 400 });
    }

    const { analysis } = await analyzeNewsArticles(preview.articles, promptVersion);
    const updated: IntelligencePreview = {
      ...preview,
      analysis,
      status: "ANALYZED",
      updatedAt: new Date().toISOString(),
    };
    store.savePreview(updated);
    return updated;
  }

  async generateScenariosForPreview(previewId: string, promptVersion?: string): Promise<IntelligencePreview> {
    const store = getIntelligenceSessionStore();
    const preview = store.getPreview(previewId);
    if (!preview?.analysis) {
      throw Object.assign(new Error("Analysis required first"), { code: "ERR_INTEL_ANALYSIS", status: 400 });
    }

    const { scenarios } = await generateIntelligenceScenarios(preview.analysis, promptVersion);
    const updated: IntelligencePreview = {
      ...preview,
      scenarios,
      status: "SCENARIOS",
      updatedAt: new Date().toISOString(),
    };
    store.savePreview(updated);
    return updated;
  }

  async buildFullPreview(previewId: string, _input?: BuildPreviewInput): Promise<IntelligencePreview> {
    const store = getIntelligenceSessionStore();
    let preview = store.getPreview(previewId);
    if (!preview) throw Object.assign(new Error("Preview not found"), { code: "ERR_INTEL_PREVIEW", status: 404 });

    if (!preview.analysis) preview = await this.analyzePreview(previewId);
    if (!preview.scenarios) preview = await this.generateScenariosForPreview(previewId);

    const { consultant } = await generateConsultantBriefing(preview.analysis!, preview.scenarios!);
    const quality = scoreScenarioQuality(preview.analysis!, preview.scenarios!);

    const updated: IntelligencePreview = {
      ...preview,
      consultant,
      quality,
      status: "PREVIEW",
      updatedAt: new Date().toISOString(),
    };
    store.savePreview(updated);
    return updated;
  }

  getPreview(previewId: string): IntelligencePreview | undefined {
    return getIntelligenceSessionStore().getPreview(previewId);
  }

  resolveArticles(input: AnalyzeArticlesInput): NewsArticle[] {
    if (input.articles?.length) return input.articles;

    const store = getIntelligenceSessionStore();
    const fromCache = input.articleIds
      .map((id) => store.getCachedArticle(input.sessionId, id))
      .filter((a): a is NewsArticle => Boolean(a));
    if (fromCache.length === input.articleIds.length) return fromCache;

    const resolved = input.articleIds
      .map((id) => getFixtureArticle(id))
      .filter((a): a is NewsArticle => Boolean(a));
    if (resolved.length === input.articleIds.length) return resolved;

    if (fromCache.length > 0) return fromCache;
    if (resolved.length > 0) return resolved;

    throw Object.assign(new Error("Articles not found — search again or re-select articles"), {
      code: "ERR_INTEL_ARTICLES",
      status: 404,
    });
  }

  getEconomyPreview(previewId: string, scenarioKey: ScenarioKey = "neutral") {
    const preview = this.getPreview(previewId);
    if (!preview?.scenarios) {
      throw Object.assign(new Error("Scenarios required"), { code: "ERR_INTEL_SCENARIOS", status: 400 });
    }
    const scenario = preview.scenarios.find((s) => s.scenarioKey === scenarioKey);
    if (!scenario) {
      throw Object.assign(new Error("Scenario not found"), { code: "ERR_INTEL_SCENARIO", status: 404 });
    }
    const effects = scenario.variableImpacts.map((v) => ({
      key: v.key,
      mode: v.mode,
      value: v.clampedValue,
      rationale: v.reason,
      isEstimate: v.isEstimate,
    }));
    return buildEconomyPreviewTable(scenarioKey, effects);
  }

  /** V2.4 hook — returns intent only, does NOT publish */
  buildPublishIntent(previewId: string, selectedScenario: ScenarioKey): IntelligencePublishIntent {
    const preview = this.getPreview(previewId);
    if (!preview || preview.status !== "PREVIEW") {
      throw Object.assign(new Error("Complete preview first"), { code: "ERR_INTEL_PREVIEW", status: 400 });
    }
    return {
      previewId,
      selectedScenario,
      readyForV24: true,
      note: "V2.4 Publish available — GM Approve → Publish → Event Engine",
      publishEndpoint: "/api/v2/intelligence/publish",
    };
  }

  saveToLibrary(previewId: string, title?: string, tags?: string[]) {
    const preview = this.getPreview(previewId);
    if (!preview) throw Object.assign(new Error("Preview not found"), { code: "ERR_INTEL_PREVIEW", status: 404 });
    return getIntelligenceLibraryStore().saveFromPreview(preview, title, tags);
  }

  listLibrary() {
    return getIntelligenceLibraryStore().listEntries();
  }

  listFixtureArticles() {
    return listFixtureArticles();
  }
}

const globalRef = globalThis as unknown as { v2IntelligenceService?: IntelligenceService };

export function getIntelligenceService(): IntelligenceService {
  if (!globalRef.v2IntelligenceService) {
    globalRef.v2IntelligenceService = new IntelligenceService();
  }
  return globalRef.v2IntelligenceService;
}

export function resetIntelligenceService() {
  globalRef.v2IntelligenceService = new IntelligenceService();
}

export async function searchNewsForIntelligence(
  query: NewsSearchQuery,
  sessionId?: string
): Promise<NewsSearchResult> {
  const rssAdapter = new GoogleNewsRssAdapter();

  try {
    const rssResult = await rssAdapter.search(query);
    if (rssResult.articles.length > 0) {
      if (sessionId) {
        getIntelligenceSessionStore().cacheArticles(sessionId, rssResult.articles);
      }
      return rssResult;
    }
  } catch {
    /* fall through to configured provider / educational fallback */
  }

  try {
    const live = await searchNews(query);
    if (live.articles.length > 0) {
      if (sessionId) {
        getIntelligenceSessionStore().cacheArticles(sessionId, live.articles);
      }
      return live;
    }
  } catch {
    /* fall through to educational fallback */
  }

  const fallback = searchFixtureArticlesEducational(query);
  if (sessionId && fallback.articles.length > 0) {
    getIntelligenceSessionStore().cacheArticles(sessionId, fallback.articles);
  }
  return {
    ...fallback,
    degraded: true,
    note:
      "Google News RSS에서 실시간 뉴스를 찾지 못했습니다. Railway에 BSP_NEWS_PROVIDER=google-rss 설정을 확인하세요. 교육용 샘플 뉴스를 표시합니다.",
  };
}
