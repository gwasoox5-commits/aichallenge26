"use client";

import Link from "next/link";
import { useState } from "react";
import { authFetch } from "@/lib/bsp/auth-client";
import { useRealtime } from "@/lib/bsp/use-realtime";
import { GmConfirmDialog } from "@/components/gm/GmConfirmDialog";
import { GmTeamTable } from "@/components/gm/GmTeamTable";
import { MarketClearingResultsPanel } from "@/components/bsp/MarketClearingResultsPanel";
import type { GmDeskDto } from "@/src/bsp/domain/types";
import { formatPeriodLabel, formatStepPhaseLabel } from "@/src/bsp/domain/period/display-labels";
import { formatStepTime } from "@/lib/bsp/step-timer";
import { useStepCountdown } from "@/lib/bsp/use-step-countdown";

type Props = {
  sessionId: string;
  desk: GmDeskDto | null;
  onRefresh: () => Promise<void>;
  onMessage: (msg: string) => void;
  message?: string;
};

type PendingAction = {
  key: string;
  title: string;
  description: string;
  confirmLabel: string;
  confirmTone?: "default" | "danger" | "warning";
  endpoint: string;
  method?: "POST" | "DELETE";
  body?: Record<string, unknown>;
  /** Follow-up dialog when the server rejects with this error code. */
  escalateOn?: { code: string; next: (message: string) => PendingAction };
};

