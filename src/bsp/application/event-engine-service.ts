import type {
  CeoEnvironmentDto,
  EconomicPatchRecord,
  EconomyPatchEffect,
  EconomyPreviewDto,
  EconomyTimelineEntry,
  EventHistoryEntry,
  EventPreviewResult,
  EventScheduleTarget,
  PendingManualPatch,
  SessionEconomyDto,
  SimulationEvent,
} from "../domain/events/event-types";
import type { EventApplyTiming } from "../domain/events/event-types";
import { getEventTemplate, listEventCatalog } from "../domain/events/event-catalog";
import type { EventTemplate } from "../domain/events/event-types";
import {
  applyEffects,
  cloneEconomy,
  computeChanges,
  describeImpact,
  validateBounds,
  EconomyEngineError,
} from "../domain/economy/economy-engine";
import { ECONOMY_VARIABLE_LABELS } from "../domain/economy/economy-variable-meta";
import {
  buildLearnerIndexChanges,
  buildLearnerPeriodImpact,
  buildLearnerGameplayMetricsAllRegions,
  hasVisibleLearnerImpact,
  type LearnerEventImpact,
} from "../domain/economy/learner-economy-impact";
import {
  describeEconomyDelta,
  describeRecentChanges,
  describeScheduledChange,
} from "../domain/economy/economy-descriptions";
import { computePreviewImpact } from "../domain/economy/economy-preview-impact";
import { buildDashboardCards, patchToEffects } from "../domain/economy/economy-dashboard-meta";
import type { EconomyValues } from "../domain/types";
import type { GmActor } from "../domain/gm/audit-types";
import { GM_AUDIT_ACTIONS } from "../domain/gm/audit-types";
import type { SessionAggregate } from "./ports/repositories";
import type { SimulationEventRepository } from "./ports/repositories";
import { GmAuditService } from "./gm-audit-service";
import { EventStoreService } from "./event-store-service";
import { BspError } from "./game-engine";
import {
  notifyAuditLog,
  notifyEconomyChanged,
  notifyEventFired,
} from "../infrastructure/realtime/realtime-broadcaster";

function uuid() {
  return crypto.randomUUID();
}

export class EventEngineService {
  constructor(
    private readonly simulationEvents: SimulationEventRepository,
    private readonly audit: GmAuditService,
    private readonly events: EventStoreService,
    private readonly updateSessionEconomy: (sessionId: string, values: EconomyValues) => Promise<void>,
    private readonly getSession: (sessionId: string) => Promise<SessionAggregate | null>
  ) {}

  listCatalog(filter?: { search?: string; category?: string }) {
    return listEventCatalog(filter);
  }

  getTemplate(eventId: string): EventTemplate {
    const t = getEventTemplate(eventId);
    if (!t) throw new BspError("ERR_EVENT_NOT_FOUND", `Event template ${eventId} not found`, 404);
    return t;
  }

  async previewEvent(sessionId: string, templateId: string): Promise<EventPreviewResult> {
    const session = await this.requireSession(sessionId);
    const template = this.getTemplate(templateId);
    const valuesBefore = cloneEconomy(session.economy);
    let valuesAfter: EconomyValues;
    try {
      valuesAfter = applyEffects(valuesBefore, template.normalEffects);
      validateBounds(valuesAfter);
    } catch (e) {
      if (e instanceof EconomyEngineError) {
        throw new BspError(e.code, e.message, 422, e.details);
      }
      throw e;
    }
    return {
      template,
      valuesBefore,
      valuesAfter,
      impactDescription: describeImpact(template.normalEffects),
      changes: computeChanges(valuesBefore, valuesAfter),
    };
  }

  async listSessionEvents(sessionId: string) {
    const all = await this.simulationEvents.listBySession(sessionId);
    return {
      active: all.filter((e) => e.status === "ACTIVE"),
      scheduled: all.filter((e) => e.status === "SCHEDULED"),
      history: all.filter((e) => e.status === "EXPIRED" || e.status === "CANCELLED"),
      all,
    };
  }

  async getEventHistory(sessionId: string, limit = 100): Promise<EventHistoryEntry[]> {
    return this.simulationEvents.listHistory(sessionId, limit);
  }

