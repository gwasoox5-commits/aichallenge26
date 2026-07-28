"use client";

import type { GmAuditLogEntry } from "@/src/bsp/domain/gm/audit-types";

const ACTION_LABELS: Record<string, string> = {
  LOGIN: "Admin 로그인",
  JOIN: "CEO 참가",
  DECISION_SUBMIT: "의사결정 제출",
  VALIDATION_ERROR: "검증 오류",
  STEP_ADVANCE: "Step 진행",
  PAUSE: "일시정지",
  RESUME: "재개",
  FORCE_SUBMIT: "강제 제출",
  ZERO_SUBMIT: "Zero 제출",
  REOPEN_STEP: "Step 재개",
  LOCK_STEP: "Step 잠금",
  UNLOCK_STEP: "Step 해제",
  CLOSE_PERIOD: "반기 결산",
  START_NEXT_HALF: "다음 반기",
  GAME_END: "게임 종료",
  ECONOMY_CHANGE: "경제 변경",
  EVENT_APPLY: "이벤트 적용",
  SETTLEMENT: "결산",
};

type Props = {
  entries: GmAuditLogEntry[];
  prominent?: boolean;
};

export function GmAuditLogPanel({ entries, prominent }: Props) {
  return (
    <div
      className={`rounded-xl border bg-white p-6 ${
        prominent ? "border-violet-300 ring-1 ring-violet-200" : "border-slate-200"
      }`}
      data-testid="gm-audit-log"
      aria-label="GM 감사 로그"
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-violet-800">
          📋 감사 로그 (Audit Feed)
        </h3>
        <span className="rounded-full bg-violet-900/50 px-2 py-0.5 text-xs text-violet-700">
          {entries.length}건
        </span>
      </div>
      {entries.length === 0 ? (
        <p className="text-sm text-slate-500">GM 조작 기록 없음</p>
      ) : (
        <ul className={`space-y-2 overflow-y-auto text-sm ${prominent ? "max-h-80" : "max-h-64"}`}>
          {entries.map((e) => (
            <li key={e.id} className="rounded border border-slate-200 bg-slate-50 px-3 py-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-slate-200 px-2 py-0.5 text-xs text-violet-700">
                  {ACTION_LABELS[e.action] ?? e.action}
                </span>
                <span className="text-xs text-slate-500">
                  {new Date(e.occurredAt).toLocaleString("ko-KR")}
                </span>
                <span className="text-xs text-slate-600">
                  {e.actorRole} · {e.actorId.slice(0, 8)}
                </span>
              </div>
              {e.targetTeamName && (
                <p className="mt-1 text-xs text-slate-600">대상: {e.targetTeamName}</p>
              )}
              {e.reason && <p className="mt-1 text-xs text-amber-800/80">사유: {e.reason}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
