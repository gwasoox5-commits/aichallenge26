import type { NewsArticle, NewsSearchQuery, NewsSearchResult } from "./types";

import fixtureArticles from "@/tests/fixtures/v2/news-articles.fixture.json";

import { IntegrationError, mapGNewsHttpError } from "@/lib/integrations/errors";

import { isFixtureFallbackAllowed, isProductionRuntime } from "@/lib/bsp/runtime-config";

import { getNewsConfig } from "@/lib/integrations/config";
import { buildGNewsSearchQueries } from "./gnews-query";
import { GoogleNewsRssAdapter } from "./google-news-rss-adapter";

export interface NewsAdapter {
  readonly name: string;

  search(query: NewsSearchQuery): Promise<NewsSearchResult>;

  healthCheck?(): Promise<{ ok: boolean; latencyMs: number; mode: "LIVE" | "FIXTURE" | "NOT_CONFIGURED" | "DISABLED" | "ERROR" }>;
}

function normalizeKeywords(keywords: string[]): string[] {
  return keywords.map((k) => k.trim().toLowerCase()).filter(Boolean);
}

function scoreArticle(article: NewsArticle, keywords: string[]): number {
  const haystack = [article.title, article.summary, article.source, ...(article.keywords ?? [])]
    .join(" ")
    .toLowerCase();
  return keywords.reduce((score, kw) => (haystack.includes(kw) ? score + 1 : score), 0);
}

