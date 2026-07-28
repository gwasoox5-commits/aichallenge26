export const DOMAIN_EVENT_TYPES = {
  DECISION_POSTED: "decision.posted",
  DECISION_VALIDATED: "decision.validated",
  JOURNAL_POSTED: "journal.posted",
  ECONOMY_PRESET_APPLIED: "economy.preset.applied",
  ECONOMY_PATCHED: "economy.patched",
  SETTLEMENT_COMPLETED: "settlement.completed",
  HALF_CLOSED: "half.closed",
  PERIOD_STARTED: "period.started",
  GAME_ENDED: "game.ended",
  SESSION_STARTED: "session.started",
  STEP_ADVANCED: "step.advanced",
} as const;

export type DomainEventType = (typeof DOMAIN_EVENT_TYPES)[keyof typeof DOMAIN_EVENT_TYPES];

export interface DomainEventPayload {
  [DOMAIN_EVENT_TYPES.DECISION_POSTED]: {
    companyId: string;
    step: string;
    periodId: string;
    decisionId: string;
  };
  [DOMAIN_EVENT_TYPES.JOURNAL_POSTED]: {
    companyId: string;
    journalId: string;
    transactionType: string;
  };
  [DOMAIN_EVENT_TYPES.ECONOMY_PRESET_APPLIED]: {
    presetId: string;
    values: Record<string, unknown>;
  };
  [DOMAIN_EVENT_TYPES.STEP_ADVANCED]: {
    fromPhase: string;
    toPhase: string;
  };
}