export function AdminDashboard({ sessionId, desk, onRefresh, onMessage, message }: Props) {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [reason, setReason] = useState("");

  useRealtime({
    sessionId,
    onSync: () => {
      void onRefresh();
    },
    onEvent: () => {
      void onRefresh();
    },
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  const remainingTimeSec = useStepCountdown({
    stepStartedAt: desk?.stepStartedAt,
    stepDurationSec: desk?.stepDurationSec,
    remainingTimeSec: desk?.remainingTimeSec,
    enabled: !!desk,
  });

  const openAction = (action: PendingAction) => setPending(action);

  const executeAction = async () => {
    if (!pending) return;
    setLoading(true);
    const method = pending.method ?? "POST";
    const res = await authFetch(pending.endpoint, {
      method,
      ...(method === "POST"
        ? {
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...pending.body, reason }),
          }
        : {}),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      onMessage(`${pending.title} 완료`);
      await onRefresh();
      setPending(null);
    } else if (pending.escalateOn && data.code === pending.escalateOn.code) {
      setPending(pending.escalateOn.next(data.error ?? ""));
    } else {
      onMessage(data.error ?? "작업 실패");
      setPending(null);
    }
    setLoading(false);
  };

  const submittedCount = desk ? desk.totalTeamCount - desk.unsubmittedTeamCount : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">운영 개요</h2>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void handleRefresh()}
            disabled={refreshing || loading}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50"
          >
            {refreshing ? "새로고침 중…" : "새로고침"}
          </button>
          <Link href="/admin/control" className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-500">
            게임 진행 →
          </Link>
          <Link href="/admin/sessions/new" className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">
            새 세션
          </Link>
        </div>
      </div>

      {!desk ? (
        <p className="text-sm text-slate-500">
          {message || "세션 정보를 불러오는 중…"}
        </p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="세션 상태" value={desk.sessionPhase} />
            <StatCard label="현재 반기" value={formatPeriodLabel(desk.periodLabel)} />
            <StatCard label="현재 Step" value={formatStepPhaseLabel(desk.stepPhase)} />
            <StatCard label="참여 팀" value={`${desk.totalTeamCount}팀`} />
            <StatCard label="제출 완료" value={`${submittedCount}팀`} tone="success" />
            <StatCard label="미제출" value={`${desk.unsubmittedTeamCount}팀`} tone={desk.unsubmittedTeamCount > 0 ? "warning" : "default"} />
            <StatCard label="제출률" value={`${desk.submitRatePercent}%`} />
            <StatCard label="남은 시간" value={formatStepTime(remainingTimeSec)} />
          </div>

          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="mb-3 font-semibold">빠른 작업</h3>
            <div className="flex flex-wrap gap-2">
              {desk.sessionPhase === "PAUSED" ? (
                <QuickBtn
                  label="Resume"
                  onClick={() =>
                    openAction({
                      key: "resume",
                      title: "재개",
                      description: "세션을 재개합니다.",
                      confirmLabel: "재개",
                      endpoint: `/api/v1/gm/sessions/${sessionId}/resume`,
                    })
                  }
                />
              ) : (
                <QuickBtn
                  label="Pause"
                  tone="warning"
                  onClick={() =>
                    openAction({
                      key: "pause",
                      title: "일시정지",
                      description: "CEO 입력을 일시 중단합니다.",
                      confirmLabel: "일시정지",
                      confirmTone: "warning",
                      endpoint: `/api/v1/gm/sessions/${sessionId}/pause`,
                    })
                  }
                />
              )}
              <QuickBtn
                label="다음 Step"
                onClick={() =>
                  openAction({
                    key: "advance",
                    title: "다음 Step",
                    description: `현재 ${formatStepPhaseLabel(desk.stepPhase)} → 다음 Step으로 진행합니다. 미제출 팀 ${desk.unsubmittedTeamCount}개.`,
                    confirmLabel: "진행",
                    confirmTone: desk.unsubmittedTeamCount > 0 ? "warning" : "default",
                    endpoint: `/api/v1/gm/sessions/${sessionId}/advance-step`,
                  })
                }
              />
              <QuickBtn
                label="반기 결산"
                onClick={() =>
                  openAction({
                    key: "close",
                    title: "반기 결산",
                    description: "모든 팀의 반기 결산을 실행합니다.",
                    confirmLabel: "결산 실행",
                    confirmTone: "warning",
                    endpoint: `/api/v1/gm/sessions/${sessionId}/close-period`,
                  })
                }
              />
              <QuickBtn
                label="다음 반기"
                disabled={!desk.canStartNextHalf}
                onClick={() =>
                  openAction({
                    key: "next-half",
                    title: "다음 반기",
                    description: "다음 반기를 시작합니다.",
                    confirmLabel: "시작",
                    endpoint: `/api/v1/gm/sessions/${sessionId}/start-next-half`,
                  })
                }
              />
              <Link href="/admin/event-studio" className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">
                이벤트 생성
              </Link>
              <Link href="/admin/intelligence" className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">
                Breaking News
              </Link>
              <Link href="/admin/world" className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">
                World Evolution
              </Link>
            </div>
          </section>

          {desk.marketResults?.material?.visible && (
            <MarketClearingResultsPanel marketResults={desk.marketResults} variant="admin" />
          )}

          <GmTeamTable
            desk={desk}
            onForceSubmit={(companyId) =>
              openAction({
                key: "force",
                title: "강제 제출",
                description: "해당 팀의 현재 Step을 강제 제출합니다.",
                confirmLabel: "강제 제출",
                confirmTone: "warning",
                endpoint: `/api/v1/gm/sessions/${sessionId}/force-submit`,
                body: { companyId },
              })
            }
            onZeroSubmit={(companyId) =>
              openAction({
                key: "zero",
                title: "Zero Submit",
                description: "해당 팀에 기본값(0) 제출을 적용합니다.",
                confirmLabel: "Zero Submit",
                confirmTone: "warning",
                endpoint: `/api/v1/gm/sessions/${sessionId}/zero-submit`,
                body: { companyId },
              })
            }
            onDeleteTeam={(companyId, teamName) =>
              openAction({
                key: "delete-team",
                title: `${teamName} 팀 삭제`,
                description: "참가 정원에서 이 팀을 제거합니다. 제출 기록이 있으면 다시 확인합니다.",
                confirmLabel: "팀 삭제",
                confirmTone: "danger",
                endpoint: `/api/v1/gm/sessions/${sessionId}/companies/${companyId}`,
                method: "DELETE",
                escalateOn: {
                  code: "ERR_TEAM_HAS_SUBMISSIONS",
                  next: (msg) => ({
                    key: "delete-team-force",
                    title: `${teamName} 팀 강제 삭제`,
                    description: `${msg} 제출 기록과 분개장까지 모두 삭제됩니다.`,
                    confirmLabel: "기록까지 삭제",
                    confirmTone: "danger",
                    endpoint: `/api/v1/gm/sessions/${sessionId}/companies/${companyId}?force=1`,
                    method: "DELETE",
                  }),
                },
              })
            }
          />

          <section className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
            <h3 className="text-sm font-semibold text-indigo-900">참가 안내</h3>
            <p className="mt-1 text-sm text-indigo-800">
              학습자 접속 URL: <code className="rounded bg-white px-1">{typeof window !== "undefined" ? `${window.location.origin}/join?code=${desk.joinCode}` : `/join?code=…`}</code>
            </p>
            <p className="mt-1 text-xs text-indigo-700">참가 코드는 강사만 확인하세요. 학습자에게는 URL 또는 코드만 공유합니다.</p>
          </section>
        </>
      )}

      {message && <p className="text-sm text-indigo-700">{message}</p>}

      {pending && (
        <GmConfirmDialog
          open
          title={pending.title}
          description={pending.description}
          confirmLabel={pending.confirmLabel}
          confirmTone={pending.confirmTone}
          requireReason={false}
          reason={reason}
          onReasonChange={setReason}
          loading={loading}
          onConfirm={executeAction}
          onCancel={() => setPending(null)}
        />
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "success" | "warning";
}) {
  const toneClass =
    tone === "success" ? "border-emerald-200 bg-emerald-50" : tone === "warning" ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-white";
  return (
    <div className={`rounded-xl border p-4 ${toneClass}`}>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function QuickBtn({
  label,
  onClick,
  disabled,
  tone,
}: {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  tone?: "warning";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg px-3 py-1.5 text-sm disabled:opacity-40 ${
        tone === "warning" ? "border border-amber-300 text-amber-800 hover:bg-amber-50" : "border border-slate-300 hover:bg-slate-50"
      }`}
    >
      {label}
    </button>
  );
}
