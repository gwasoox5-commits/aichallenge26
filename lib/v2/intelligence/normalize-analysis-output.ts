import type { NewsAnalysis } from "@/lib/v2/intelligence/types";
import type { ContentSourceKind } from "@/lib/integrations/types";
import analysisFixture from "@/tests/fixtures/v2/news-analysis.fixture.json";

type AnalysisCore = Omit<NewsAnalysis, "citations" | "promptVersion">;

export function normalizeIntelligenceAnalysis(
  partial: Partial<AnalysisCore>,
  contentSource: ContentSourceKind
): AnalysisCore {
  const base = analysisFixture as Omit<NewsAnalysis, "citations" | "promptVersion" | "contentSource">;
  return {
    eventSummary: partial.eventSummary ?? base.eventSummary,
    keyIssues: partial.keyIssues?.length ? partial.keyIssues : base.keyIssues,
    supplyChainImpact: partial.supplyChainImpact ?? base.supplyChainImpact,
    productionImpact: partial.productionImpact ?? base.productionImpact,
    salesImpact: partial.salesImpact ?? base.salesImpact,
    financialImpact: partial.financialImpact ?? base.financialImpact,
    riskFactors: partial.riskFactors?.length ? partial.riskFactors : base.riskFactors,
    opportunityFactors: partial.opportunityFactors?.length ? partial.opportunityFactors : base.opportunityFactors,
    isEstimate: partial.isEstimate ?? base.isEstimate ?? true,
    confidenceLabel: partial.confidenceLabel ?? base.confidenceLabel ?? "MEDIUM",
    contentSource: partial.contentSource ?? contentSource,
    groundingNotes: partial.groundingNotes ?? [],
  };
}
