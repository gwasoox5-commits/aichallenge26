/** V3.0 World Simulation Engine — domain types */

import type { ScenarioKey } from "@/lib/v2/event-studio/types";

/** 10 macro world dimensions (0–100) */
export type WorldDimensionKey =
  | "globalGrowth"
  | "inflation"
  | "interestRateTrend"
  | "supplyStability"
  | "energyPrice"
  | "technologyInnovation"
  | "consumerConfidence"
  | "geopoliticalTension"
  | "climateRisk"
  | "tradeEnvironment";

export type WorldDimensionValues = Record<WorldDimensionKey, number>;

export type WorldProfileId =
  | "STABLE_GROWTH"
  | "HIGH_INFLATION"
  | "AI_BOOM"
  | "RECESSION"
  | "TRADE_WAR"
  | "ENERGY_CRISIS"
  | "CLIMATE_TRANSITION"
  | "CUSTOM";

export type WorldRegionId =
  | "NORTH_AMERICA"
  | "EUROPE"
  | "CHINA"
  | "KOREA"
  | "SOUTHEAST_ASIA";

export type IndustryId =
  | "AUTOMOTIVE"
  | "SEMICONDUCTOR"
  | "BATTERY"
  | "STEEL"
  | "CHEMICAL"
  | "CONSUMER";

export interface RegionalState {
  regionId: WorldRegionId;
  label: string;
  growth: number;
  stability: number;
  tradeOpenness: number;
  riskLevel: number;
}

export interface IndustryState {
  industryId: IndustryId;
  label: string;
  demandIndex: number;
  costPressure: number;
  innovationIndex: number;
  impactMultiplier: number;
}

export interface WorldState {
  dimensions: WorldDimensionValues;
  regions: RegionalState[];
  industries: IndustryState[];
  updatedAt: string;
  periodLabel: string;
  periodIndex: number;
}

export interface WorldProfile {
  id: WorldProfileId;
  label: string;
  description: string;
  initialDimensions: WorldDimensionValues;
  educationalFocus?: string[];
  chainTemplateIds?: string[];
}

export interface ChainProbability {
  nodeId: string;
  label: string;
  probability: number;
  gmOverride?: number;
  parentNodeId?: string;
}

export interface EventChainNodeV3 {
  nodeId: string;
  label: string;
  description: string;
  triggerCondition: string;
  probability: number;
  gmProbability?: number;
  parentNodeId?: string;
  childNodeIds: string[];
  status: "PLANNED" | "PROPOSED" | "APPROVED" | "PUBLISHED" | "SKIPPED" | "DISABLED";
  proposalId?: string;
  publishId?: string;
  economyEffects?: Array<{ key: string; mode: "DELTA" | "PERCENT"; value: number }>;
}

export interface WorldEventChain {
  chainId: string;
  sessionId: string;
  templateId: string;
  label: string;
  rootNodeId: string;
  nodes: EventChainNodeV3[];
  probabilities: ChainProbability[];
  createdAt: string;
  randomSeed: string;
}

export interface WorldTimelineEntry {
  id: string;
  sessionId: string;
  periodLabel: string;
  periodIndex: number;
  eventLabel: string;
  eventType: "EVOLUTION" | "CHAIN" | "DIRECTOR" | "GM_OVERRIDE" | "FORECAST";
  detail?: string;
  timestamp: string;
}

export interface ForecastHorizon {
  periodsAhead: 1 | 2 | 3;
  label: string;
  predictions: Array<{
    dimension: WorldDimensionKey;
    direction: "UP" | "DOWN" | "STABLE";
    probability: number;
    summary: string;
  }>;
}

export interface WorldForecast {
  sessionId: string;
  generatedAt: string;
  horizons: ForecastHorizon[];
  gmOnly: true;
  promptVersion: string;
}

export type DirectorAction =
  | "INCREASE_DIFFICULTY"
  | "RECOVERY_EVENT"
  | "BUFFER_EVENT"
  | "MAINTAIN";

export interface DirectorSuggestion {
  action: DirectorAction;
  reason: string;
  confidence: number;
  suggestedEventLabel: string;
  educationalRationale: string;
  gmOnly: true;
}

export interface EducationalBalanceConfig {
  focusAreas: string[];
  supplyChainWeight: number;
  financialWeight: number;
  innovationWeight: number;
  esgWeight: number;
}

export interface WorldEvolutionProposal {
  proposalId: string;
  sessionId: string;
  periodLabel: string;
  periodIndex: number;
  source: "AI_EVOLUTION" | "EVENT_CHAIN" | "GAME_DIRECTOR" | "GM_MANUAL";
  title: string;
  summary: string;
  narrative: string;
  selectedScenario: ScenarioKey;
  chainNodeId?: string;
  directorAction?: DirectorAction;
  status: "DRAFT" | "PENDING_GM" | "APPROVED" | "REJECTED" | "PUBLISHED";
  economyImpacts: Array<{
    key: string;
    mode: "DELTA" | "PERCENT";
    value: number;
    rationale: string;
    confidence: "LOW" | "MEDIUM" | "HIGH";
  }>;
  worldImpact: Partial<WorldDimensionValues>;
  industryImpacts?: Partial<Record<IndustryId, number>>;
  regionImpacts?: Partial<Record<WorldRegionId, number>>;
  gmOnly: true;
  isEstimate: true;
  createdAt: string;
  approvedAt?: string;
  approvedBy?: string;
  publishId?: string;
}

export interface WorldSessionRecord {
  sessionId: string;
  profileId: WorldProfileId;
  customProfile?: Partial<WorldDimensionValues>;
  randomSeed: string;
  currentState: WorldState;
  previousStates: WorldState[];
  activeChains: WorldEventChain[];
  proposals: WorldEvolutionProposal[];
  timeline: WorldTimelineEntry[];
  latestForecast?: WorldForecast;
  latestDirector?: DirectorSuggestion;
  educationalBalance: EducationalBalanceConfig;
  createdAt: string;
  updatedAt: string;
}

export interface WorldStoreSnapshot {
  sessions: WorldSessionRecord[];
}

export interface EvolutionContext {
  sessionId: string;
  periodLabel: string;
  periodIndex: number;
  economy: Record<string, number>;
  teamSummary: {
    avgCash: number;
    avgNetIncome: number;
    submitRate: number;
    strugglingTeams: number;
    totalTeams: number;
  };
  activeEventCount: number;
  recentProposalCount: number;
}

export interface ReplayWorldConfig {
  sessionId: string;
  sourceSessionId: string;
  randomSeed: string;
  profileId: WorldProfileId;
  initialState: WorldState;
}