  async fireEvent(
    sessionId: string,
    templateId: string,
    applyTiming: EventApplyTiming,
    actor: GmActor,
    options?: { allowDuplicate?: boolean }
  ): Promise<SimulationEvent> {
    const session = await this.requireSession(sessionId);
    this.assertSessionRunning(session);
    const template = this.getTemplate(templateId);

    const activeSame = (await this.simulationEvents.listBySession(sessionId)).filter(
      (e) => e.templateId === templateId && e.status === "ACTIVE"
    );
    if (activeSame.length > 0 && !options?.allowDuplicate) {
      throw new BspError("ERR_EVENT_DUPLICATE", `Event ${templateId} is already active`, 409, {
        existingEventId: activeSame[0].id,
      });
    }

    const now = new Date();
    const impactDescription = describeImpact(template.normalEffects);
    let event: SimulationEvent = {
      id: uuid(),
      sessionId,
      templateId: template.eventId,
      title: template.title,
      description: template.description,
      category: template.category,
      educationPurpose: template.educationPurpose,
      impactDescription,
      status: applyTiming === "IMMEDIATE" ? "ACTIVE" : "SCHEDULED",
      applyTiming,
      appliedScenario: "NORMAL",
      resolvedEffects: template.normalEffects,
      relatedSteps: template.relatedSteps,
      scheduledFor: undefined,
      duration: template.duration,
      durationPeriods: template.durationPeriods,
      periodsRemaining: template.duration === "N_PERIODS" ? template.durationPeriods : undefined,
      createdAt: now,
      updatedAt: now,
    };

    await this.simulationEvents.save(event);
    await this.recordHistory(sessionId, event, "EVENT_CREATED", { applyTiming });

    if (applyTiming === "IMMEDIATE") {
      event = await this.applyEventPatch(session, event, actor);
      notifyEventFired(sessionId, templateId, template.title);
      try {
        const { getV2ScenarioStudio } = await import("@/lib/v2/event-studio/v2-service");
        getV2ScenarioStudio().publishCatalogEventNews(sessionId, {
          headline: template.title,
          summary: template.description,
          articleBody: template.description,
          category: template.category,
          simulationEventId: event.id,
          severity: "MEDIUM",
          displayMode: "DIRECTIONAL",
        });
      } catch {
        /* news bridge is best-effort */
      }
    } else {
      await this.audit.log(sessionId, actor, GM_AUDIT_ACTIONS.EVENT_SCHEDULED, {
        eventId: event.id,
        templateId,
        applyTiming,
      });
      await this.recordHistory(sessionId, event, "EVENT_SCHEDULED", { applyTiming });
    }

    return event;
  }

  async fireCustomFromDraft(
    sessionId: string,
    params: {
      draftId: string;
      template: EventTemplate;
      applyTiming: EventApplyTiming;
      scheduledFor?: EventScheduleTarget;
      sourcePromptHash?: string;
    },
    actor: GmActor
  ): Promise<SimulationEvent> {
    const session = await this.requireSession(sessionId);
    this.assertSessionRunning(session);
    const { template, applyTiming, scheduledFor, draftId, sourcePromptHash } = params;

    const activeSame = (await this.simulationEvents.listBySession(sessionId)).filter(
      (e) => e.templateId === template.eventId && e.status === "ACTIVE"
    );
    if (activeSame.length > 0) {
      throw new BspError("ERR_EVENT_DUPLICATE", `Event ${template.eventId} is already active`, 409, {
        existingEventId: activeSame[0].id,
      });
    }

    const now = new Date();
    const impactDescription = describeImpact(template.normalEffects);
    let event: SimulationEvent = {
      id: uuid(),
      sessionId,
      templateId: template.eventId,
      title: template.title,
      description: template.description,
      category: template.category,
      educationPurpose: template.educationPurpose,
      impactDescription,
      status: applyTiming === "IMMEDIATE" ? "ACTIVE" : "SCHEDULED",
      applyTiming,
      appliedScenario: "NORMAL",
      resolvedEffects: template.normalEffects,
      relatedSteps: template.relatedSteps,
      scheduledFor,
      duration: template.duration,
      durationPeriods: template.durationPeriods,
      periodsRemaining: template.duration === "N_PERIODS" ? template.durationPeriods : undefined,
      createdAt: now,
      updatedAt: now,
    };

    await this.simulationEvents.save(event);
    await this.recordHistory(sessionId, event, "EVENT_CREATED", {
      applyTiming,
      studioDraftId: draftId,
      sourcePromptHash,
    });

    await this.audit.log(sessionId, actor, GM_AUDIT_ACTIONS.EVENT_AI_APPROVED, {
      draftId,
      templateId: template.eventId,
      sourcePromptHash,
      applyTiming,
    });

    if (applyTiming === "IMMEDIATE") {
      event = await this.applyEventPatch(session, event, actor);
      notifyEventFired(sessionId, template.eventId, template.title);
    } else {
      await this.audit.log(sessionId, actor, GM_AUDIT_ACTIONS.EVENT_SCHEDULED, {
        eventId: event.id,
        templateId: template.eventId,
        applyTiming,
        studioDraftId: draftId,
      });
      await this.recordHistory(sessionId, event, "EVENT_SCHEDULED", { applyTiming, studioDraftId: draftId });
    }

    return event;
  }

