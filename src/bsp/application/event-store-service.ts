import type { EventStoreRepository } from "./ports/repositories";
import { DOMAIN_EVENT_TYPES } from "../domain/events/domain-event-types";
import type { EconomyValues } from "../domain/types";

export class EventStoreService {
  constructor(private readonly events: EventStoreRepository) {}

  async recordDecisionPosted(input: {
    sessionId: string;
    companyId: string;
    step: string;
    periodId: string;
    decisionId: string;
  }) {
    return this.events.append({
      sessionId: input.sessionId,
      eventType: DOMAIN_EVENT_TYPES.DECISION_POSTED,
      aggregateType: "Decision",
      aggregateId: input.decisionId,
      payload: {
        companyId: input.companyId,
        step: input.step,
        periodId: input.periodId,
        decisionId: input.decisionId,
      },
      occurredAt: new Date(),
    });
  }

  async recordJournalPosted(input: {
    sessionId: string;
    companyId: string;
    journalId: string;
    transactionType: string;
  }) {
    return this.events.append({
      sessionId: input.sessionId,
      eventType: DOMAIN_EVENT_TYPES.JOURNAL_POSTED,
      aggregateType: "JournalEntry",
      aggregateId: input.journalId,
      payload: {
        companyId: input.companyId,
        journalId: input.journalId,
        transactionType: input.transactionType,
      },
      occurredAt: new Date(),
    });
  }

  async recordStepAdvanced(input: {
    sessionId: string;
    fromPhase: string;
    toPhase: string;
  }) {
    return this.events.append({
      sessionId: input.sessionId,
      eventType: DOMAIN_EVENT_TYPES.STEP_ADVANCED,
      aggregateType: "GameProgress",
      aggregateId: input.sessionId,
      payload: { fromPhase: input.fromPhase, toPhase: input.toPhase },
      occurredAt: new Date(),
    });
  }

  async recordHalfClosed(input: {
    sessionId: string;
    periodLabel: string;
    periodIndex: number;
  }) {
    return this.events.append({
      sessionId: input.sessionId,
      eventType: DOMAIN_EVENT_TYPES.HALF_CLOSED,
      aggregateType: "FiscalPeriod",
      aggregateId: input.sessionId,
      payload: { periodLabel: input.periodLabel, periodIndex: input.periodIndex },
      occurredAt: new Date(),
    });
  }

  async recordPeriodStarted(input: {
    sessionId: string;
    periodIndex: number;
    periodLabel: string;
  }) {
    return this.events.append({
      sessionId: input.sessionId,
      eventType: DOMAIN_EVENT_TYPES.PERIOD_STARTED,
      aggregateType: "FiscalPeriod",
      aggregateId: input.sessionId,
      payload: { periodIndex: input.periodIndex, periodLabel: input.periodLabel },
      occurredAt: new Date(),
    });
  }

  async recordGameEnded(input: { sessionId: string }) {
    return this.events.append({
      sessionId: input.sessionId,
      eventType: DOMAIN_EVENT_TYPES.GAME_ENDED,
      aggregateType: "GameSession",
      aggregateId: input.sessionId,
      payload: {},
      occurredAt: new Date(),
    });
  }

  async recordEconomyPresetApplied(input: {
    sessionId: string;
    presetId: string;
    values: EconomyValues;
  }) {
    return this.events.append({
      sessionId: input.sessionId,
      eventType: DOMAIN_EVENT_TYPES.ECONOMY_PRESET_APPLIED,
      aggregateType: "GameSession",
      aggregateId: input.sessionId,
      payload: { presetId: input.presetId, values: input.values },
      occurredAt: new Date(),
    });
  }

  async recordEconomyPatched(input: {
    sessionId: string;
    sequence: number;
    source: string;
    simulationEventId?: string;
    diff: Array<{ key: string; before: number; after: number }>;
  }) {
    return this.events.append({
      sessionId: input.sessionId,
      eventType: DOMAIN_EVENT_TYPES.ECONOMY_PATCHED,
      aggregateType: "GameSession",
      aggregateId: input.sessionId,
      payload: {
        sequence: input.sequence,
        source: input.source,
        simulationEventId: input.simulationEventId,
        diff: input.diff,
      },
      occurredAt: new Date(),
    });
  }

  async listSessionEvents(sessionId: string) {
    return this.events.listBySession(sessionId);
  }
}
