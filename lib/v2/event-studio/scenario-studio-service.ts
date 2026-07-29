import type { GameEngine } from "@/src/bsp/application/game-engine";
import { BspError } from "@/src/bsp/application/game-engine";
import type { GmActor } from "@/src/bsp/domain/gm/audit-types";
import type { EventApplyTiming } from "@/src/bsp/domain/events/event-types";
import { notifyNewsPublished } from "@/src/bsp/infrastructure/realtime/realtime-broadcaster";
import { getDraftStore } from "./draft-store";
import { generateScenarioOutput } from "./openai-generator";
import { normalizeStudioOutput } from "./normalize-studio-output";
import { buildOutcomesFromOutput, previewMappedEffects } from "./bounds-preview";
import { buildCustomEventTemplate } from "./custom-event-builder";
import { onIntelligenceEventActivated } from "@/lib/v2/intelligence/publish-lifecycle-hook";
import { generateRandomSeed, selectScenarioOutcome } from "./scenario-selector";
import type {
  ApproveResult,
  EventAcknowledgement,
  EventScenarioDraft,
  EventStudioInput,
  NewsDisplayMode,
  NewsPublication,
  PublishSchedule,
  ScenarioKey,
  ScenarioSelection,
  ScenarioWeights,
  SelectionMode,
} from "./types";
import { appendLearnerDisclaimer, buildInstructorNewsSummary, buildLearnerNewsSummary, stripInstructorMetaFromLearnerText } from "./news-copy";

function nowIso() {
  return new Date().toISOString();
}

function uuid() {
  return crypto.randomUUID();
}

export class ScenarioStudioService {
  constructor(private readonly getEngine: () => GameEngine) {}

  private store() {
    return getDraftStore();
  }

  private engine() {
    return this.getEngine();
  }

  async createDraft(sessionId: string, input: EventStudioInput, actor: GmActor): Promise<EventScenarioDraft> {
    this.validateInput(input);
    await this.requireRunningSession(sessionId);

    const draft: EventScenarioDraft = {
      draftId: uuid(),
      sessionId,
      status: "DRAFT",
      input,
      idempotencyResults: {},
      createdAt: nowIso(),
      updatedAt: nowIso(),
      createdBy: actor.userId,
    };
    this.store().saveDraft(draft);
    return draft;
  }

  async generateDraft(draftId: string, actor: GmActor) {
    const draft = this.requireDraft(draftId);
    await this.requireRunningSession(draft.sessionId);

    const { studioOutput, meta } = await generateScenarioOutput(draft.input);
    const normalizedOutput = normalizeStudioOutput(studioOutput);
    const desk = await this.engine().getGmDesk(draft.sessionId);
    const outcomePreview = buildOutcomesFromOutput(normalizedOutput.economyVariableChanges, desk.economy);

    draft.studioOutput = normalizedOutput;
    draft.outcomes = {
      pessimistic: {
        scenarioKey: "pessimistic",
        outlook: normalizedOutput.scenarios.pessimistic,
        effects: normalizedOutput.economyVariableChanges.pessimistic.effects,
        mappedEngineEffects: outcomePreview.pessimistic.mappedEngineEffects,
      },
      neutral: {
        scenarioKey: "neutral",
        outlook: normalizedOutput.scenarios.neutral,
        effects: normalizedOutput.economyVariableChanges.neutral.effects,
        mappedEngineEffects: outcomePreview.neutral.mappedEngineEffects,
      },
      optimistic: {
        scenarioKey: "optimistic",
        outlook: normalizedOutput.scenarios.optimistic,
        effects: normalizedOutput.economyVariableChanges.optimistic.effects,
        mappedEngineEffects: outcomePreview.optimistic.mappedEngineEffects,
      },
    };
    draft.status = "GENERATED";
    draft.updatedAt = nowIso();
    this.store().saveDraft(draft);

    await this.engine().getGmDesk(draft.sessionId);
    void actor;

    return {
      draft,
      mappedPreview: outcomePreview,
      validation: {
        schemaValid: true,
        boundsWarnings: [
          ...outcomePreview.pessimistic.boundsWarnings,
          ...outcomePreview.neutral.boundsWarnings,
          ...outcomePreview.optimistic.boundsWarnings,
        ],
        isEstimate: normalizedOutput.meta.isEstimate,
      },
      meta,
    };
  }

  getDraft(draftId: string) {
    return this.requireDraft(draftId);
  }

  listDrafts(sessionId: string) {
    return this.store().listDraftsBySession(sessionId);
  }

