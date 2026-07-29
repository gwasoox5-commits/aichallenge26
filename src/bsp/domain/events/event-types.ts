import type { BspGameStep, BspHalf, BspStepPhase, EconomyValues } from "../types";
import type { LearnerEventImpact, LearnerPeriodImpact } from "../economy/learner-economy-impact";

export type EventCategory =
  | "환율"
  | "금리"
  | "원자재"
  | "공급망"
  | "관세"
  | "경쟁사"
  | "정부정책"
  | "자연재해"
  | "전쟁"
  | "탄소세"
  | "ESG"
  | "팬데믹"
  | "기술혁신";

export type EffectMode = "ABSOLUTE" | "DELTA" | "PERCENT" | "MULTIPLY";

export interface EconomyPatchEffect {
  key: keyof EconomyValues;
  mode: EffectMode;
  value: number;
  unit?: string;
}

export type EventApplyTiming = "IMMEDIATE" | "NEXT_STEP" | "NEXT_HALF";

export type EventDuration = "INSTANT" | "PERIOD" | "N_PERIODS";

export type SimulationEventStatus = "SCHEDULED" | "ACTIVE" | "EXPIRED" | "CANCELLED";

export type EventDifficulty = "EASY" | "NORMAL" | "HARD";

export interface EventTemplate {
  eventId: string;
  title: string;
  description: string;
  category: EventCategory;
  educationPurpose: string;
  learningPoints: string[];
  discussionQuestions: string[];
  normalEffects: EconomyPatchEffect[];
  relatedSteps: BspGameStep[];
  severity: number;
  difficulty: EventDifficulty;
  tags: string[];
  recommendedPeriod: string[];
  avoidPeriod: string[];
  maxSeverityInAvoid: number;
  duration: EventDuration;
  durationPeriods?: number;
}

export interface EventScheduleTarget {
  year: number;
  half: BspHalf;
  stepPhase?: BspStepPhase;
}

export interface SimulationEvent {
  id: string;
  sessionId: string;
  templateId: string;
  title: string;
  description: string;
  category: EventCategory;
  educationPurpose: string;
  impactDescription: string;
  status: SimulationEventStatus;
  applyTiming: EventApplyTiming;
  appliedScenario: "NORMAL";
  resolvedEffects: EconomyPatchEffect[];
  relatedSteps: BspGameStep[];
  scheduledFor?: EventScheduleTarget;
  duration: EventDuration;
  durationPeriods?: number;
  periodsRemaining?: number;
  firedAt?: Date;
  expiredAt?: Date;
  patchSequence?: number;
  createdAt: Date;
  updatedAt: Date;
}

export type EventHistoryAction =
  | "EVENT_CREATED"
  | "EVENT_UPDATED"
  | "EVENT_FIRED"
  | "EVENT_SCHEDULED"
  | "EVENT_EXPIRED"
  | "EVENT_ENDED"
  | "ECONOMY_PATCH_APPLIED";

export interface EventHistoryEntry {
  id: string;
  sessionId: string;
  simulationEventId: string;
  templateId: string;
  action: EventHistoryAction;
  title: string;
  payload: Record<string, unknown>;
  occurredAt: Date;
}

export type EconomicPatchSource = "GM_MANUAL" | "EVENT_FIRE" | "EVENT_END" | "PRESET";

export interface EconomicPatchRecord {
  id: string;
  sessionId: string;
  sequence: number;
  source: EconomicPatchSource;
  simulationEventId?: string;
  effects: EconomyPatchEffect[];
  valuesBefore: EconomyValues;
  valuesAfter: EconomyValues;
  reason?: string;
  occurredAt: Date;
}

export interface SessionEconomyState {
  sessionId: string;
  liveValues: EconomyValues;
  periodOpenValues: EconomyValues;
  patchSequence: number;
  pendingBadgeForCeo: boolean;
  patches: EconomicPatchRecord[];
}

export interface EventPreviewResult {
  template: EventTemplate;
  valuesBefore: EconomyValues;
  valuesAfter: EconomyValues;
  impactDescription: string;
  changes: Array<{ key: keyof EconomyValues; before: number; after: number; label: string }>;
}

export interface PendingManualPatch {
  id: string;
  sessionId: string;
  effects: EconomyPatchEffect[];
  applyTiming: EventApplyTiming;
  reason?: string;
  actorUserId: string;
  createdAt: Date;
}

export type EconomyTimelineEntryType =
  | "PATCH_CREATED"
  | "PATCH_APPLIED"
  | "PATCH_ENDED"
  | "EVENT_APPLIED"
  | "PRESET_APPLIED";

export interface EconomyTimelineEntry {
  id: string;
  type: EconomyTimelineEntryType;
  sequence?: number;
  source: EconomicPatchSource | "PENDING";
  title: string;
  description: string;
  applyTiming?: EventApplyTiming;
  occurredAt: string;
  replayRef: {
    patchId?: string;
    simulationEventId?: string;
    presetId?: string;
  };
}

export interface EconomyPreviewDto {
  valuesBefore: Partial<EconomyValues>;
  valuesAfter: Partial<EconomyValues>;
  changes: Array<{ key: keyof EconomyValues; before: number; after: number; label: string }>;
  productionCostDeltaManwon: number;
  salesPriceImpactPct: number;
  expectedPnlDeltaManwon: number;
  affectedSteps: string[];
  affectedEvents: string[];
  message: string;
}

export interface SessionEconomyDto {
  live: {
    sessionId: string;
    values: EconomyValues;
    version: number;
    pendingBadgeForCeo: boolean;
    updatedAt?: string;
  };
  currentPeriodSnapshot: {
    periodId: string;
    snapshotType: "PERIOD_OPEN";
    values: EconomyValues;
  };
  patchHistory: EconomicPatchRecord[];
  activePatch?: EconomicPatchRecord;
  pendingPatches: PendingManualPatch[];
  dashboardCards: Array<{
    id: string;
    label: string;
    unit: string;
    currentValue: number;
    baselineValue: number;
    deltaVsBaseline: number;
    applyTiming: string;
    lastModifier: string;
    lastModifiedAt?: string;
    engineKey?: keyof EconomyValues;
  }>;
  timeline: EconomyTimelineEntry[];
}

export interface CeoEnvironmentDto {
  activeEvents: Array<{
    id: string;
    title: string;
    description: string;
    impactDescription: string;
    applyTiming: EventApplyTiming;
    firedAt?: string;
    relatedSteps: BspGameStep[];
  }>;
  topDeltas: Array<{
    key: keyof EconomyValues;
    label: string;
    value: number;
    deltaVsPeriodOpen: number;
    description: string;
  }>;
  recentChanges: string[];
  scheduledChanges: string[];
  environmentChangedBadge: boolean;
  economy: EconomyValues;
  periodOpenEconomy: EconomyValues;
  periodImpact: LearnerPeriodImpact;
  /** 활성 이벤트별 발화 시점 before→after (CEO 현황판) */
  eventImpacts: LearnerEventImpact[];
}
