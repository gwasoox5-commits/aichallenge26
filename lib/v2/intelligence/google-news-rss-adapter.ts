import type { NewsArticle, NewsSearchQuery, NewsSearchResult } from "./types";
import { IntegrationError } from "@/lib/integrations/errors";
import type { NewsAdapter } from "./news-adapter";
import {
  buildGoogleNewsRssAttempts,
  buildGoogleNewsRssUrl,
  parseGoogleNewsRss,
  stableGoogleRssArticleId,
} from "./google-news-rss";

const RSS_USER_AGENT = "Mozilla/5.0 (compatible; BSP-Intelligence/1.0)";

export class GoogleNewsRssAdapter implements NewsAdapter {
  readonly name = "google-news-rss";

  constructor(private readonly devFallback?: NewsAdapter) {}

  private async fetchRss(queryText: string, locale: { hl: string; gl: string; ceid: string }, limit: number, keywords: string[]) {
    const url = buildGoogleNewsRssUrl(queryText, locale);
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: {
        "User-Agent": RSS_USER_AGENT,
        Accept: "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
      },
    });
    if (!res.ok) {
      throw new IntegrationError("PROVIDER_UNAVAILABLE", {
        message: `Google News RSS HTTP ${res.status}`,
      });
    }

    const xml = await res.text();
    const parsed = parseGoogleNewsRss(xml);
    const fetchedAt = new Date().toISOString();

    return parsed.slice(0, limit).map((item, index) => ({
      id: stableGoogleRssArticleId(item.link, index),
      title: item.title,
      summary: item.description,
      source: item.source ?? "Google News",
      publishedAt: new Date(item.pubDate).toISOString(),
      url: item.link,
      keywords,
      provider: this.name,
      language: locale.hl,
      query: queryText,
      fetchedAt,
      bodyStatus: item.description ? ("SNIPPET_ONLY" as const) : ("METADATA_ONLY" as const),
      contentSource: item.description ? ("SEARCH_SNIPPET" as const) : ("TITLE_ONLY" as const),
    })) satisfies NewsArticle[];
  }

  async search(query: NewsSearchQuery): Promise<NewsSearchResult> {
    const limit = query.limit ?? 10;
    const attempts = buildGoogleNewsRssAttempts(query.keywords);

    try {
      for (const attempt of attempts) {
        const articles = await this.fetchRss(attempt.query, attempt.locale, limit, query.keywords);
        if (articles.length > 0) {
          return {
            articles,
            provider: this.name,
            usedFixture: false,
            fetchedAt: new Date().toISOString(),
          };
        }
      }

      return {
        articles: [],
        provider: this.name,
        usedFixture: false,
        fetchedAt: new Date().toISOString(),
      };
    } catch (e) {
      if (!this.devFallback) {
        if (e instanceof IntegrationError) throw e;
        throw new IntegrationError("PROVIDER_UNAVAILABLE", { cause: e });
      }
      const fallback = await this.devFallback.search(query);
      return {
        ...fallback,
        degraded: true,
        errorMessage: e instanceof Error ? e.message : "Google News RSS unavailable",
      };
    }
  }

  async healthCheck() {
    const started = Date.now();
    try {
      const result = await this.search({ keywords: ["economy"], limit: 1, language: "en" });
      return { ok: result.articles.length > 0, latencyMs: Date.now() - started, mode: "LIVE" as const };
    } catch {
      return { ok: false, latencyMs: Date.now() - started, mode: "ERROR" as const };
    }
  }
}