  async scheduleEvent(
    sessionId: string,
    templateId: string,
    target: EventScheduleTarget,
    actor: GmActor
  ): Promise<SimulationEvent> {
    const session = await this.requireSession(sessionId);
    this.assertSessionRunning(session);
    const template = this.getTemplate(templateId);
    const now = new Date();
    const impactDescription = describeImpact(template.normalEffects);

    const event: SimulationEvent = {
      id: uuid(),
      sessionId,
      templateId: template.eventId,
      title: template.title,
      description: template.description,
      category: template.category,
      educationPurpose: template.educationPurpose,
      impactDescription,
      status: "SCHEDULED",
      applyTiming: "NEXT_HALF",
      appliedScenario: "NORMAL",
      resolvedEffects: template.normalEffects,
      relatedSteps: template.relatedSteps,
      scheduledFor: target,
      duration: template.duration,
      durationPeriods: template.durationPeriods,
      periodsRemaining: template.duration === "N_PERIODS" ? template.durationPeriods : undefined,
      createdAt: now,
      updatedAt: now,
    };

    await this.simulationEvents.save(event);
    await this.recordHistory(sessionId, event, "EVENT_SCHEDULED", { target });
    await this.audit.log(sessionId, actor, GM_AUDIT_ACTIONS.EVENT_SCHEDULED, {
      eventId: event.id,
      templateId,
      target,
    });
    return event;
  }

  async endEvent(sessionId: string, eventId: string, actor: GmActor): Promise<SimulationEvent> {
    const session = await this.requireSession(sessionId);
    const event = await this.requireEvent(sessionId, eventId);
    if (event.status !== "ACTIVE" && event.status !== "SCHEDULED") {
      throw new BspError("ERR_EVENT_NOT_ACTIVE", "Event is not active or scheduled", 422);
    }

    if (event.status === "ACTIVE" && event.patchSequence != null) {
      await this.reverseEventPatch(session, event, actor);
    }

    const updated: SimulationEvent = {
      ...event,
      status: "EXPIRED",
      expiredAt: new Date(),
      updatedAt: new Date(),
    };
    await this.simulationEvents.save(updated);
    await this.recordHistory(sessionId, updated, "EVENT_ENDED", {});
    await this.audit.log(sessionId, actor, GM_AUDIT_ACTIONS.EVENT_ENDED, {
      eventId,
      templateId: event.templateId,
    });
    return updated;
  }

  async processPendingOnStepAdvance(sessionId: string, actor?: GmActor) {
    const session = await this.requireSession(sessionId);
    const pendingEvents = (await this.simulationEvents.listBySession(sessionId)).filter(
      (e) => e.status === "SCHEDULED" && e.applyTiming === "NEXT_STEP"
    );
    for (const event of pendingEvents) {
      await this.applyEventPatch(session, event, actor);
    }

    const pendingManual = (await this.simulationEvents.listPendingPatches(sessionId)).filter(
      (p) => p.applyTiming === "NEXT_STEP"
    );
    for (const pending of pendingManual) {
      await this.applyManualPatch(session, pending.effects, actor, pending.reason, "GM_MANUAL");
      await this.simulationEvents.removePendingPatch(sessionId, pending.id);
    }
  }

