/** V2.3 Real-world Intelligence — domain types */



import type { EffectMode, ScenarioKey, StudioVariableKey } from "@/lib/v2/event-studio/types";



export type ConfidenceLevel = "LOW" | "MEDIUM" | "HIGH";



export type IntelligenceStatus = "DRAFT" | "ANALYZED" | "SCENARIOS" | "PREVIEW" | "SAVED";



export type PromptVersion = "v1.0" | "v1.1" | "v1.2";



export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  source: string;
  publishedAt: string;
  url: string;
  keywords?: string[];
  provider?: string;
  language?: string;
  imageUrl?: string;
  query?: string;
  fetchedAt?: string;
  bodyStatus?: "FULL_TEXT" | "SNIPPET_ONLY" | "METADATA_ONLY" | "FETCH_FAILED";
  contentSource?: "FULL_ARTICLE" | "SEARCH_SNIPPET" | "TITLE_ONLY";
}



export interface NewsSearchQuery {

  keywords: string[];

  language?: string;

  fromDate?: string;

  limit?: number;

}



export interface NewsSearchResult {
  articles: NewsArticle[];
  provider: string;
  usedFixture: boolean;
  degraded?: boolean;
  errorMessage?: string;
  note?: string;
  cacheHit?: boolean;
  fetchedAt?: string;
}



export interface NewsSourceCitation {

  articleId: string;

  title: string;

  outlet: string;

  publishedAt: string;

  url: string;

}



export interface NewsAnalysis {

  eventSummary: string;

  keyIssues: string[];

  supplyChainImpact: string;

  productionImpact: string;

  salesImpact: string;

  financialImpact: string;

  riskFactors: string[];

  opportunityFactors: string[];

  citations: NewsSourceCitation[];

  promptVersion: PromptVersion;

  isEstimate: boolean;

  confidenceLabel: ConfidenceLevel;
  contentSource?: "FULL_ARTICLE" | "SEARCH_SNIPPET" | "TITLE_ONLY";
  groundingNotes?: Array<{
    claim: string;
    evidenceType: "SOURCE_FACT" | "MODEL_INFERENCE" | "ASSUMPTION" | "SIMULATION_DESIGN";
    sourceIds?: string[];
    confidence?: ConfidenceLevel;
  }>;
}



export interface VariableImpactExplainability {

  key: StudioVariableKey;

  mode: EffectMode;

  proposedValue: number;

  clampedValue: number;

  allowedMin: number;

  allowedMax: number;

  reason: string;

  confidence: ConfidenceLevel;

  assumption: string;
  isEstimate: boolean;
  evidenceType?: "SOURCE_FACT" | "MODEL_INFERENCE" | "ASSUMPTION" | "SIMULATION_DESIGN";
  sourceIds?: string[];
  lowAccuracyWarning?: string;
}



export interface IntelligenceScenario {

  scenarioKey: ScenarioKey;

  label: string;

  description: string;

  assumptions: string[];

  variableImpacts: VariableImpactExplainability[];

  expectedOutcomes: string[];

}



export interface ConsultantOutput {

  coreRisks: string[];

  coreOpportunities: string[];

  mostAffectedDivision: string;

  productionImpact: string;

  supplyChainImpact: string;

  financialImpact: string;

  cashflowImpact: string;

  ceoReviewPriorities: string[];

  commonStudentMistakes: string[];

  instructorDiscussionQuestions: string[];

  debriefQuestions: string[];

  learningObjectives: string[];

  instructorComments: string;

  educationalCommentary: string;

  promptVersion: PromptVersion;

  gmOnly: true;

}



export interface ScenarioQualityScore {

  realism: number;

  logic: number;

  economicConsistency: number;

  educationValue: number;

  diversity: number;

  gameFit: number;

  overall: number;

  recommendRegenerate: boolean;

  notes: string[];

}



export interface IntelligencePreview {

  previewId: string;

  sessionId: string;

  articles: NewsArticle[];

  analysis?: NewsAnalysis;

  scenarios?: IntelligenceScenario[];

  consultant?: ConsultantOutput;

  quality?: ScenarioQualityScore;

  status: IntelligenceStatus;

  createdAt: string;

  updatedAt: string;

  createdBy: string;

}



/** V2.4 — publish payload; executed via /api/v2/intelligence/publish */

export interface IntelligencePublishIntent {

  previewId: string;

  selectedScenario: ScenarioKey;

  readyForV24: boolean;

  note: string;

  publishEndpoint: string;

}



export interface LibraryEntry {

  libraryId: string;

  preview: IntelligencePreview;

  title: string;

  favorite: boolean;

  tags: string[];

  createdAt: string;

  updatedAt: string;

}



export interface LibraryStoreSnapshot {

  entries: LibraryEntry[];

}



export interface IntelligenceSessionSnapshot {
  previews: IntelligencePreview[];
  /** Latest search results per session — keyed by article id */
  articleCache?: Record<string, Record<string, NewsArticle>>;
}



export interface AnalyzeArticlesInput {

  sessionId: string;

  articleIds: string[];

  articles?: NewsArticle[];

}



export interface GenerateScenariosInput {

  previewId: string;

  promptVersion?: PromptVersion;

}



export interface BuildPreviewInput {

  previewId: string;

  selectedScenario?: ScenarioKey;

}