  async previewDraft(draftId: string, scenario?: ScenarioKey) {
    const draft = this.requireDraft(draftId);
    if (!draft.studioOutput || !draft.outcomes) {
      throw new BspError("ERR_STUDIO_STATE", "Draft has not been generated", 422);
    }
    const selected = scenario ?? draft.selection?.selectedOutcome ?? "neutral";
    const desk = await this.engine().getGmDesk(draft.sessionId);
    const effects = draft.outcomes[selected].mappedEngineEffects;
    const preview = previewMappedEffects(desk.economy, effects);
    const economyPreview = await this.engine().previewEconomy(draft.sessionId, { effects });

    return {
      selectedScenario: selected,
      economyPreview,
      valuesAfter: preview.valuesAfter,
      boundsCheck: preview.boundsWarnings,
      affectedSteps: (draft.studioOutput.impactPathways ?? []).flatMap((p) => p.affectedSteps ?? []),
    };
  }

  selectOutcome(
    draftId: string,
    params: {
      mode: SelectionMode;
      selectedOutcome?: ScenarioKey;
      weights?: ScenarioWeights;
      randomSeed?: string;
    },
    actor: GmActor
  ) {
    const draft = this.requireDraft(draftId);
    if (!draft.studioOutput) {
      throw new BspError("ERR_STUDIO_STATE", "Draft has not been generated", 422);
    }
    if (["PUBLISHED", "APPLIED", "CANCELLED", "EXPIRED"].includes(draft.status)) {
      throw new BspError("ERR_STUDIO_STATE", "Draft cannot be selected in current status", 409);
    }

    const seed = params.randomSeed ?? generateRandomSeed();
    const selectedOutcome = selectScenarioOutcome(
      params.mode,
      seed,
      params.selectedOutcome,
      params.weights
    );

    const selection: ScenarioSelection = {
      mode: params.mode,
      weights: params.weights,
      randomSeed: seed,
      selectedOutcome,
      selectedBy: actor.userId,
      selectedAt: nowIso(),
      sessionId: draft.sessionId,
    };

    draft.selection = selection;
    draft.status = "SELECTED";
    draft.updatedAt = nowIso();
    this.store().saveDraft(draft);

    return { draft, selection };
  }

  scheduleDraft(
    draftId: string,
    schedule: {
      applyTiming: EventApplyTiming;
      displayMode?: NewsDisplayMode;
      reason: string;
      scheduledFor?: PublishSchedule["scheduledFor"];
    },
    actor: GmActor
  ) {
    const draft = this.requireDraft(draftId);
    if (!draft.selection) {
      throw new BspError("ERR_STUDIO_STATE", "Select an outcome before scheduling", 422);
    }

    draft.schedule = {
      applyTiming: schedule.applyTiming,
      scheduledFor: schedule.scheduledFor,
      displayMode: schedule.displayMode ?? "DIRECTIONAL",
      reason: schedule.reason,
    };
    draft.status = "SCHEDULED";
    draft.updatedAt = nowIso();
    this.store().saveDraft(draft);
    void actor;
    return draft;
  }