  async processPendingOnPeriodStart(sessionId: string, actor?: GmActor) {
    const session = await this.requireSession(sessionId);
    await this.simulationEvents.setPeriodOpenEconomy(sessionId, cloneEconomy(session.economy));
    await this.simulationEvents.clearCeoBadge(sessionId);

    const all = await this.simulationEvents.listBySession(sessionId);
    for (const event of all) {
      if (event.status === "ACTIVE" && event.duration === "PERIOD") {
        await this.expireEvent(session, event, actor);
      }
    }

    const scheduledHalf = all.filter(
      (e) =>
        e.status === "SCHEDULED" &&
        (e.applyTiming === "NEXT_HALF" ||
          (e.scheduledFor &&
            e.scheduledFor.year === session.year &&
            e.scheduledFor.half === session.half))
    );
    for (const event of scheduledHalf) {
      await this.applyEventPatch(session, event, actor);
    }

    const pendingManualHalf = (await this.simulationEvents.listPendingPatches(sessionId)).filter(
      (p) => p.applyTiming === "NEXT_HALF"
    );
    for (const pending of pendingManualHalf) {
      await this.applyManualPatch(session, pending.effects, actor, pending.reason, "GM_MANUAL");
      await this.simulationEvents.removePendingPatch(sessionId, pending.id);
    }

    const nPeriodActive = all.filter(
      (e) => e.status === "ACTIVE" && e.duration === "N_PERIODS" && (e.periodsRemaining ?? 0) > 0
    );
    for (const event of nPeriodActive) {
      const remaining = (event.periodsRemaining ?? 1) - 1;
      if (remaining <= 0) {
        await this.expireEvent(session, event, actor);
      } else {
        await this.simulationEvents.save({
          ...event,
          periodsRemaining: remaining,
          updatedAt: new Date(),
        });
      }
    }
  }

  async getCeoEnvironment(sessionId: string): Promise<CeoEnvironmentDto> {
    const session = await this.requireSession(sessionId);
    const periodOpen =
      (await this.simulationEvents.getPeriodOpenEconomy(sessionId)) ?? cloneEconomy(DEFAULT_PERIOD_OPEN);
    const active = (await this.simulationEvents.listBySession(sessionId)).filter((e) => e.status === "ACTIVE");
    const pending = await this.simulationEvents.listPendingPatches(sessionId);
    const badge = await this.simulationEvents.getCeoBadge(sessionId);

    const topDeltas = (Object.keys(session.economy) as (keyof EconomyValues)[])
      .map((key) => ({
        key,
        label: ECONOMY_VARIABLE_LABELS[key],
        value: session.economy[key],
        deltaVsPeriodOpen: session.economy[key] - periodOpen[key],
        description: describeEconomyDelta(
          key,
          session.economy[key] - periodOpen[key],
          session.economy[key]
        ),
      }))
      .filter((d) => Math.abs(d.deltaVsPeriodOpen) > 0.01)
      .sort((a, b) => Math.abs(b.deltaVsPeriodOpen) - Math.abs(a.deltaVsPeriodOpen))
      .slice(0, 6);

    const scheduledChanges = pending.map((p) =>
      describeScheduledChange(describeImpact(p.effects), p.applyTiming)
    );

    const patches = await this.simulationEvents.listPatches(sessionId);
    const periodImpact = buildLearnerPeriodImpact(periodOpen, session.economy);
    const eventImpacts: LearnerEventImpact[] = active.flatMap((e) => {
      const patch = patches.find((p) => p.simulationEventId === e.id && p.source === "EVENT_FIRE");
      if (!patch) return [];
      const indexChanges = buildLearnerIndexChanges(patch.valuesBefore, patch.valuesAfter);
      const regions = buildLearnerGameplayMetricsAllRegions(patch.valuesBefore, patch.valuesAfter);
      if (!hasVisibleLearnerImpact(indexChanges, regions)) return [];
      return [
        {
          eventId: e.id,
          title: e.title,
          applyTiming: e.applyTiming,
          indexChanges,
          regions,
        },
      ];
    });

    return {
      activeEvents: active.map((e) => ({
        id: e.id,
        title: e.title,
        description: e.description,
        impactDescription: e.impactDescription,
        applyTiming: e.applyTiming,
        firedAt: e.firedAt?.toISOString(),
        relatedSteps: e.relatedSteps,
      })),
      topDeltas,
      recentChanges: describeRecentChanges(session.economy, periodOpen),
      scheduledChanges,
      environmentChangedBadge: badge,
      economy: session.economy,
      periodOpenEconomy: periodOpen,
      periodImpact,
      eventImpacts,
    };
  }

