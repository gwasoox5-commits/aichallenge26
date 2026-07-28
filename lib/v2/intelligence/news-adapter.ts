import type { NewsArticle, NewsSearchQuery, NewsSearchResult } from "./types";

import fixtureArticles from "@/tests/fixtures/v2/news-articles.fixture.json";

import { IntegrationError } from "@/lib/integrations/errors";

import { isFixtureFallbackAllowed, isProductionRuntime } from "@/lib/bsp/runtime-config";

import { getNewsConfig } from "@/lib/integrations/config";



export interface NewsAdapter {

  readonly name: string;

  search(query: NewsSearchQuery): Promise<NewsSearchResult>;

  healthCheck?(): Promise<{ ok: boolean; latencyMs: number; mode: "LIVE" | "FIXTURE" | "NOT_CONFIGURED" | "DISABLED" | "ERROR" }>;

}



function normalizeKeywords(keywords: string[]): string[] {

  return keywords.map((k) => k.trim().toLowerCase()).filter(Boolean);

}



function scoreArticle(article: NewsArticle, keywords: string[]): number {

  const haystack = [

    article.title,

    article.summary,

    article.source,

    ...(article.keywords ?? []),

  ]

    .join(" ")

    .toLowerCase();

  return keywords.reduce((score, kw) => (haystack.includes(kw) ? score + 1 : score), 0);

}



/** Fixture adapter — development/test only unless BSP_ALLOW_FIXTURE=true */

export class FixtureNewsAdapter implements NewsAdapter {

  readonly name = "fixture";



  constructor(private readonly articles: NewsArticle[] = fixtureArticles as NewsArticle[]) {}



  async search(query: NewsSearchQuery): Promise<NewsSearchResult> {

    if (isProductionRuntime() && !isFixtureFallbackAllowed()) {

      throw new IntegrationError("PROVIDER_DISABLED", {

        message: "뉴스 Provider가 설정되지 않았습니다. GNews API Key를 설정하거나 수동 뉴스 입력을 사용하세요.",

      });

    }



    const keywords = normalizeKeywords(query.keywords);

    const limit = query.limit ?? 10;



    let matched = this.articles;

    if (keywords.length > 0) {

      matched = this.articles

        .map((a) => ({ article: a, score: scoreArticle(a, keywords) }))

        .filter((x) => x.score > 0)

        .sort((a, b) => b.score - a.score)

        .map((x) => x.article);

    }



    const articles = matched.slice(0, limit).map((a) => ({

      ...a,

      provider: this.name,

      fetchedAt: new Date().toISOString(),

      bodyStatus: "SNIPPET_ONLY" as const,

      contentSource: "SEARCH_SNIPPET" as const,

    }));



    return {

      articles,

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

      message: "뉴스 Provider가 설정되지 않았습니다. BSP_NEWS_PROVIDER=gnews 및 BSP_GNEWS_API_KEY를 설정하세요.",

    });

  }



  async healthCheck() {

    return { ok: false, latencyMs: 0, mode: "NOT_CONFIGURED" as const };

  }

}



/** GNews adapter — no silent fixture fallback in production */

export class GNewsAdapter implements NewsAdapter {

  readonly name = "gnews";



  constructor(

    private readonly apiKey: string,

    private readonly devFallback?: NewsAdapter

  ) {}



  async search(query: NewsSearchQuery): Promise<NewsSearchResult> {

    try {

      const q = encodeURIComponent(query.keywords.join(" "));

      const url = `https://gnews.io/api/v4/search?q=${q}&lang=${query.language ?? "ko"}&max=${query.limit ?? 10}&apikey=${this.apiKey}`;

      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });

      if (!res.ok) throw new Error(`GNews HTTP ${res.status}`);

      const body = (await res.json()) as {

        articles?: Array<{ title: string; description: string; url: string; publishedAt: string; source?: { name?: string } }>;

      };

      const articles: NewsArticle[] = (body.articles ?? []).map((a, i) => ({

        id: `gnews-${i}-${Date.now()}`,

        title: a.title,

        summary: a.description ?? "",

        source: a.source?.name ?? "GNews",

        publishedAt: a.publishedAt,

        url: a.url,

        keywords: query.keywords,

        provider: this.name,

        language: query.language ?? "ko",

        query: query.keywords.join(" "),

        fetchedAt: new Date().toISOString(),

        bodyStatus: a.description ? "SNIPPET_ONLY" : "METADATA_ONLY",

        contentSource: a.description ? "SEARCH_SNIPPET" : "TITLE_ONLY",

      }));

      return { articles, provider: this.name, usedFixture: false, fetchedAt: new Date().toISOString() };

    } catch (e) {

      if (isProductionRuntime() && !isFixtureFallbackAllowed()) {

        throw new IntegrationError("PROVIDER_UNAVAILABLE", {

          message: "GNews 호출에 실패했습니다. Fixture로 대체하지 않습니다.",

          cause: e,

        });

      }

      if (!this.devFallback) {

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



  if (newsCfg.provider === "gnews" && newsCfg.apiKey) {

    const fallback = allowFixture || !isProductionRuntime() ? new FixtureNewsAdapter() : undefined;

    return new GNewsAdapter(newsCfg.apiKey, fallback);

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


