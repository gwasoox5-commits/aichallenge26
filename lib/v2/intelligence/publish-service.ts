import type { GameEngine } from "@/src/bsp/application/game-engine";
import { BspError } from "@/src/bsp/application/game-engine";
import type { GmActor } from "@/src/bsp/domain/gm/audit-types";
import type { ScenarioKey } from "@/lib/v2/event-studio/types";
import { getDraftStore } from "@/lib/v2/event-studio/draft-store";
import type { ScenarioStudioService } from "@/lib/v2/event-studio/scenario-studio-service";
import { getIntelligenceService, type IntelligenceService } from "./intelligence-service";
import {
  buildIntelligenceDraft,
  extractSourceCitations,
  getEngineEffectsForScenario,
} from "./publish-bridge";
import { checkPatchConflicts } from "./conflict-resolver";
import { generateConsultantFollowUp } from "./consultant-followup";
import { generateEducationalDebrief } from "./debrief-generator";
import { createEventChainStub } from "./event-chain-types";
import { onIntelligenceEventActivated } from "./publish-lifecycle-hook";
import { getIntelligencePublishStore } from "./publish-store";
import type {
  ConflictPreview,
  EventTimelineEntry,
  IntelligencePublishRecord,
  PublishAuditAction,
  PublishAuditEntry,
  PublishResult,
  PublishScheduleInput,
  ReplayRecord,
} from "./publish-types";
import { getIntelligenceSessionStore } from "./session-store";
import type { IntelligencePreview } from "./types";

function nowIso() {
  return new Date().toISOString();
}

function uuid() {
  return crypto.randomUUID();
}

const TIMELINE_LABELS: Record<PublishAuditAction, string> = {
  CREATED: "생성",
  REVIEWED: "GM 검토",
  EDITED: "GM 편집",
  APPROVED: "승인",
  SCHEDULED: "예약",
  PUBLISHED: "발행",
  ACTIVATED: "활성화",
  EXPIRING: "만료 예정",
  EXPIRED: "만료",
  ARCHIVED: "보관",
  REPLAYED: "Replay",
  CONFLICT_CHECKED: "충돌 검증",
  FOLLOWUP_GENERATED: "컨설턴트 Follow-up",
  DEBRIEF_GENERATED: "Debrief 생성",
};

export class IntelligencePublishService {
  constructor(
    private readonly getEngine: () => GameEngine,
    private readonly getStudio: () => ScenarioStudioService,
    private readonly getIntel: () => IntelligenceService = getIntelligenceService
  ) {}

  private store() {
    return getIntelligencePublishStore();
  }

  private draftStore() {
    return getDraftStore();
  }

  private audit(
    publishId: string,
    action: PublishAuditAction,
    actor: GmActor,
    reason?: string,
    metadata?: Record<string, unknown>
  ) {
    const entry: PublishAuditEntry = {
      id: uuid(),
      publishId,
      action,
      actorUserId: actor.userId,
      actorRole: actor.role,
      reason,
      metadata,
      timestamp: nowIso(),
    };
    this.store().saveAudit(entry);

    const timeline: EventTimelineEntry = {
      id: uuid(),
      publishId,
      phase: action,
      label: TIMELINE_LABELS[action] ?? action,
      detail: reason,
      timestamp: entry.timestamp,
      actorUserId: actor.userId,
    };
    this.store().saveTimelineEntry(timeline);
    return entry;
  }

  private requirePreview(previewId: string): IntelligencePreview {
    const preview = this.getIntel().getPreview(previewId);
    if (!preview) {
      throw Object.assign(new Error("Preview not found"), { code: "ERR_INTEL_PREVIEW", status: 404 });
    }
    if (preview.status !== "PREVIEW" && preview.status !== "SAVED") {
      throw Object.assign(new Error("Complete GM preview first"), { code: "ERR_INTEL_PREVIEW", status: 400 });
    }
    if (!preview.analysis || !preview.scenarios) {
      throw Object.assign(new Error("Analysis and scenarios required"), { code: "ERR_INTEL_PREVIEW", status: 400 });
    }
    return preview;
  }

  private requireRecord(publishId: string): IntelligencePublishRecord {
    const record = this.store().getRecord(publishId);
    if (!record) {
      throw Object.assign(new Error("Publish record not found"), { code: "ERR_INTEL_PUBLISH", status: 404 });
    }
    return record;
  }