  async getEconomyState(sessionId: string): Promise<SessionEconomyDto> {
    const session = await this.requireSession(sessionId);
    const patches = await this.simulationEvents.listPatches(sessionId);
    const pending = await this.simulationEvents.listPendingPatches(sessionId);
    const periodOpen =
      (await this.simulationEvents.getPeriodOpenEconomy(sessionId)) ?? cloneEconomy(session.economy);
    const activePatch = patches.length > 0 ? patches[patches.length - 1] : undefined;

    return {
      live: {
        sessionId,
        values: session.economy,
        version: patches.length,
        pendingBadgeForCeo: await this.simulationEvents.getCeoBadge(sessionId),
        updatedAt: activePatch?.occurredAt.toISOString(),
      },
      currentPeriodSnapshot: {
        periodId: session.periodId,
        snapshotType: "PERIOD_OPEN",
        values: periodOpen,
      },
      patchHistory: patches.slice(-20).reverse(),
      activePatch,
      pendingPatches: pending,
      dashboardCards: buildDashboardCards(session.economy, periodOpen, patches),
      timeline: this.buildTimeline(patches, pending),
    };
  }

  async previewEconomy(
    sessionId: string,
    input: { effects?: EconomyPatchEffect[]; patch?: Partial<EconomyValues> }
  ): Promise<EconomyPreviewDto> {
    const session = await this.requireSession(sessionId);
    const effects = input.effects ?? (input.patch ? patchToEffects(input.patch) : []);
    if (effects.length === 0) {
      throw new BspError("ERR_ECONOMY_INVALID_KEY", "No economy effects to preview", 422);
    }
    const valuesBefore = cloneEconomy(session.economy);
    let valuesAfter: EconomyValues;
    try {
      valuesAfter = applyEffects(valuesBefore, effects);
      validateBounds(valuesAfter);
    } catch (e) {
      if (e instanceof EconomyEngineError) {
        throw new BspError(e.code, e.message, 422, e.details);
      }
      throw e;
    }
    const activeEvents = (await this.simulationEvents.listBySession(sessionId))
      .filter((e) => e.status === "ACTIVE")
      .map((e) => e.title);
    const impact = computePreviewImpact(valuesBefore, valuesAfter, effects, activeEvents);
    return impact;
  }

  async patchEconomy(
    sessionId: string,
    input: {
      effects?: EconomyPatchEffect[];
      patch?: Partial<EconomyValues>;
      applyTiming?: EventApplyTiming;
      reason?: string;
    },
    actor: GmActor
  ) {
    const session = await this.requireSession(sessionId);
    this.assertSessionRunning(session);
    const applyTiming = input.applyTiming ?? "IMMEDIATE";
    const effects = input.effects ?? (input.patch ? patchToEffects(input.patch) : []);
    if (effects.length === 0) {
      throw new BspError("ERR_ECONOMY_INVALID_KEY", "No economy patch specified", 422);
    }

    if (applyTiming === "IMMEDIATE") {
      const patch = await this.applyManualPatch(session, effects, actor, input.reason, "GM_MANUAL");
      return { live: (await this.getEconomyState(sessionId)).live, patchSequence: patch.sequence, patchId: patch.id };
    }

    const pending: PendingManualPatch = {
      id: uuid(),
      sessionId,
      effects,
      applyTiming,
      reason: input.reason,
      actorUserId: actor.userId,
      createdAt: new Date(),
    };
    await this.simulationEvents.savePendingPatch(pending);
    await this.audit.log(sessionId, actor, GM_AUDIT_ACTIONS.ECONOMY_CHANGE, {
      pendingPatchId: pending.id,
      applyTiming,
      effects,
      scheduled: true,
    });
    return {
      pendingPatch: pending,
      live: (await this.getEconomyState(sessionId)).live,
    };
  }

