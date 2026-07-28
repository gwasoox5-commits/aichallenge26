import type { NewsAnalysis, NewsArticle, NewsSourceCitation, PromptVersion } from "./types";
import { CURRENT_PROMPT_VERSION, resolvePromptVersion } from "./prompt-registry";
import analysisFixture from "@/tests/fixtures/v2/news-analysis.fixture.json";
import analysisSchema from "@/docs/integrations/schemas/intelligence-analysis.schema.json";
import { getOpenAiConfig } from "@/lib/integrations/config";
import { callOpenAiStructured } from "@/lib/integrations/openai-client";
import { IntegrationError } from "@/lib/integrations/errors";
import { cacheKey, getCache, setCache, CACHE_TTL } from "@/lib/integrations/cache";
import type { ContentSourceKind } from "@/lib/integrations/types";
import { normalizeIntelligenceAnalysis } from "./normalize-analysis-output";
import { KOREAN_OUTPUT_INSTRUCTIONS } from "./korean-output";

export interface AnalysisMeta {
  model: string;
  responseId: string;
  requestId?: string;
  correlationId?: string;
  tokensUsed: number;
  latencyMs: number;
  usedFixture: boolean;
  promptVersion: PromptVersion;
  retryCount?: number;
  resultStatus: "success" | "fixture" | "fallback" | "failed";
  cacheHit?: boolean;
  contentSource?: ContentSourceKind;
}

export interface AnalysisResult {
  analysis: NewsAnalysis;
  meta: AnalysisMeta;
}

function toCitations(articles: NewsArticle[]): NewsSourceCitation[] {
  return articles.map((a) => ({
    articleId: a.id,
    title: a.title,
    outlet: a.source,
    publishedAt: a.publishedAt,
    url: a.url,
  }));
}

function inferContentSource(articles: NewsArticle[]): ContentSourceKind {
  const statuses = articles.map((a) => a.bodyStatus ?? "SNIPPET_ONLY");
  if (statuses.every((s) => s === "FULL_TEXT")) return "FULL_ARTICLE";
  if (statuses.every((s) => s === "METADATA_ONLY" || s === "FETCH_FAILED")) return "TITLE_ONLY";
  return "SEARCH_SNIPPET";
}

function buildAnalysisPrompt(articles: NewsArticle[], promptVersion: PromptVersion, contentSource: ContentSourceKind): string {
  const content = articles
    .map((a) => `[${a.id}] ${a.title} (${a.source})\nSummary: ${a.summary || "(none)"}\nURL: ${a.url}`)
    .join("\n\n");
  return [
    "You are an educational business simulation analyst for Korean instructors.",
    KOREAN_OUTPUT_INSTRUCTIONS,
    `Prompt version: ${promptVersion}`,
    `Content available: ${contentSource}. Do NOT claim full article analysis if only title/snippet provided.`,
    "Analyze news for supply chain, production, sales, and financial impacts.",
    "Mark uncertain items as estimates. Distinguish SOURCE_FACT vs MODEL_INFERENCE vs ASSUMPTION.",
    "Articles:",
    content,
  ].join("\n");
}

function fromFixture(articles: NewsArticle[], promptVersion: PromptVersion, contentSource: ContentSourceKind): AnalysisResult {
  const base = analysisFixture as Omit<NewsAnalysis, "citations" | "promptVersion" | "contentSource">;
  return {
    analysis: {
      ...base,
      citations: toCitations(articles),
      promptVersion,
      contentSource,
    },
    meta: {
      model: "fixture",
      responseId: "fixture-v2.3-analysis",
      tokensUsed: 0,
      latencyMs: 0,
      usedFixture: true,
      promptVersion,
      resultStatus: "fixture",
      contentSource,
    },
  };
}

/** OpenAI Responses API with structured output; fixture only when unconfigured */
export async function analyzeNewsArticles(
  articles: NewsArticle[],
  promptVersionInput?: string,
  opts?: { sessionId?: string; userRole?: string; idempotencyKey?: string }
): Promise<AnalysisResult> {
  const started = Date.now();
  const promptVersion = resolvePromptVersion(promptVersionInput);
  const cfg = getOpenAiConfig();
  const contentSource = inferContentSource(articles);

  if (!cfg.configured) {
    return fromFixture(articles, promptVersion, contentSource);
  }
  if (!cfg.enabled) {
    throw new IntegrationError("PROVIDER_DISABLED");
  }

  const ck = cacheKey({ fn: "analyze", articles: articles.map((a) => a.id), promptVersion });
  const cached = getCache<AnalysisResult>(ck);
  if (cached.hit) {
    return {
      ...cached.value,
      meta: { ...cached.value.meta, cacheHit: true, latencyMs: Date.now() - started },
    };
  }

  const { data, meta } = await callOpenAiStructured<Partial<Omit<NewsAnalysis, "citations" | "promptVersion">>>({
    feature: "intelligence_analyze",
    input: buildAnalysisPrompt(articles, promptVersion, contentSource),
    schema: analysisSchema as Record<string, unknown>,
    schemaName: "IntelligenceAnalysis",
    promptVersion,
    sessionId: opts?.sessionId,
    userRole: opts?.userRole,
    idempotencyKey: opts?.idempotencyKey,
  });

  const normalized = normalizeIntelligenceAnalysis(data, contentSource);

  const result: AnalysisResult = {
    analysis: {
      ...normalized,
      citations: toCitations(articles),
      promptVersion,
    },
    meta: {
      model: meta.model,
      responseId: meta.responseId,
      requestId: meta.requestId,
      correlationId: meta.correlationId,
      tokensUsed: meta.totalTokens,
      latencyMs: meta.latencyMs,
      usedFixture: false,
      promptVersion,
      retryCount: meta.retryCount,
      resultStatus: "success",
      contentSource: normalized.contentSource,
    },
  };

  setCache(ck, result, CACHE_TTL.aiOptionalMs, promptVersion);
  return result;
}

export { CURRENT_PROMPT_VERSION };