  /** Initiate publish workflow from completed preview */
  async initiatePublish(
    previewId: string,
    selectedScenario: ScenarioKey,
    actor: GmActor
  ): Promise<IntelligencePublishRecord> {
    const preview = this.requirePreview(previewId);
    await this.getEngine().getGmDesk(preview.sessionId);

    const existing = this.store().findByPreviewId(previewId);
    if (existing && !["EXPIRED", "ARCHIVED"].includes(existing.status)) {
      return existing;
    }

    const record: IntelligencePublishRecord = {
      publishId: `pub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      previewId,
      sessionId: preview.sessionId,
      selectedScenario,
      status: "GENERATED",
      sourceCitations: extractSourceCitations(preview),
      preview,
      replayRecords: [],
      idempotencyResults: {},
      createdAt: nowIso(),
      updatedAt: nowIso(),
      createdBy: actor.userId,
    };

    this.store().saveRecord(record);
    this.audit(record.publishId, "CREATED", actor, `Scenario: ${selectedScenario}`);
    return record;
  }

  markReviewed(publishId: string, actor: GmActor): IntelligencePublishRecord {
    const record = this.requireRecord(publishId);
    if (!["GENERATED", "EDITED"].includes(record.status)) {
      throw new BspError("ERR_INTEL_STATE", "Cannot review in current status", 409);
    }
    record.status = "REVIEWED";
    record.updatedAt = nowIso();
    this.store().saveRecord(record);
    this.audit(publishId, "REVIEWED", actor);
    return record;
  }

  approve(publishId: string, reason: string, actor: GmActor): IntelligencePublishRecord {
    const record = this.requireRecord(publishId);
    if (!["REVIEWED", "EDITED", "GENERATED"].includes(record.status)) {
      throw new BspError("ERR_INTEL_STATE", "Cannot approve in current status", 409);
    }
    record.status = "APPROVED";
    record.approvedBy = actor.userId;
    record.approvedAt = nowIso();
    record.updatedAt = nowIso();
    this.store().saveRecord(record);
    this.audit(publishId, "APPROVED", actor, reason);
    return record;
  }

  schedule(publishId: string, schedule: PublishScheduleInput, actor: GmActor): IntelligencePublishRecord {
    const record = this.requireRecord(publishId);
    if (record.status !== "APPROVED" && record.status !== "SCHEDULED") {
      throw new BspError("ERR_INTEL_STATE", "Approve before scheduling", 422);
    }
    record.schedule = {
      applyTiming: schedule.applyTiming,
      scheduledFor: schedule.scheduledFor,
      displayMode: schedule.displayMode ?? "DIRECTIONAL",
      reason: schedule.reason,
    };
    record.status = "SCHEDULED";
    record.updatedAt = nowIso();
    this.store().saveRecord(record);
    this.audit(publishId, "SCHEDULED", actor, schedule.reason, {
      applyTiming: schedule.applyTiming,
    });
    return record;
  }

  async checkConflicts(publishId: string): Promise<ConflictPreview> {
    const record = this.requireRecord(publishId);
    const preview = record.preview;
    const desk = await this.getEngine().getGmDesk(record.sessionId);

    const draft = buildIntelligenceDraft(preview, { userId: "conflict-check", role: "GM" }, desk.economy);
    const proposedEffects = getEngineEffectsForScenario(draft, record.selectedScenario);

    const activeRecords = this.store().listActiveBySession(record.sessionId);
    const activeDrafts = activeRecords
      .map((r) => (r.draftId ? this.draftStore().getDraft(r.draftId) : undefined))
      .filter(Boolean) as ReturnType<typeof this.draftStore>["getDraft"] extends (id: string) => infer R ? NonNullable<R>[] : never[];

    const result = checkPatchConflicts(desk.economy, proposedEffects, activeRecords, activeDrafts);
    this.audit(publishId, "CONFLICT_CHECKED", { userId: "system", role: "GM" }, result.recommendation, {
      conflictCount: result.conflicts.length,
    });
    return result;
  }

  /** Publish to game via existing P4 Event Engine */
  async publish(
    publishId: string,
    params: { reason: string; idempotencyKey?: string },
    actor: GmActor
  ): Promise<PublishResult> {
    const record = this.requireRecord(publishId);

    if (params.idempotencyKey && record.idempotencyResults[params.idempotencyKey]) {
      return record.idempotencyResults[params.idempotencyKey];
    }

    if (record.newsId && record.simulationEventId) {
      const existing: PublishResult = {
        publishId: record.publishId,
        draftId: record.draftId!,
        simulationEventId: record.simulationEventId,
        newsId: record.newsId,
        patchSequence: record.patchSequence,
        status: record.schedule?.applyTiming === "IMMEDIATE" ? "ACTIVE" : "SCHEDULED",
        idempotencyKey: params.idempotencyKey,
      };
      if (params.idempotencyKey) {
        record.idempotencyResults[params.idempotencyKey] = existing;
        this.store().saveRecord(record);
      }
      return existing;
    }

    if (!["APPROVED", "SCHEDULED"].includes(record.status)) {
      throw new BspError("ERR_INTEL_STATE", "Approve and schedule before publish", 422);
    }

    const session = await this.getEngine().getGmDesk(record.sessionId);
    if (session.sessionPhase === "FINISHED") {
      throw new BspError("ERR_SESSION_FINISHED", "Session is finished", 409);
    }

    const conflict = await this.checkConflicts(publishId);
    if (!conflict.canProceed) {
      throw new BspError("ERR_INTEL_CONFLICT", conflict.recommendation, 409, { conflicts: conflict.conflicts });
    }

    const desk = await this.getEngine().getGmDesk(record.sessionId);
    const draft = buildIntelligenceDraft(record.preview, actor, desk.economy);
    this.draftStore().saveDraft(draft);
    record.draftId = draft.draftId;

    const studio = this.getStudio();
    studio.selectOutcome(
      draft.draftId,
      { mode: "MANUAL", selectedOutcome: record.selectedScenario },
      actor
    );

    const applyTiming = record.schedule?.applyTiming ?? "IMMEDIATE";
    studio.scheduleDraft(
      draft.draftId,
      {
        applyTiming,
        displayMode: record.schedule?.displayMode ?? "DIRECTIONAL",
        reason: record.schedule?.reason ?? params.reason,
        scheduledFor: record.schedule?.scheduledFor,
      },
      actor
    );

    const approveResult = await studio.approveDraft(
      draft.draftId,
      { reason: params.reason, idempotencyKey: params.idempotencyKey },
      actor
    );

    record.newsId = approveResult.newsId;
    record.simulationEventId = approveResult.simulationEventId;
    record.patchSequence = approveResult.patchSequence;
    record.publishedAt = nowIso();
    record.status = approveResult.status === "ACTIVE" ? "ACTIVE" : "PUBLISHED";
    record.updatedAt = nowIso();

    const chain = createEventChainStub(record.sessionId, record.publishId, record.preview.analysis?.eventSummary ?? "Event");
    record.eventChainId = chain.chainId;
    this.store().saveEventChain(chain);

    record.followUp = generateConsultantFollowUp(record.publishId, record.preview);

    const result: PublishResult = {
      publishId: record.publishId,
      draftId: draft.draftId,
      simulationEventId: approveResult.simulationEventId,
      newsId: approveResult.newsId,
      patchSequence: approveResult.patchSequence,
      status: approveResult.status,
      idempotencyKey: params.idempotencyKey,
    };

    if (params.idempotencyKey) {
      record.idempotencyResults[params.idempotencyKey] = result;
    }

    this.store().saveRecord(record);
    this.audit(publishId, "PUBLISHED", actor, params.reason, {
      newsId: approveResult.newsId,
      simulationEventId: approveResult.simulationEventId,
    });

    if (approveResult.status === "ACTIVE") {
      this.audit(publishId, "ACTIVATED", actor);
    }

    this.audit(publishId, "FOLLOWUP_GENERATED", actor);

    return result;
  }

  /** One-step: initiate + approve + schedule + publish */
  async publishFromPreview(
    previewId: string,
    selectedScenario: ScenarioKey,
    schedule: PublishScheduleInput,
    reason: string,
    actor: GmActor,
    idempotencyKey?: string
  ): Promise<PublishResult> {
    const existing = this.store().findByPreviewId(previewId);
    if (existing?.newsId && existing?.simulationEventId) {
      const cached: PublishResult = {
        publishId: existing.publishId,
        draftId: existing.draftId!,
        simulationEventId: existing.simulationEventId,
        newsId: existing.newsId,
        patchSequence: existing.patchSequence,
        status: existing.schedule?.applyTiming === "IMMEDIATE" ? "ACTIVE" : "SCHEDULED",
        idempotencyKey,
      };
      if (idempotencyKey) {
        existing.idempotencyResults[idempotencyKey] = cached;
        this.store().saveRecord(existing);
      }
      return cached;
    }

    let record = await this.initiatePublish(previewId, selectedScenario, actor);
    record = this.markReviewed(record.publishId, actor);
    record = this.approve(record.publishId, reason, actor);
    record = this.schedule(record.publishId, schedule, actor);
    return this.publish(record.publishId, { reason, idempotencyKey }, actor);
  }

  getRecord(publishId: string) {
    return this.store().getRecord(publishId);
  }

  listBySession(sessionId: string) {
    return this.store().listBySession(sessionId);
  }

  getTimeline(publishId: string): EventTimelineEntry[] {
    return this.store().getTimeline(publishId);
  }

  getAudits(publishId: string): PublishAuditEntry[] {
    return this.store().listAudits(publishId);
  }

  generateFollowUp(publishId: string, actor: GmActor): IntelligencePublishRecord {
    const record = this.requireRecord(publishId);
    record.followUp = generateConsultantFollowUp(publishId, record.preview);
    record.updatedAt = nowIso();
    this.store().saveRecord(record);
    this.audit(publishId, "FOLLOWUP_GENERATED", actor);
    return record;
  }

  generateDebrief(publishId: string, actor: GmActor): IntelligencePublishRecord {
    const record = this.requireRecord(publishId);
    if (!["ACTIVE", "EXPIRING", "EXPIRED"].includes(record.status)) {
      throw new BspError("ERR_INTEL_STATE", "Debrief available after event is active/expired", 422);
    }
    record.debrief = generateEducationalDebrief(publishId, record.preview);
    record.updatedAt = nowIso();
    this.store().saveRecord(record);
    this.audit(publishId, "DEBRIEF_GENERATED", actor);
    return record;
  }

  async expire(publishId: string, actor: GmActor): Promise<IntelligencePublishRecord> {
    const record = this.requireRecord(publishId);
    if (record.simulationEventId && ["ACTIVE", "PUBLISHED", "EXPIRING"].includes(record.status)) {
      try {
        await this.getEngine().endEvent(record.sessionId, record.simulationEventId, actor);
      } catch {
        /* event may already be ended */
      }
    }
    record.status = "EXPIRED";
    record.expiredAt = nowIso();
    record.updatedAt = nowIso();
    this.store().saveRecord(record);
    this.audit(publishId, "EXPIRED", actor);
    if (!record.debrief) {
      record.debrief = generateEducationalDebrief(publishId, record.preview);
      this.audit(publishId, "DEBRIEF_GENERATED", actor);
    }
    return record;
  }

  archive(publishId: string, actor: GmActor): IntelligencePublishRecord {
    const record = this.requireRecord(publishId);
    record.status = "ARCHIVED";
    record.archivedAt = nowIso();
    record.updatedAt = nowIso();
    this.store().saveRecord(record);
    this.audit(publishId, "ARCHIVED", actor);
    return record;
  }

  async createReplay(
    sourcePublishId: string,
    replayScenario: ScenarioKey,
    schedule: PublishScheduleInput,
    reason: string,
    actor: GmActor
  ): Promise<{ replay: ReplayRecord; result: PublishResult }> {
    const source = this.requireRecord(sourcePublishId);
    const preview = structuredClone(source.preview);
    preview.previewId = `replay-${source.previewId}-${Date.now()}`;
    preview.status = "PREVIEW";
    getIntelligenceSessionStore().savePreview(preview);

    await this.initiatePublish(preview.previewId, replayScenario, actor);
    const newRecord = this.store().findByPreviewId(preview.previewId)!;
    newRecord.replayOf = sourcePublishId;
    this.store().saveRecord(newRecord);

    const result = await this.publishFromPreview(
      preview.previewId,
      replayScenario,
      schedule,
      reason,
      actor
    );

    const replay: ReplayRecord = {
      replayId: uuid(),
      sourcePublishId,
      newPublishId: newRecord.publishId,
      originalScenario: source.selectedScenario,
      replayScenario,
      createdAt: nowIso(),
      createdBy: actor.userId,
    };

    source.replayRecords.push(replay);
    this.store().saveRecord(source);
    this.audit(sourcePublishId, "REPLAYED", actor, reason, { replayScenario });

    return { replay, result };
  }

  async getAcknowledgementSummary(sessionId: string, newsId: string) {
    const acks = getDraftStore().listAcknowledgements(sessionId);
    const newsAcks = acks.filter((a) => a.newsId === newsId);
    const companies = await this.getEngine().listSessionCompanies(sessionId);
    const acknowledgedIds = new Set(newsAcks.map((a) => a.companyId));
    const pendingTeams = companies
      .filter((c) => !acknowledgedIds.has(c.id))
      .map((c) => c.teamName ?? c.id);

    return {
      newsId,
      totalTeams: companies.length,
      acknowledgedTeams: newsAcks.length,
      pendingTeams,
      acknowledged: newsAcks.map((a) => a.companyId),
    };
  }

  /** Sync lifecycle when scheduled event activates */
  onEventActivated(simulationEventId: string) {
    onIntelligenceEventActivated(simulationEventId);
  }
}

const globalRef = globalThis as unknown as { v2IntelligencePublishService?: IntelligencePublishService };

export function getIntelligencePublishService(
  getEngine: () => GameEngine,
  getStudio: () => ScenarioStudioService
): IntelligencePublishService {
  if (!globalRef.v2IntelligencePublishService) {
    globalRef.v2IntelligencePublishService = new IntelligencePublishService(getEngine, getStudio);
  }
  return globalRef.v2IntelligencePublishService;
}

export function resetIntelligencePublishService() {
  delete globalRef.v2IntelligencePublishService;
}