  async rollbackEconomyPatch(sessionId: string, patchSequence: number | undefined, actor: GmActor) {
    const session = await this.requireSession(sessionId);
    this.assertSessionRunning(session);
    const patches = await this.simulationEvents.listPatches(sessionId);
    const target =
      patchSequence != null
        ? patches.find((p) => p.sequence === patchSequence)
        : patches[patches.length - 1];
    if (!target) {
      throw new BspError("ERR_NOT_FOUND", "Patch not found for rollback", 404);
    }

    const valuesBefore = cloneEconomy(session.economy);
    const valuesAfter = cloneEconomy(target.valuesBefore);
    validateBounds(valuesAfter);

    const patch: EconomicPatchRecord = {
      id: uuid(),
      sessionId,
      sequence: await this.simulationEvents.nextPatchSequence(sessionId),
      source: "GM_MANUAL",
      effects: [],
      valuesBefore,
      valuesAfter,
      reason: `Rollback patch #${target.sequence}`,
      occurredAt: new Date(),
    };

    await this.simulationEvents.savePatch(patch);
    await this.updateSessionEconomy(sessionId, valuesAfter);
    session.economy = valuesAfter;
    await this.simulationEvents.setCeoBadge(sessionId, true);
    await this.audit.log(sessionId, actor, GM_AUDIT_ACTIONS.ECONOMY_CHANGE, {
      rollbackOf: target.sequence,
      patchSequence: patch.sequence,
    });
    await this.events.recordEconomyPatched({
      sessionId,
      sequence: patch.sequence,
      source: "GM_MANUAL",
      diff: computeChanges(valuesBefore, valuesAfter),
    });

    notifyEconomyChanged(sessionId, "GM_MANUAL", patch.sequence);
    notifyAuditLog(sessionId, GM_AUDIT_ACTIONS.ECONOMY_CHANGE);

    return {
      rolledBackSequence: target.sequence,
      patchSequence: patch.sequence,
      live: (await this.getEconomyState(sessionId)).live,
    };
  }

  async applyEconomyPresetPatch(
    sessionId: string,
    presetId: string,
    valuesAfter: EconomyValues,
    actor?: GmActor
  ) {
    const session = await this.requireSession(sessionId);
    const valuesBefore = cloneEconomy(session.economy);
    validateBounds(valuesAfter);

    const patch: EconomicPatchRecord = {
      id: uuid(),
      sessionId,
      sequence: await this.simulationEvents.nextPatchSequence(sessionId),
      source: "PRESET",
      effects: patchToEffects(
        Object.fromEntries(
          (Object.keys(valuesAfter) as (keyof EconomyValues)[])
            .filter((k) => valuesAfter[k] !== valuesBefore[k])
            .map((k) => [k, valuesAfter[k]])
        ) as Partial<EconomyValues>
      ),
      valuesBefore,
      valuesAfter,
      reason: `Preset ${presetId}`,
      occurredAt: new Date(),
    };

    await this.simulationEvents.savePatch(patch);
    await this.updateSessionEconomy(sessionId, valuesAfter);
    session.economy = valuesAfter;
    await this.simulationEvents.setCeoBadge(sessionId, true);
    if (actor) {
      await this.audit.log(sessionId, actor, GM_AUDIT_ACTIONS.ECONOMY_CHANGE, { presetId, patchSequence: patch.sequence });
    }
    return { presetId, values: valuesAfter, patchSequence: patch.sequence };
  }

  async acknowledgeCeoBadge(sessionId: string) {
    await this.simulationEvents.clearCeoBadge(sessionId);
    return { environmentChangedBadge: false };
  }