  async approveDraft(
    draftId: string,
    params: { reason: string; idempotencyKey?: string },
    actor: GmActor
  ): Promise<ApproveResult> {
    const draft = this.requireDraft(draftId);
    const session = await this.engine().getGmDesk(draft.sessionId);

    if (session.sessionPhase === "FINISHED") {
      throw new BspError("ERR_SESSION_FINISHED", "Session is finished", 409);
    }
    if (session.stepPhase === "HALF_YEAR_END") {
      throw new BspError("ERR_STUDIO_SETTLEMENT", "Cannot apply immediately during settlement", 423);
    }
    if (!draft.studioOutput || !draft.outcomes) {
      throw new BspError("ERR_STUDIO_STATE", "Draft has not been generated", 422);
    }
    if (!draft.selection) {
      throw new BspError("ERR_STUDIO_STATE", "Select an outcome before approve", 422);
    }
    if (draft.status === "CANCELLED") {
      throw new BspError("ERR_STUDIO_STATE", "Draft was cancelled", 409);
    }

    if (params.idempotencyKey && draft.idempotencyResults[params.idempotencyKey]) {
      return draft.idempotencyResults[params.idempotencyKey];
    }

    if (draft.simulationEventId && draft.newsPublication?.publishedAt) {
      const existing: ApproveResult = {
        simulationEventId: draft.simulationEventId,
        newsId: draft.newsPublication.newsId,
        patchSequence: draft.patchSequence,
        status: draft.schedule?.applyTiming === "IMMEDIATE" ? "ACTIVE" : "SCHEDULED",
        idempotencyKey: params.idempotencyKey,
      };
      if (params.idempotencyKey) {
        draft.idempotencyResults[params.idempotencyKey] = existing;
        this.store().saveDraft(draft);
      }
      return existing;
    }

    const selected = draft.selection.selectedOutcome;
    const effects = draft.outcomes[selected].mappedEngineEffects;
    const desk = await this.engine().getGmDesk(draft.sessionId);
    const boundsPreview = previewMappedEffects(desk.economy, effects);
    draft.boundsWarnings = boundsPreview.boundsWarnings;

    const applyTiming = draft.schedule?.applyTiming ?? "IMMEDIATE";
    const displayMode = draft.schedule?.displayMode ?? "DIRECTIONAL";
    const scenario = draft.studioOutput.scenarios[selected];
    const newsId = uuid();

    const news: NewsPublication = {
      newsId,
      draftId: draft.draftId,
      sessionId: draft.sessionId,
      headline: scenario.newsHeadline,
      summary: buildLearnerNewsSummary({
        narrative: scenario.narrative,
        articleBody: scenario.newsArticleBody,
        targetMarketOrRegion: draft.input.targetMarketOrRegion,
        targetIndustry: draft.input.targetIndustry,
        effects,
      }),
      instructorSummary: buildInstructorNewsSummary(draft.studioOutput.meta.summary),
      articleBody: appendLearnerDisclaimer(scenario.newsArticleBody),
      category: draft.studioOutput.meta.category,
      severity: scenario.severity,
      displayMode,
      publishedAt: null,
      effectiveAt: nowIso(),
      duration: draft.input.expectedDuration,
      affectedAreas: [draft.input.targetMarketOrRegion],
      selectedScenario: selected,
    };

    const template = buildCustomEventTemplate(draft.draftId, draft.studioOutput, selected, effects);

    let simulationEventId: string;
    let patchSequence: number | undefined;
    let status: "ACTIVE" | "SCHEDULED" = "ACTIVE";

    try {
      const fired = await this.engine().fireCustomFromDraft(
        draft.sessionId,
        {
          draftId: draft.draftId,
          template,
          applyTiming,
          scheduledFor: draft.schedule?.scheduledFor,
          sourcePromptHash: draft.studioOutput.meta.sourcePromptHash,
        },
        actor
      );
      simulationEventId = fired.id;
      patchSequence = fired.patchSequence;
      status = fired.status === "ACTIVE" ? "ACTIVE" : "SCHEDULED";

      if (applyTiming === "IMMEDIATE") {
        news.publishedAt = nowIso();
        news.simulationEventId = simulationEventId;
        news.patchSequence = patchSequence;
        this.store().saveNews(news);
        notifyNewsPublished(draft.sessionId, {
          newsId,
          headline: news.headline,
          severity: news.severity,
          category: news.category,
          displayMode: news.displayMode,
        });
        draft.status = "APPLIED";
      } else {
        this.store().saveNews(news);
        this.store().registerPendingNews(simulationEventId, newsId);
        draft.status = "PUBLISHED";
      }

      draft.newsPublication = news;
      draft.simulationEventId = simulationEventId;
      draft.patchSequence = patchSequence;
      draft.customEvent = {
        eventId: simulationEventId,
        draftId: draft.draftId,
        templateId: template.eventId,
        title: template.title,
        category: template.category,
        generatedFromPrompt: draft.studioOutput.meta.sourcePromptHash,
        approvedBy: actor.userId,
        approvedAt: nowIso(),
      };
      draft.updatedAt = nowIso();

      const result: ApproveResult = {
        simulationEventId,
        newsId,
        patchSequence,
        status,
        idempotencyKey: params.idempotencyKey,
      };
      if (params.idempotencyKey) {
        draft.idempotencyResults[params.idempotencyKey] = result;
      }
      this.store().saveDraft(draft);
      return result;
    } catch (e) {
      const partialNews = this.store().getNews(newsId);
      if (partialNews && !partialNews.publishedAt) {
        // rollback unpublished news on failure
        const snap = this.store().getSnapshot();
        snap.news = snap.news.filter((n) => n.newsId !== newsId);
        this.store().restoreSnapshot(snap);
      }
      throw e;
    }
  }

  /** Called when a scheduled studio event becomes ACTIVE */
  completeScheduledPublication(sessionId: string, simulationEventId: string) {
    const pending = this.store().consumePendingNews(simulationEventId);
    if (!pending) return;

    pending.publishedAt = nowIso();
    pending.simulationEventId = simulationEventId;
    this.store().saveNews(pending);

    const draft = this.store().findDraftBySimulationEventId(simulationEventId);
    if (draft) {
      draft.status = "APPLIED";
      draft.newsPublication = pending;
      draft.updatedAt = nowIso();
      this.store().saveDraft(draft);
    }

    notifyNewsPublished(sessionId, {
      newsId: pending.newsId,
      headline: pending.headline,
      severity: pending.severity,
      category: pending.category,
      displayMode: pending.displayMode,
    });

    onIntelligenceEventActivated(simulationEventId);
  }

