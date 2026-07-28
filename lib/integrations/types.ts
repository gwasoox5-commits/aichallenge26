export type ArticleBodyStatus = "FULL_TEXT" | "SNIPPET_ONLY" | "METADATA_ONLY" | "FETCH_FAILED";

export type ContentSourceKind = "FULL_ARTICLE" | "SEARCH_SNIPPET" | "TITLE_ONLY";

export type EvidenceType = "SOURCE_FACT" | "MODEL_INFERENCE" | "ASSUMPTION" | "SIMULATION_DESIGN";

export type AiFeature =
  | "intelligence_analyze"
  | "intelligence_scenarios"
  | "intelligence_consultant"
  | "event_studio_generate"
  | "world_evolution"
  | "debrief_generate"
  | "integration_health";

export type AiResultStatus = "success" | "fixture" | "fallback" | "failed";

export interface AiCallRecord {
  id: string;
  requestId: string;
  correlationId: string;
  feature: AiFeature;
  sessionId?: string;
  userRole?: string;
  model: string;
  promptVersion?: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  latencyMs: number;
  success: boolean;
  resultStatus: AiResultStatus;
  retryCount: number;
  cacheHit: boolean;
  idempotencyKey?: string;
  errorCode?: string;
  createdAt: string;
}

export interface ProviderHealthSnapshot {
  name: string;
  configured: boolean;
  enabled: boolean;
  mode: "LIVE" | "FIXTURE" | "FALLBACK" | "DISABLED" | "NOT_CONFIGURED" | "ERROR" | "MOCK";
  lastSuccessAt?: string;
  lastFailureAt?: string;
  lastErrorCode?: string;
  avgLatencyMs?: number;
  recentFailures: number;
}

export interface IntegrationHealthResponse {
  checkedAt: string;
  openai: ProviderHealthSnapshot;
  news: ProviderHealthSnapshot;
  externalData: ProviderHealthSnapshot;
}

export interface UsageSummary {
  todayCalls: number;
  todayTokens: number;
  todayFailures: number;
  avgLatencyMs: number;
  byFeature: Record<string, { calls: number; tokens: number; failures: number }>;
  bySession: Record<string, number>;
  estimatedCostUsd?: number;
}