  private async applyEventPatch(
    session: SessionAggregate,
    event: SimulationEvent,
    actor?: GmActor
  ): Promise<SimulationEvent> {
    const valuesBefore = cloneEconomy(session.economy);
    let valuesAfter: EconomyValues;
    try {
      valuesAfter = applyEffects(valuesBefore, event.resolvedEffects);
      validateBounds(valuesAfter);
    } catch (e) {
      if (e instanceof EconomyEngineError) {
        throw new BspError(e.code, e.message, 422, e.details);
      }
      throw e;
    }

    const patch: EconomicPatchRecord = {
      id: uuid(),
      sessionId: session.id,
      sequence: (await this.simulationEvents.nextPatchSequence(session.id)),
      source: "EVENT_FIRE",
      simulationEventId: event.id,
      effects: event.resolvedEffects,
      valuesBefore,
      valuesAfter,
      reason: `Event ${event.templateId}: ${event.title}`,
      occurredAt: new Date(),
    };

    await this.simulationEvents.savePatch(patch);
    await this.updateSessionEconomy(session.id, valuesAfter);
    session.economy = valuesAfter;
    await this.simulationEvents.setCeoBadge(session.id, true);

    const updated: SimulationEvent = {
      ...event,
      status: "ACTIVE",
      firedAt: new Date(),
      patchSequence: patch.sequence,
      updatedAt: new Date(),
    };
    await this.simulationEvents.save(updated);
    await this.recordHistory(session.id, updated, "EVENT_FIRED", { patchSequence: patch.sequence });
    await this.recordHistory(session.id, updated, "ECONOMY_PATCH_APPLIED", {
      patchId: patch.id,
      changes: computeChanges(valuesBefore, valuesAfter),
    });

    await this.events.recordEconomyPatched({
      sessionId: session.id,
      sequence: patch.sequence,
      source: "EVENT_FIRE",
      simulationEventId: event.id,
      diff: computeChanges(valuesBefore, valuesAfter),
    });

    if (actor) {
      await this.audit.log(session.id, actor, GM_AUDIT_ACTIONS.EVENT_FIRED, {
        eventId: event.id,
        templateId: event.templateId,
        patchSequence: patch.sequence,
      });
      await this.audit.log(session.id, actor, GM_AUDIT_ACTIONS.EVENT_APPLY, {
        eventId: event.id,
        templateId: event.templateId,
        effects: event.resolvedEffects,
      });
    }

    notifyEconomyChanged(session.id, "EVENT_FIRE", patch.sequence);
    notifyAuditLog(session.id, GM_AUDIT_ACTIONS.EVENT_FIRED);

    return updated;
  }

  private async applyManualPatch(
    session: SessionAggregate,
    effects: EconomyPatchEffect[],
    actor: GmActor | undefined,
    reason: string | undefined,
    source: "GM_MANUAL" | "PRESET"
  ): Promise<EconomicPatchRecord> {
    const valuesBefore = cloneEconomy(session.economy);
    let valuesAfter: EconomyValues;
    try {
      valuesAfter = applyEffects(valuesBefore, effects);
      validateBounds(valuesAfter);
    } catch (e) {
      if (e instanceof EconomyEngineError) {
        throw new BspError(e.code, e.message, 422, e.details);
      }
      throw e;
    }

    const patch: EconomicPatchRecord = {
      id: uuid(),
      sessionId: session.id,
      sequence: await this.simulationEvents.nextPatchSequence(session.id),
      source,
      effects,
      valuesBefore,
      valuesAfter,
      reason: reason ?? "GM manual patch",
      occurredAt: new Date(),
    };

    await this.simulationEvents.savePatch(patch);
    await this.updateSessionEconomy(session.id, valuesAfter);
    session.economy = valuesAfter;
    await this.simulationEvents.setCeoBadge(session.id, true);

    await this.events.recordEconomyPatched({
      sessionId: session.id,
      sequence: patch.sequence,
      source,
      diff: computeChanges(valuesBefore, valuesAfter),
    });

    if (actor) {
      await this.audit.log(session.id, actor, GM_AUDIT_ACTIONS.ECONOMY_CHANGE, {
        patchSequence: patch.sequence,
        effects,
        source,
      });
    }

    notifyEconomyChanged(session.id, source, patch.sequence);
    notifyAuditLog(session.id, GM_AUDIT_ACTIONS.ECONOMY_CHANGE);

    return patch;
  }

