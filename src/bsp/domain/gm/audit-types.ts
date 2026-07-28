import type { AuthRole } from "../auth/types";

export const GM_AUDIT_ACTIONS = {
  LOGIN: "LOGIN",
  JOIN: "JOIN",
  DECISION_SUBMIT: "DECISION_SUBMIT",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  STEP_ADVANCE: "STEP_ADVANCE",
  PAUSE: "PAUSE",
  RESUME: "RESUME",
  FORCE_SUBMIT: "FORCE_SUBMIT",
  ZERO_SUBMIT: "ZERO_SUBMIT",
  REOPEN_STEP: "REOPEN_STEP",
  LOCK_STEP: "LOCK_STEP",
  UNLOCK_STEP: "UNLOCK_STEP",
  CLOSE_PERIOD: "CLOSE_PERIOD",
  START_NEXT_HALF: "START_NEXT_HALF",
  GAME_END: "GAME_END",
  ECONOMY_CHANGE: "ECONOMY_CHANGE",
  EVENT_APPLY: "EVENT_APPLY",
  EVENT_FIRED: "EVENT_FIRED",
  EVENT_SCHEDULED: "EVENT_SCHEDULED",
  EVENT_ENDED: "EVENT_ENDED",
  EVENT_EXPIRED: "EVENT_EXPIRED",
  EVENT_CREATED: "EVENT_CREATED",
  SETTLEMENT: "SETTLEMENT",
  BALANCE_SHEET_VALIDATION: "BALANCE_SHEET_VALIDATION",
  EVENT_AI_DRAFT_CREATED: "EVENT_AI_DRAFT_CREATED",
  EVENT_AI_DRAFT_EDITED: "EVENT_AI_DRAFT_EDITED",
  EVENT_AI_APPROVED: "EVENT_AI_APPROVED",
  EVENT_AI_DRAFT_REJECTED: "EVENT_AI_DRAFT_REJECTED",
  NEWS_PUBLISHED: "NEWS_PUBLISHED",
} as const;

export type GmAuditAction = (typeof GM_AUDIT_ACTIONS)[keyof typeof GM_AUDIT_ACTIONS];

export interface GmAuditLogEntry {
  id: string;
  sessionId?: string;
  actorId: string;
  actorRole: AuthRole;
  action: GmAuditAction;
  reason?: string;
  targetCompanyId?: string;
  targetTeamName?: string;
  payload: Record<string, unknown>;
  occurredAt: Date;
}

export interface GmActor {
  userId: string;
  role: AuthRole;
  reason?: string;
}
