import type { NewsArticle, NewsSearchQuery, NewsSearchResult } from "@/lib/v2/intelligence/types";
import { getNewsConfig } from "../config";
import { IntegrationError } from "../errors";
import { cacheKey, getCache, setCache, CACHE_TTL } from "../cache";
import { recordProviderCall } from "../usage-store";

export interface NewsProvider {
  readonly name: string;
  searchNews(query: NewsSearchQuery): Promise<NewsSearchResult>;
  getArticle?(id: string): Promise<NewsArticle | null>;
  healthCheck(): Promise<{ ok: boolean; latencyMs: number; mode: "LIVE" | "MOCK" }>;
}

function dedupeArticles(articles: NewsArticle[]): NewsArticle[] {
  const seen = new Set<string>();
  return articles.filter((a) => {
    const key = `${a.url}|${a.title}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function sortByDate(articles: NewsArticle[]): NewsArticle[] {
  return [...articles].sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
}

export { FixtureNewsAdapter, GNewsAdapter, createNewsAdapter, searchNews } from "@/lib/v2/intelligence/news-adapter";

export async function searchNewsWithCache(query: NewsSearchQuery): Promise<NewsSearchResult> {
  const { searchNews } = await import("@/lib/v2/intelligence/news-adapter");
  const ck = cacheKey({ provider: getNewsConfig().provider, query });
  const cached = getCache<NewsSearchResult>(ck);
  if (cached.hit) return { ...cached.value, cacheHit: true };

  const started = Date.now();
  try {
    const result = await searchNews(query);
    const articles = sortByDate(dedupeArticles(result.articles)).map((a) => ({
      ...a,
      fetchedAt: new Date().toISOString(),
      bodyStatus: a.bodyStatus ?? (a.summary ? "SNIPPET_ONLY" : "METADATA_ONLY"),
      contentSource: a.contentSource ?? (a.summary ? "SEARCH_SNIPPET" : "TITLE_ONLY"),
    }));
    const enriched = { ...result, articles, fetchedAt: new Date().toISOString() };
    recordProviderCall(result.provider, !result.degraded, Date.now() - started, result.errorMessage);
    setCache(ck, enriched, CACHE_TTL.newsSearchMs);
    return enriched;
  } catch (e) {
    recordProviderCall(getNewsConfig().provider, false, Date.now() - started, e instanceof IntegrationError ? e.code : "NETWORK_ERROR");
    throw e;
  }
}