  private buildTimeline(
    patches: EconomicPatchRecord[],
    pending: PendingManualPatch[]
  ): EconomyTimelineEntry[] {
    const entries: EconomyTimelineEntry[] = [];

    for (const p of pending) {
      entries.push({
        id: `pending-${p.id}`,
        type: "PATCH_CREATED",
        source: "PENDING",
        title: "예약 패치",
        description: describeImpact(p.effects),
        applyTiming: p.applyTiming,
        occurredAt: p.createdAt.toISOString(),
        replayRef: { patchId: p.id },
      });
    }

    for (const patch of patches) {
      const changes = computeChanges(patch.valuesBefore, patch.valuesAfter);
      const title =
        patch.source === "EVENT_FIRE"
          ? "이벤트 경제 반영"
          : patch.source === "EVENT_END"
            ? "이벤트 종료 (복원)"
            : patch.source === "PRESET"
              ? "프리셋 적용"
              : "GM 수동 패치";

      entries.push({
        id: patch.id,
        type: patch.source === "EVENT_END" ? "PATCH_ENDED" : "PATCH_APPLIED",
        sequence: patch.sequence,
        source: patch.source,
        title,
        description:
          changes.map((c) => `${c.label} ${c.before}→${c.after}`).join(" · ") ||
          patch.reason ||
          "",
        occurredAt: patch.occurredAt.toISOString(),
        replayRef: {
          patchId: patch.id,
          simulationEventId: patch.simulationEventId,
        },
      });
    }

    return entries.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  }

  private async reverseEventPatch(session: SessionAggregate, event: SimulationEvent, actor?: GmActor) {
    const patches = await this.simulationEvents.listPatches(session.id);
    const original = patches.find((p) => p.simulationEventId === event.id && p.source === "EVENT_FIRE");
    if (!original) return;

    const valuesBefore = cloneEconomy(session.economy);
    const valuesAfter = cloneEconomy(original.valuesBefore);
    validateBounds(valuesAfter);

    const patch: EconomicPatchRecord = {
      id: uuid(),
      sessionId: session.id,
      sequence: await this.simulationEvents.nextPatchSequence(session.id),
      source: "EVENT_END",
      simulationEventId: event.id,
      effects: [],
      valuesBefore,
      valuesAfter,
      reason: `Event ended: ${event.title}`,
      occurredAt: new Date(),
    };

    await this.simulationEvents.savePatch(patch);
    await this.updateSessionEconomy(session.id, valuesAfter);
    session.economy = valuesAfter;
    await this.simulationEvents.setCeoBadge(session.id, true);

    await this.recordHistory(session.id, event, "EVENT_EXPIRED", { patchSequence: patch.sequence });
    if (actor) {
      await this.audit.log(session.id, actor, GM_AUDIT_ACTIONS.EVENT_EXPIRED, {
        eventId: event.id,
        templateId: event.templateId,
      });
    }
  }

  private async expireEvent(session: SessionAggregate, event: SimulationEvent, actor?: GmActor) {
    if (event.status === "ACTIVE") {
      await this.reverseEventPatch(session, event, actor);
    }
    const updated: SimulationEvent = {
      ...event,
      status: "EXPIRED",
      expiredAt: new Date(),
      updatedAt: new Date(),
    };
    await this.simulationEvents.save(updated);
    await this.recordHistory(session.id, updated, "EVENT_EXPIRED", {});
  }

  private async recordHistory(
    sessionId: string,
    event: SimulationEvent,
    action: EventHistoryEntry["action"],
    payload: Record<string, unknown>
  ) {
    await this.simulationEvents.appendHistory({
      id: uuid(),
      sessionId,
      simulationEventId: event.id,
      templateId: event.templateId,
      action,
      title: event.title,
      payload,
      occurredAt: new Date(),
    });
  }

  private async requireSession(sessionId: string): Promise<SessionAggregate> {
    const session = await this.getSession(sessionId);
    if (!session) throw new BspError("ERR_NOT_FOUND", "Session not found", 404);
    return session;
  }

  private async requireEvent(sessionId: string, eventId: string): Promise<SimulationEvent> {
    const event = await this.simulationEvents.findById(sessionId, eventId);
    if (!event) throw new BspError("ERR_NOT_FOUND", "Simulation event not found", 404);
    return event;
  }

  private assertSessionRunning(session: SessionAggregate) {
    if (session.sessionPhase !== "RUNNING") {
      throw new BspError("ERR_SESSION_NOT_RUNNING", "Session is not running", 423);
    }
  }
}

import { DEFAULT_ECONOMY_VALUES } from "../domain/types";

const DEFAULT_PERIOD_OPEN = DEFAULT_ECONOMY_VALUES;
