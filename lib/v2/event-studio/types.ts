/** V2.1a Event Scenario Studio — domain types */

import type { EventApplyTiming, EventCategory, EventScheduleTarget, EconomyPatchEffect } from "@/src/bsp/domain/events/event-types";

export type StudioVariableKey =
  | "interestRate"
  | "exchangeRate"
  | "rawMaterialCost"
  | "logisticsCost"
  | "tariff"
  | "demand"
  | "marketGrowth"
  | "inflation"
  | "competitionIntensity"
  | "energyCost"
  | "esgCost"
  | "carbonTax"
  | "governmentSupport"
  | "businessCycleIndex";

export type EffectMode = "ABSOLUTE" | "DELTA" | "PERCENT" | "MULTIPLY";

export type ScenarioKey = "pessimistic" | "neutral" | "optimistic";

export type DraftStatus =
  | "DRAFT"
  | "GENERATED"
  | "REVIEWED"
  | "SCHEDULED"
  | "SELECTED"
  | "PUBLISHED"
  | "APPLIED"
  | "EXPIRED"
  | "CANCELLED";

export type SelectionMode = "MANUAL" | "EQUAL_RANDOM" | "WEIGHTED_RANDOM";

export type NewsDisplayMode = "HEADLINE_ONLY" | "DIRECTIONAL" | "DETAILED";

export type NewsSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface StudioVariableEffect {
  key: StudioVariableKey;
  mode: EffectMode;
  value: number;
  unit?: string;
  rationale: string;
  isEstimate?: boolean;
}

export interface ScenarioOutlook {
  label: string;
  narrative: string;
  rationale: string;
  discussionQuestions: string[];
  newsHeadline: string;
  newsArticleBody: string;
  severity: NewsSeverity;
}

export interface ScenarioOutcome {
  scenarioKey: ScenarioKey;
  outlook: ScenarioOutlook;
  effects: StudioVariableEffect[];
  mappedEngineEffects: EconomyPatchEffect[];
}

export interface EventScenarioStudioOutput {
  meta: {
    title: string;
    summary: string;
    category: string;
    confidenceLabel: "HIGH" | "MEDIUM" | "LOW";
    isEstimate: boolean;
    sourcePromptHash?: string;
    targetIndustry?: string;
    targetMarketOrRegion?: string;
    expectedDuration?: string;
    targetPeriodLabel?: string;
    analysisIntensity?: "LIGHT" | "STANDARD" | "DEEP";
  };
  assumptions: string[];
  impactPathways: Array<{ path: string; affectedSteps: string[] }>;
  scenarios: Record<ScenarioKey, ScenarioOutlook>;
  uncertainty: { caveats: string[]; educationDisclaimer: string };
  economyVariableChanges: Record<ScenarioKey, { effects: StudioVariableEffect[] }>;
}

export interface EventStudioInput {
  naturalLanguagePrompt: string;
  targetIndustry: string;
  targetMarketOrRegion: string;
  expectedDuration: string;
  targetHalfLabel: string;
  analysisIntensity: "LIGHT" | "STANDARD" | "DEEP";
  economySnapshotId?: string;
}

export interface ScenarioWeights {
  pessimistic: number;
  neutral: number;
  optimistic: number;
}

export interface ScenarioSelection {
  mode: SelectionMode;
  weights?: ScenarioWeights;
  randomSeed: string;
  selectedOutcome: ScenarioKey;
  selectedBy: string;
  selectedAt: string;
  sessionId: string;
}

export interface PublishSchedule {
  applyTiming: EventApplyTiming;
  scheduledFor?: EventScheduleTarget;
  displayMode: NewsDisplayMode;
  reason: string;
}

export interface NewsPublication {
  newsId: string;
  draftId: string;
  sessionId: string;
  headline: string;
  summary: string;
  articleBody: string;
  category: string;
  severity: NewsSeverity;
  displayMode: NewsDisplayMode;
  publishedAt: string | null;
  effectiveAt: string;
  duration?: string;
  affectedAreas: string[];
  selectedScenario: ScenarioKey;
  simulationEventId?: string;
  patchSequence?: number;
}

export interface CustomEventRef {
  eventId: string;
  draftId: string;
  templateId: string;
  title: string;
  category: EventCategory;
  generatedFromPrompt?: string;
  approvedBy?: string;
  approvedAt?: string;
}

export interface EventAcknowledgement {
  id: string;
  newsId: string;
  sessionId: string;
  companyId: string;
  userId: string;
  acknowledgedAt: string;
}

export interface BoundsClampWarning {
  engineKey: string;
  proposedValue: number;
  clampedValue: number;
  min: number;
  max: number;
  reason: string;
}

export interface ApproveResult {
  simulationEventId: string;
  newsId: string;
  patchSequence?: number;
  status: "ACTIVE" | "SCHEDULED";
  idempotencyKey?: string;
}

export interface EventScenarioDraft {
  draftId: string;
  sessionId: string;
  status: DraftStatus;
  input: EventStudioInput;
  studioOutput?: EventScenarioStudioOutput;
  outcomes?: Record<ScenarioKey, ScenarioOutcome>;
  selection?: ScenarioSelection;
  schedule?: PublishSchedule;
  newsPublication?: NewsPublication;
  customEvent?: CustomEventRef;
  simulationEventId?: string;
  patchSequence?: number;
  boundsWarnings?: BoundsClampWarning[];
  idempotencyResults: Record<string, ApproveResult>;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  cancelledAt?: string;
  cancelReason?: string;
}

export interface MappedScenarioPreview {
  engineEffects: EconomyPatchEffect[];
  boundsWarnings: BoundsClampWarning[];
}

export interface DraftStoreSnapshot {
  drafts: EventScenarioDraft[];
  news: NewsPublication[];
  acknowledgements: EventAcknowledgement[];
  pendingNewsByEventId: Record<string, string>;
}