  cancelDraft(draftId: string, reason: string, actor: GmActor) {
    const draft = this.requireDraft(draftId);
    if (["APPLIED", "EXPIRED"].includes(draft.status)) {
      throw new BspError("ERR_STUDIO_STATE", "Cannot cancel applied draft", 409);
    }
    draft.status = "CANCELLED";
    draft.cancelReason = reason;
    draft.cancelledAt = nowIso();
    draft.updatedAt = nowIso();
    void actor;
    this.store().saveDraft(draft);
    return draft;
  }

  /** V1 catalog event → learner breaking news (GM Desk fireEvent) */
  publishCatalogEventNews(
    sessionId: string,
    params: {
      headline: string;
      summary: string;
      articleBody?: string;
      category: string;
      simulationEventId: string;
      severity?: NewsPublication["severity"];
      displayMode?: NewsPublication["displayMode"];
    }
  ): NewsPublication {
    const newsId = uuid();
    const news: NewsPublication = {
      newsId,
      draftId: `catalog-${params.simulationEventId}`,
      sessionId,
      headline: params.headline,
      summary: params.summary,
      articleBody: params.articleBody ?? params.summary,
      category: params.category,
      severity: params.severity ?? "MEDIUM",
      displayMode: params.displayMode ?? "DIRECTIONAL",
      publishedAt: nowIso(),
      effectiveAt: nowIso(),
      duration: "—",
      affectedAreas: [],
      selectedScenario: "neutral",
      simulationEventId: params.simulationEventId,
    };
    this.store().saveNews(news);
    notifyNewsPublished(sessionId, {
      newsId,
      headline: news.headline,
      severity: news.severity,
      category: news.category,
      displayMode: news.displayMode,
    });
    return news;
  }

  listSessionNews(sessionId: string, companyId?: string) {
    const news = this.store().listNewsBySession(sessionId);
    const acks = this.store().listAcknowledgements(sessionId, companyId);
    const ackSet = new Set(acks.map((a) => a.newsId));
    return news.map((n) => {
      const ackMeta = {
        acknowledged: companyId ? ackSet.has(n.newsId) : undefined,
        unread: companyId ? !ackSet.has(n.newsId) : undefined,
      };
      if (companyId) {
        const learnerSummary =
          n.instructorSummary !== undefined
            ? n.summary
            : stripInstructorMetaFromLearnerText(n.summary) || n.articleBody.split("\n")[0]?.trim() || n.summary;
        const { instructorSummary: _omit, ...learnerNews } = n;
        return { ...learnerNews, summary: learnerSummary, ...ackMeta };
      }
      return { ...n, ...ackMeta };
    });
  }

  acknowledgeNews(newsId: string, sessionId: string, companyId: string, userId: string): EventAcknowledgement {
    const news = this.store().getNews(newsId);
    if (!news || news.sessionId !== sessionId) {
      throw new BspError("ERR_NOT_FOUND", "News not found", 404);
    }
    if (!news.publishedAt) {
      throw new BspError("ERR_STUDIO_STATE", "News is not yet published", 422);
    }

    const ack: EventAcknowledgement = {
      id: uuid(),
      newsId,
      sessionId,
      companyId,
      userId,
      acknowledgedAt: nowIso(),
    };
    this.store().saveAcknowledgement(ack);
    return ack;
  }

  markReviewed(draftId: string) {
    const draft = this.requireDraft(draftId);
    if (draft.status === "GENERATED") {
      draft.status = "REVIEWED";
      draft.updatedAt = nowIso();
      this.store().saveDraft(draft);
    }
    return draft;
  }

  private requireDraft(draftId: string): EventScenarioDraft {
    const draft = this.store().getDraft(draftId);
    if (!draft) throw new BspError("ERR_NOT_FOUND", "Draft not found", 404);
    return draft;
  }

  private validateInput(input: EventStudioInput) {
    if (!input.naturalLanguagePrompt || input.naturalLanguagePrompt.length < 20) {
      throw new BspError("ERR_STUDIO_INPUT", "naturalLanguagePrompt must be 20+ chars", 400);
    }
  }

  private async requireRunningSession(sessionId: string) {
    const desk = await this.engine().getGmDesk(sessionId);
    if (desk.sessionPhase === "FINISHED") {
      throw new BspError("ERR_SESSION_FINISHED", "Session is finished", 409);
    }
  }
}

const globalSvc = globalThis as unknown as { scenarioStudioService?: ScenarioStudioService };

export function getScenarioStudioService(getEngine: () => GameEngine): ScenarioStudioService {
  if (!globalSvc.scenarioStudioService) {
    globalSvc.scenarioStudioService = new ScenarioStudioService(getEngine);
  }
  return globalSvc.scenarioStudioService;
}

export function resetScenarioStudioService() {
  delete globalSvc.scenarioStudioService;
}
