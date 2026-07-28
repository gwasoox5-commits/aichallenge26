import type { NewsArticle, NewsSearchQuery, NewsSearchResult } from "./types";
import { IntegrationError } from "@/lib/integrations/errors";
import type { NewsAdapter } from "./news-adapter";
import {
  buildGoogleNewsRssAttempts,
  buildGoogleNewsRssUrl,
  isLikelyRssXml,
  parseGoogleNewsRss,
  rssRequestHeaders,
  stableGoogleRssArticleId,
  stripHtmlToPlainText,
} from "./google-news-rss";

export class GoogleNewsRssAdapter implements NewsAdapter {
  readonly name = "google-news-rss";

  constructor(private readonly devFallback?: NewsAdapter) {}

  private async fetchRss(queryText: string, locale: { hl: string; gl: string; ceid: string }, limit: number, keywords: string[]) {
    const url = buildGoogleNewsRssUrl(queryText, locale);
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: rssRequestHeaders(locale),
    });
    if (!res.ok) {
      throw new IntegrationError("PROVIDER_UNAVAILABLE", {
        message: `Google News RSS HTTP ${res.status}`,
      });
    }

    const xml = await res.text();
    if (!isLikelyRssXml(xml)) {
      return [];
    }
    const parsed = parseGoogleNewsRss(xml);
    const fetchedAt = new Date().toISOString();

    return parsed.slice(0, limit).map((item, index) => {
      const summary = stripHtmlToPlainText(item.description);
      const normalizedSummary =
        summary && summary !== item.title && !item.title.includes(summary) ? summary : undefined;

      return {
        id: stableGoogleRssArticleId(item.link, index),
        title: item.title,
        summary: normalizedSummary ?? "",
        source: item.source ?? "Google News",
        publishedAt: new Date(item.pubDate).toISOString(),
        url: item.link,
        keywords,
        provider: this.name,
        language: locale.hl,
        query: queryText,
        fetchedAt,
        bodyStatus: normalizedSummary ? ("SNIPPET_ONLY" as const) : ("METADATA_ONLY" as const),
        contentSource: normalizedSummary ? ("SEARCH_SNIPPET" as const) : ("TITLE_ONLY" as const),
      };
    }) satisfies NewsArticle[];
  }

  async search(query: NewsSearchQuery): Promise<NewsSearchResult> {
    const limit = query.limit ?? 10;
    const attempts = buildGoogleNewsRssAttempts(query.keywords);
    const seen = new Set<string>();
    const merged: NewsArticle[] = [];

    try {
      for (const attempt of attempts) {
        const articles = await this.fetchRss(attempt.query, attempt.locale, limit, query.keywords);
        for (const article of articles) {
          if (seen.has(article.url)) continue;
          seen.add(article.url);
          merged.push(article);
          if (merged.length >= limit) break;
        }
        if (merged.length >= limit) break;
      }

      return {
        articles: merged,
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
