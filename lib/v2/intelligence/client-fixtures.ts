/** Client-safe fixture re-exports for demo mode (no live API) */
import articles from "@/tests/fixtures/v2/news-articles.fixture.json";
import analysisBase from "@/tests/fixtures/v2/news-analysis.fixture.json";
import scenariosData from "@/tests/fixtures/v2/intelligence-scenarios.fixture.json";
import consultantData from "@/tests/fixtures/v2/consultant-output.fixture.json";
import type {
  ConsultantOutput,
  IntelligenceScenario,
  NewsAnalysis,
  NewsArticle,
  NewsSourceCitation,
} from "./types";
import type { ScenarioKey } from "@/lib/v2/event-studio/types";
import { toExplainability } from "./economy-mapper";
import { scoreScenarioQuality } from "./quality-scorer";

export const DEMO_ARTICLES = articles as NewsArticle[];

export function demoSearch(keywords: string): NewsArticle[] {
  const kws = keywords
    .split(",")
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean);
  if (kws.length === 0) return DEMO_ARTICLES;
  return DEMO_ARTICLES.filter((a) => {
    const hay = [a.title, a.summary, ...(a.keywords ?? [])].join(" ").toLowerCase();
    return kws.some((k) => hay.includes(k));
  });
}

function citationsFrom(articles: NewsArticle[]): NewsSourceCitation[] {
  return articles.map((a) => ({
    articleId: a.id,
    title: a.title,
    outlet: a.source,
    publishedAt: a.publishedAt,
    url: a.url,
  }));
}

export function demoAnalysis(selected: NewsArticle[]): NewsAnalysis {
  const base = analysisBase as Omit<NewsAnalysis, "citations">;
  return { ...base, citations: citationsFrom(selected), promptVersion: "v1.1" };
}

export function demoScenarios(): IntelligenceScenario[] {
  const data = scenariosData as {
    scenarios: Record<
      ScenarioKey,
      {
        label: string;
        description: string;
        assumptions: string[];
        expectedOutcomes: string[];
        effects: Parameters<typeof toExplainability>[0][];
      }
    >;
  };
  return (["pessimistic", "neutral", "optimistic"] as ScenarioKey[]).map((key) => {
    const s = data.scenarios[key];
    return {
      scenarioKey: key,
      label: s.label,
      description: s.description,
      assumptions: s.assumptions,
      expectedOutcomes: s.expectedOutcomes,
      variableImpacts: s.effects.map((e) => toExplainability(e)),
    };
  });
}

export function demoConsultant(): ConsultantOutput {
  return { ...(consultantData as ConsultantOutput), gmOnly: true, promptVersion: "v1.1" };
}

export function demoQuality(analysis: NewsAnalysis, scenarios: IntelligenceScenario[]) {
  return scoreScenarioQuality(analysis, scenarios);
}
