/** V2.4 Live Event Publishing — domain types */

import type { EventApplyTiming, EventScheduleTarget } from "@/src/bsp/domain/events/event-types";
import type {
  NewsDisplayMode,
  NewsSeverity,
  PublishSchedule,
  ScenarioKey,
} from "@/lib/v2/event-studio/types";
import type { IntelligencePreview, NewsSourceCitation } from "./types";

/** Full lifecycle for intelligence-sourced events */
export type IntelligenceLifecycleStatus =
  | "DRAFT"
  | "GENERATED"
  | "REVIEWED"
  | "EDITED"
  | "APPROVED"
  | "SCHEDULED"
  | "PUBLISHED"
  | "ACTIVE"
  | "EXPIRING"
  | "EXPIRED"
  | "ARCHIVED";

export type PublishAuditAction =
  | "CREATED"
  | "REVIEWED"
  | "EDITED"
  | "APPROVED"
  | "SCHEDULED"
  | "PUBLISHED"
  | "ACTIVATED"
  | "EXPIRING"
  | "EXPIRED"
  | "ARCHIVED"
  | "REPLAYED"
  | "CONFLICT_CHECKED"
  | "FOLLOWUP_GENERATED"
  | "DEBRIEF_GENERATED";

export interface PublishAuditEntry {
  id: string;
  publishId: string;
  action: PublishAuditAction;
  actorUserId: string;
  actorRole: string;
  reason?: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

export interface EventTimelineEntry {
  id: string;
  publishId: string;
  phase: PublishAuditAction;
  label: string;
  detail?: string;
  timestamp: string;
  actorUserId?: string;
}

export interface PatchConflictItem {
  engineKey: string;
  existingValue: number;
  proposedDelta: number;
  combinedValue: number;
  allowedMin: number;
  allowedMax: number;
  severity: "INFO" | "WARNING" | "CRITICAL";
  conflictingPublishIds: string[];
  resolution: "STACK" | "OVERRIDE" | "CLAMP";
}

export interface ConflictPreview {
  hasConflicts: boolean;
  conflicts: PatchConflictItem[];
  activeEventCount: number;
  recommendation: string;
  canProceed: boolean;
}

export interface ConsultantFollowUp {
  publishId: string;
  comments: string[];
  studentBehaviorPredictions: string[];
  discussionGuidance: string[];
  gmOnly: true;
  generatedAt: string;
  promptVersion: string;
}

export interface EducationalDebrief {
  publishId: string;
  majorChoices: string[];
  mostSelectedStrategy: string;
  goodChoices: string[];
  missedOpportunities: string[];
  nextDiscussionQuestions: string[];
  generatedAt: string;
  gmOnly: true;
}

export interface ReplayRecord {
  replayId: string;
  sourcePublishId: string;
  newPublishId: string;
  originalScenario: ScenarioKey;
  replayScenario: ScenarioKey;
  createdAt: string;
  createdBy: string;
}

/** V3 Event Chain stub — data model only, not executed in V2.4 */
export interface EventChainNode {
  nodeId: string;
  publishId: string;
  label: string;
  description: string;
  triggerCondition?: string;
  childNodeIds: string[];
  economyEffects?: Array<{ key: string; mode: string; value: number }>;
  status: "PLANNED" | "LINKED" | "DISABLED";
}

export interface EventChainGraph {
  chainId: string;
  sessionId: string;
  rootPublishId: string;
  nodes: EventChainNode[];
  createdAt: string;
}

export interface IntelligencePublishRecord {
  publishId: string;
  previewId: string;
  sessionId: string;
  draftId?: string;
  selectedScenario: ScenarioKey;
  status: IntelligenceLifecycleStatus;
  schedule?: PublishSchedule;
  sourceCitations: NewsSourceCitation[];
  newsId?: string;
  simulationEventId?: string;
  patchSequence?: number;
  preview: IntelligencePreview;
  followUp?: ConsultantFollowUp;
  debrief?: EducationalDebrief;
  replayOf?: string;
  replayRecords: ReplayRecord[];
  eventChainId?: string;
  idempotencyResults: Record<string, PublishResult>;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  approvedBy?: string;
  approvedAt?: string;
  publishedAt?: string;
  expiredAt?: string;
  archivedAt?: string;
}

export interface PublishResult {
  publishId: string;
  draftId: string;
  simulationEventId: string;
  newsId: string;
  patchSequence?: number;
  status: "ACTIVE" | "SCHEDULED";
  idempotencyKey?: string;
}

export interface PublishScheduleInput {
  applyTiming: EventApplyTiming;
  scheduledFor?: EventScheduleTarget;
  displayMode?: NewsDisplayMode;
  severity?: NewsSeverity;
  reason: string;
}

export interface PublishStoreSnapshot {
  records: IntelligencePublishRecord[];
  audits: PublishAuditEntry[];
  timelines: EventTimelineEntry[];
  eventChains: EventChainGraph[];
}

export interface GmAcknowledgementSummary {
  newsId: string;
  totalTeams: number;
  acknowledgedTeams: number;
  pendingTeams: string[];
}