function matchFixtureArticles(
  articles: NewsArticle[],
  keywords: string[],
  limit: number
): NewsArticle[] {
  const normalized = normalizeKeywords(keywords);
  let matched = articles;

  if (normalized.length > 0) {
    matched = articles
      .map((a) => ({ article: a, score: scoreArticle(a, normalized) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((x) => x.article);

    if (matched.length === 0) {
      matched = articles;
    }
  }

  return matched.slice(0, limit);
}

function decorateFixtureArticles(articles: NewsArticle[], provider: string): NewsArticle[] {
  const fetchedAt = new Date().toISOString();
  return articles.map((a) => ({
    ...a,
    provider,
    fetchedAt,
    bodyStatus: "SNIPPET_ONLY" as const,
    contentSource: "SEARCH_SNIPPET" as const,
  }));
}

/** Intelligence education UX — bypasses production fixture guard */
export function searchFixtureArticlesEducational(query: NewsSearchQuery): NewsSearchResult {
  const articles = fixtureArticles as NewsArticle[];
  const limit = query.limit ?? 10;
  const matched = matchFixtureArticles(articles, query.keywords, limit);

  return {
    articles: decorateFixtureArticles(matched, "fixture-educational"),
    provider: "fixture-educational",
    usedFixture: true,
    fetchedAt: new Date().toISOString(),
  };
}

/** Fixture adapter — development/test only unless BSP_ALLOW_FIXTURE=true */
export class FixtureNewsAdapter implements NewsAdapter {
  readonly name = "fixture";

  constructor(private readonly articles: NewsArticle[] = fixtureArticles as NewsArticle[]) {}

  async search(query: NewsSearchQuery): Promise<NewsSearchResult> {
    if (isProductionRuntime() && !isFixtureFallbackAllowed()) {
      throw new IntegrationError("PROVIDER_DISABLED", {
        message: "뉴스 Provider가 설정되지 않았습니다. BSP_NEWS_PROVIDER=google-rss 또는 gnews를 설정하세요.",
      });
    }

    const limit = query.limit ?? 10;
    const matched = matchFixtureArticles(this.articles, query.keywords, limit);

    return {
      articles: decorateFixtureArticles(matched, this.name),
      provider: this.name,
      usedFixture: true,
      fetchedAt: new Date().toISOString(),
    };
  }

  async healthCheck() {
    if (isProductionRuntime() && !isFixtureFallbackAllowed()) {
      return { ok: false, latencyMs: 0, mode: "NOT_CONFIGURED" as const };
    }
    const started = Date.now();
    await this.search({ keywords: ["economy"], limit: 1 });
    return { ok: true, latencyMs: Date.now() - started, mode: "FIXTURE" as const };
  }
}

/** Explicit not-configured adapter for production without keys */
export class DisabledNewsAdapter implements NewsAdapter {
  readonly name = "disabled";

  async search(_query: NewsSearchQuery): Promise<NewsSearchResult> {
    throw new IntegrationError("PROVIDER_DISABLED", {
      message: "뉴스 Provider가 설정되지 않았습니다. BSP_NEWS_PROVIDER=google-rss (권장) 또는 gnews를 설정하세요.",
    });
  }

  async healthCheck() {
    return { ok: false, latencyMs: 0, mode: "NOT_CONFIGURED" as const };
  }
}

type GNewsApiArticle = {
  title: string;
  description: string;
  url: string;
  publishedAt: string;
  source?: { name?: string };
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** GNews adapter — no silent fixture fallback in production */
export class GNewsAdapter implements NewsAdapter {
  readonly name = "gnews";
  private readonly apiKey: string;

  constructor(apiKey: string, private readonly devFallback?: NewsAdapter) {
    this.apiKey = apiKey.trim();
  }

  private async fetchGNews(
    queryText: string,
    options: { language?: string; country?: string },
    limit: number,
    keywords: string[]
  ): Promise<NewsArticle[]> {
    const params = new URLSearchParams({
      q: queryText,
      max: String(limit),
      apikey: this.apiKey,
      sortby: "relevance",
    });
    if (options.language) params.set("lang", options.language);
    if (options.country) params.set("country", options.country);

    const url = `https://gnews.io/api/v4/search?${params.toString()}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const bodyText = await res.text().catch(() => undefined);
    if (!res.ok) {
      throw mapGNewsHttpError(res.status, bodyText);
    }

    const body = JSON.parse(bodyText ?? "{}") as { articles?: GNewsApiArticle[]; errors?: string[] };
    if (body.errors?.length) {
      throw new IntegrationError("INVALID_RESPONSE", { message: body.errors.join("; ") });
    }
    return (body.articles ?? []).map((a, i) => ({
      id: `gnews-${i}-${Date.now()}`,
      title: a.title,
      summary: a.description ?? "",
      source: a.source?.name ?? "GNews",
      publishedAt: a.publishedAt,
      url: a.url,
      keywords,
      provider: this.name,
      language: options.language ?? "any",
      query: queryText,
      fetchedAt: new Date().toISOString(),
      bodyStatus: a.description ? ("SNIPPET_ONLY" as const) : ("METADATA_ONLY" as const),
      contentSource: a.description ? ("SEARCH_SNIPPET" as const) : ("TITLE_ONLY" as const),
    }));
  }

  private async searchWithRetries(query: NewsSearchQuery): Promise<NewsArticle[]> {
    const limit = query.limit ?? 10;
    const keywords = query.keywords;
    const gnewsQueries = buildGNewsSearchQueries(keywords);
    const attempts: Array<{ q: string; language?: string; country?: string }> = [
      { q: gnewsQueries[0] ?? "world news", language: "en" },
      { q: gnewsQueries[1] ?? gnewsQueries[0] ?? "world news" },
      { q: gnewsQueries[2] ?? gnewsQueries[0] ?? "world news", language: "en", country: "us" },
    ];

    let lastError: unknown;
    for (let i = 0; i < attempts.length; i++) {
      if (i > 0) await sleep(1100);
      try {
        const attempt = attempts[i]!;
        const articles = await this.fetchGNews(attempt.q, attempt, limit, keywords);
        if (articles.length > 0) return articles;
      } catch (e) {
        lastError = e;
        if (e instanceof IntegrationError && (e.code === "RATE_LIMITED" || e.code === "QUOTA_EXCEEDED")) {
          throw e;
        }
        if (e instanceof IntegrationError && e.code === "API_KEY_INVALID") {
          throw e;
        }
      }
    }

    if (lastError instanceof IntegrationError) throw lastError;
    return [];
  }

  async search(query: NewsSearchQuery): Promise<NewsSearchResult> {
    try {
      const articles = await this.searchWithRetries(query);
      return { articles, provider: this.name, usedFixture: false, fetchedAt: new Date().toISOString() };
    } catch (e) {
      if (!this.devFallback) {
        if (e instanceof IntegrationError) throw e;
        throw new IntegrationError("PROVIDER_UNAVAILABLE", { cause: e });
      }
      const fallback = await this.devFallback.search(query);
      return {
        ...fallback,
        degraded: true,
        errorMessage: e instanceof Error ? e.message : "GNews unavailable",
      };
    }
  }

  async healthCheck() {
    const started = Date.now();
    try {
      await this.search({ keywords: ["economy"], limit: 1, language: "en" });
      return { ok: true, latencyMs: Date.now() - started, mode: "LIVE" as const };
    } catch {
      return { ok: false, latencyMs: Date.now() - started, mode: "ERROR" as const };
    }
  }
}

export function createNewsAdapter(): NewsAdapter {
  const newsCfg = getNewsConfig();
  const allowFixture = isFixtureFallbackAllowed();
  const fixtureFallback = allowFixture || !isProductionRuntime() ? new FixtureNewsAdapter() : undefined;

  if (newsCfg.provider === "gnews" && newsCfg.apiKey) {
    return new GNewsAdapter(newsCfg.apiKey, fixtureFallback);
  }

  if (newsCfg.provider === "google-rss" || newsCfg.provider === "google-news-rss") {
    return new GoogleNewsRssAdapter(fixtureFallback);
  }

  if (newsCfg.provider === "fixture") {
    if (isProductionRuntime() && !allowFixture) {
      return new GoogleNewsRssAdapter();
    }
    return new FixtureNewsAdapter();
  }

  if (isProductionRuntime() && !allowFixture) {
    return new DisabledNewsAdapter();
  }

  return new FixtureNewsAdapter();
}

export async function searchNews(query: NewsSearchQuery): Promise<NewsSearchResult> {
  return createNewsAdapter().search(query);
}

export function getFixtureArticle(id: string): NewsArticle | undefined {
  return (fixtureArticles as NewsArticle[]).find((a) => a.id === id);
}

export function listFixtureArticles(): NewsArticle[] {
  return fixtureArticles as NewsArticle[];
}
