import {
  REALTIME_EVENT_TYPES,
  type RealtimeEventType,
  type RealtimeSyncHint,
} from "../../domain/realtime/realtime-event-types";
import { getRealtimeHub } from "./realtime-hub";

export function broadcastRealtime(
  sessionId: string,
  type: RealtimeEventType,
  payload: Record<string, unknown> = {},
  companyId?: string
) {
  const hub = getRealtimeHub();
  if (!hub) return;
  hub.broadcast(sessionId, { type, sessionId, companyId, payload, ts: Date.now() });
}

export function pushSyncHint(sessionId: string, hint: RealtimeSyncHint) {
  getRealtimeHub()?.pushSyncHint(sessionId, hint);
}

export function notifyStepAdvanced(sessionId: string, fromPhase: string, toPhase: string) {
  broadcastRealtime(sessionId, REALTIME_EVENT_TYPES.STEP_ADVANCED, { fromPhase, toPhase });
  pushSyncHint(sessionId, { stepPhase: toPhase });
}

export function notifyStepReopened(sessionId: string, fromPhase: string, toPhase: string) {
  broadcastRealtime(sessionId, REALTIME_EVENT_TYPES.STEP_REOPENED, { fromPhase, toPhase });
  pushSyncHint(sessionId, { stepPhase: toPhase });
}

export function notifyPause(sessionId: string) {
  broadcastRealtime(sessionId, REALTIME_EVENT_TYPES.PAUSE, {});
  pushSyncHint(sessionId, { sessionPhase: "PAUSED" });
}

export function notifyResume(sessionId: string) {
  broadcastRealtime(sessionId, REALTIME_EVENT_TYPES.RESUME, {});
  pushSyncHint(sessionId, { sessionPhase: "RUNNING" });
}

export function notifyForceSubmit(sessionId: string, companyIds: string[]) {
  broadcastRealtime(sessionId, REALTIME_EVENT_TYPES.FORCE_SUBMIT, { companyIds });
  broadcastRealtime(sessionId, REALTIME_EVENT_TYPES.RANKING_UPDATED, {});
}

export function notifyZeroSubmit(sessionId: string, companyIds: string[]) {
  broadcastRealtime(sessionId, REALTIME_EVENT_TYPES.ZERO_SUBMIT, { companyIds });
  broadcastRealtime(sessionId, REALTIME_EVENT_TYPES.RANKING_UPDATED, {});
}

export function notifySettlementComplete(sessionId: string, periodIndex: number) {
  broadcastRealtime(sessionId, REALTIME_EVENT_TYPES.SETTLEMENT_COMPLETE, { periodIndex });
  pushSyncHint(sessionId, { stepPhase: "HALF_YEAR_END" });
}

export function notifyNextHalfStarted(sessionId: string, periodLabel: string, periodIndex: number) {
  broadcastRealtime(sessionId, REALTIME_EVENT_TYPES.NEXT_HALF_STARTED, { periodLabel, periodIndex });
  pushSyncHint(sessionId, { stepPhase: "STEP1_FINANCE", periodLabel });
}

export function notifyGameEnd(sessionId: string) {
  broadcastRealtime(sessionId, REALTIME_EVENT_TYPES.GAME_END, {});
  pushSyncHint(sessionId, { sessionPhase: "FINISHED", stepPhase: "GAME_END" });
}

export function notifyEconomyChanged(sessionId: string, source: string, sequence?: number) {
  broadcastRealtime(sessionId, REALTIME_EVENT_TYPES.ECONOMY_CHANGED, { source, sequence });
  pushSyncHint(sessionId, { environmentChangedBadge: true });
}

export function notifyEventFired(sessionId: string, templateId: string, title: string) {
  broadcastRealtime(sessionId, REALTIME_EVENT_TYPES.EVENT_FIRED, { templateId, title });
}

export function notifyTeamSubmitted(sessionId: string, companyId: string, step: string, teamName?: string) {
  broadcastRealtime(sessionId, REALTIME_EVENT_TYPES.TEAM_SUBMITTED, { step, teamName }, companyId);
  broadcastRealtime(sessionId, REALTIME_EVENT_TYPES.DASHBOARD_UPDATED, {}, companyId);
  broadcastRealtime(sessionId, REALTIME_EVENT_TYPES.RANKING_UPDATED, {});
}

export function notifyAuditLog(sessionId: string, action: string) {
  broadcastRealtime(sessionId, REALTIME_EVENT_TYPES.AUDIT_LOG, { action });
}

export function notifyStepLock(sessionId: string, locked: boolean) {
  broadcastRealtime(
    sessionId,
    locked ? REALTIME_EVENT_TYPES.STEP_LOCKED : REALTIME_EVENT_TYPES.STEP_UNLOCKED,
    { stepLocked: locked }
  );
  pushSyncHint(sessionId, { stepLocked: locked });
}

export function notifyNewsPublished(
  sessionId: string,
  payload: {
    newsId: string;
    headline: string;
    severity: string;
    category: string;
    displayMode: string;
  }
) {
  broadcastRealtime(sessionId, REALTIME_EVENT_TYPES.NEWS_PUBLISHED, payload);
}
