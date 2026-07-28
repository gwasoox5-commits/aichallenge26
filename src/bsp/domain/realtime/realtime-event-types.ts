/** WebSocket realtime events — aligned with Event Store domain event types */
export const REALTIME_EVENT_TYPES = {
  STEP_ADVANCED: "step.advanced",
  STEP_REOPENED: "step.reopened",
  PAUSE: "session.paused",
  RESUME: "session.resumed",
  FORCE_SUBMIT: "gm.force_submit",
  ZERO_SUBMIT: "gm.zero_submit",
  SETTLEMENT_COMPLETE: "settlement.completed",
  NEXT_HALF_STARTED: "period.started",
  GAME_END: "game.ended",
  ECONOMY_CHANGED: "economy.changed",
  EVENT_FIRED: "event.fired",
  RANKING_UPDATED: "ranking.updated",
  TEAM_SUBMITTED: "team.submitted",
  DASHBOARD_UPDATED: "dashboard.updated",
  AUDIT_LOG: "audit.log",
  STEP_LOCKED: "step.locked",
  STEP_UNLOCKED: "step.unlocked",
  NEWS_PUBLISHED: "news.published",
} as const;

export type RealtimeEventType = (typeof REALTIME_EVENT_TYPES)[keyof typeof REALTIME_EVENT_TYPES];

export interface RealtimeEventEnvelope {
  type: RealtimeEventType;
  sessionId: string;
  companyId?: string;
  payload: Record<string, unknown>;
  ts: number;
  eventId: string;
}

export type RealtimeClientMessage =
  | { op: "ping" }
  | { op: "sync" }
  | { op: "pong" };

export type RealtimeServerMessage =
  | { op: "connected"; sessionId: string; role: string; connectionId: string }
  | { op: "sync"; hint: RealtimeSyncHint }
  | { op: "event"; event: RealtimeEventEnvelope }
  | { op: "pong" }
  | { op: "error"; code: string; message: string };

export interface RealtimeSyncHint {
  stepPhase?: string;
  sessionPhase?: string;
  stepLocked?: boolean;
  periodLabel?: string;
  submitRatePercent?: number;
  environmentChangedBadge?: boolean;
}

export const REALTIME_WS_PATH = "/api/v1/ws";
export const REALTIME_HEARTBEAT_MS = 30_000;
export const REALTIME_PONG_TIMEOUT_MS = 10_000;
export const REALTIME_RECONNECT_BASE_MS = 1_000;
export const REALTIME_RECONNECT_MAX_MS = 15_000;
