"use client";

import { useCallback, useEffect, useState } from "react";
import { authFetch } from "@/lib/bsp/auth-client";
import { useRealtime } from "@/lib/bsp/use-realtime";
import { RealtimeIndicator } from "@/components/bsp/RealtimeIndicator";
import type { GmDeskDto } from "@/src/bsp/domain/types";
import type { GmAuditLogEntry } from "@/src/bsp/domain/gm/audit-types";
import { GmConfirmDialog } from "./GmConfirmDialog";
import { GmAuditLogPanel } from "./GmAuditLogPanel";
import { GmEventControlPanel } from "./GmEventControlPanel";
import { GmEconomyControlPanel } from "./GmEconomyControlPanel";
import { GmOpsSummaryPanel, getGmRecommendedAction } from "./GmOpsSummaryPanel";
import { GmStatusBanner, GmTeamTable, STEP_LABELS } from "./GmTeamTable";
import { MarketClearingResultsPanel } from "@/components/bsp/MarketClearingResultsPanel";

type PendingAction = {
  key: string;
  title: string;
  description: string;
  confirmLabel: string;
  confirmTone?: "default" | "danger" | "warning";
  endpoint: string;
  body?: Record<string, unknown>;
};

type Props = {
  sessionId: string;
  desk: GmDeskDto;
  onRefresh: () => Promise<void>;
  onMessage: (msg: string) => void;
};

export function GmCommandCenter({ sessionId, desk, onRefresh, onMessage }: Props) {
  const [loading, setLoading] = useState(false);
  const [auditLog, setAuditLog] = useState<GmAuditLogEntry[]>([]);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [reason, setReason] = useState("");
  const [gmTab, setGmTab] = useState<"ops" | "events" | "economy">("ops");

  const loadAudit = useCallback(async () => {
    const res = await authFetch(`/api/v1/gm/sessions/${sessionId}/audit-log`);
    if (res.ok) setAuditLog(await res.json());
  }, [sessionId]);

  const { connectionState, flash } = useRealtime({
    sessionId,
    onSync: () => {
      onRefresh();
      loadAudit();
    },
    onEvent: () => {
      onRefresh();
      loadAudit();
    },
  });

  useEffect(() => {
    loadAudit();
  }, [loadAudit]);

  const openAction = (action: PendingAction) => {
    setReason("");
    setPending(action);
  };

  const executeAction = async () => {
    if (!pending) return;
    setLoading(true);
    const res = await authFetch(pending.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...pending.body, reason }),
    });
    const data = await res.json();
    if (res.ok) {
      onMessage(`${pending.title} 완료`);
      await onRefresh();
      await loadAudit();
    } else {
      onMessage(data.error ?? "操作 실패");
    }
    setPending(null);
    setLoading(false);
  };

  const canAdvance =
    desk.sessionPhase === "RUNNING" &&
    !desk.stepPhase.startsWith("HALF") &&
    desk.stepPhase !== "GAME_END" &&
    desk.stepPhase !== "STEP7_SETTLEMENT";

  const recommended = getGmRecommendedAction(desk);

  const triggerRecommended = () => {
    const map: Record<string, PendingAction> = {
      pause: {
        key: "pause",
        title: "일시정지",
        description: "CEO 입력을 일시 중단합니다.",
        confirmLabel: "일시정지",
        confirmTone: "warning",
        endpoint: `/api/v1/gm/sessions/${sessionId}/pause`,
      },
      resume: {
        key: "resume",
        title: "재개",
        description: "세션을 재개합니다.",
        confirmLabel: "재개",
        endpoint: `/api/v1/gm/sessions/${sessionId}/resume`,
      },
      advance: {
        key: "advance",
        title: "다음 Step",
        description: `현재 ${STEP_LABELS[desk.stepPhase]} → 다음 Step으로 진행합니다.`,
        confirmLabel: "다음 Step",
        endpoint: `/api/v1/gm/sessions/${sessionId}/advance-step`,
      },
      "zero-all": {
        key: "zero-all",
        title: "미제출 Zero Submit",
        description: `${desk.unsubmittedTeamCount}팀에 D-10 zero decision을 적용합니다.`,
        confirmLabel: "Zero Submit (전체)",
        confirmTone: "warning",
        endpoint: `/api/v1/gm/sessions/${sessionId}/zero-submit`,
      },
      close: {
        key: "close",
        title: "반기 종료 (결산)",
        description: "현재 반기 결산을 실행합니다.",
        confirmLabel: "반기 종료",
        endpoint: `/api/v1/gm/sessions/${sessionId}/close-period`,
      },
      "next-half": {
        key: "next-half",
        title: "다음 반기 시작",
        description: `P${desk.periodIndex + 1} 반기를 시작합니다.`,
        confirmLabel: "다음 반기",
        endpoint: `/api/v1/gm/sessions/${sessionId}/start-next-half`,
      },
      "game-end": {
        key: "game-end",
        title: "게임 종료",
        description: "P6 결산 후 게임을 종료합니다.",
        confirmLabel: "게임 종료",
        confirmTone: "danger",
        endpoint: `/api/v1/gm/sessions/${sessionId}/game-end`,
      },
    };
    const action = map[recommended.key];
    if (action) openAction(action);
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <GmStatusBanner desk={desk} />
        <RealtimeIndicator connectionState={connectionState} flash={flash} />
      </div>

      <div className="flex gap-2 border-b border-slate-200 pb-2">
        {(
          [
            ["ops", "GM 운영"],
            ["events", "이벤트 제어"],
            ["economy", "경제 제어"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setGmTab(key)}
            className={`rounded-lg px-4 py-2 text-sm ${
              gmTab === key ? "bg-violet-600 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
            data-testid={`gm-tab-${key}`}
          >
            {label}
          </button>
        ))}
      </div>

      {gmTab === "ops" && (
      <>
      <GmOpsSummaryPanel
        desk={desk}
        recommendedLabel={recommended.label}
        recommendedDisabled={recommended.disabled}
        onRecommendedAction={triggerRecommended}
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">{desk.name}</h2>
                <p className="text-sm text-slate-600">
                  Join Code: <span className="font-mono text-violet-700">{desk.joinCode}</span>
                </p>
              </div>
              <button
                onClick={onRefresh}
                disabled={loading}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100"
              >
                새로고침
              </button>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-3">
              <div className="rounded-lg bg-slate-100 p-3">
                <span className="text-xs text-slate-500">경제 상태</span>
                <p className="mt-1 text-slate-800">{desk.economyLabel}</p>
              </div>
              <div className="rounded-lg bg-slate-100 p-3">
                <span className="text-xs text-slate-500">이벤트</span>
                <p className="mt-1 text-slate-800">{desk.currentEventState}</p>
              </div>
              <div className="rounded-lg bg-slate-100 p-3">
                <span className="text-xs text-slate-500">순위 1위</span>
                <p className="mt-1 text-slate-800">
                  {desk.ranking[0]?.teamName ?? "-"} ({desk.ranking[0]?.cashManwon.toLocaleString() ?? 0}만원)
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">GM 조작</p>
              <div className="flex flex-wrap gap-2">
                {desk.sessionPhase === "RUNNING" ? (
                  <button
                    onClick={() =>
                      openAction({
                        key: "pause",
                        title: "일시정지",
                        description: "CEO 입력을 일시 중단합니다. 재개 전까지 제출 불가.",
                        confirmLabel: "일시정지",
                        confirmTone: "warning",
                        endpoint: `/api/v1/gm/sessions/${sessionId}/pause`,
                      })
                    }
                    className="rounded-lg bg-amber-700 px-3 py-2 text-sm hover:bg-amber-600"
                  >
                    ⏸ Pause
                  </button>
                ) : desk.sessionPhase === "PAUSED" ? (
                  <button
                    onClick={() =>
                      openAction({
                        key: "resume",
                        title: "재개",
                        description: "세션을 재개합니다.",
                        confirmLabel: "재개",
                        endpoint: `/api/v1/gm/sessions/${sessionId}/resume`,
                      })
                    }
                    className="rounded-lg bg-emerald-700 px-3 py-2 text-sm hover:bg-emerald-600"
                  >
                    ▶ Resume
                  </button>
                ) : null}

                <button
                  onClick={() =>
                    openAction({
                      key: "advance",
                      title: "다음 Step",
                      description: `현재 ${STEP_LABELS[desk.stepPhase]} → 다음 Step으로 진행합니다.${desk.unsubmittedTeamCount > 0 ? ` (${desk.unsubmittedTeamCount}팀 미제출)` : ""}`,
                      confirmLabel: "다음 Step",
                      endpoint: `/api/v1/gm/sessions/${sessionId}/advance-step`,
                    })
                  }
                  disabled={!canAdvance}
                  className="rounded-lg bg-sky-600 px-3 py-2 text-sm hover:bg-sky-500 disabled:opacity-40"
                >
                  ▶ 다음 Step
                </button>

                <button
                  onClick={() =>
                    openAction({
                      key: "zero-all",
                      title: "미제출 Zero Submit",
                      description: `${desk.unsubmittedTeamCount}팀에 D-10 zero decision을 적용합니다.`,
                      confirmLabel: "Zero Submit (전체)",
                      confirmTone: "warning",
                      endpoint: `/api/v1/gm/sessions/${sessionId}/zero-submit`,
                    })
                  }
                  disabled={desk.unsubmittedTeamCount === 0 || !desk.stepPhase.startsWith("STEP")}
                  className="rounded-lg bg-amber-700 px-3 py-2 text-sm hover:bg-amber-600 disabled:opacity-40"
                >
                  Zero (미제출 전체)
                </button>

                <button
                  onClick={() =>
                    openAction({
                      key: "force-all",
                      title: "미제출 강제 제출",
                      description: "미제출 팀에 zero payload로 강제 제출합니다.",
                      confirmLabel: "Force Submit (전체)",
                      endpoint: `/api/v1/gm/sessions/${sessionId}/force-submit`,
                    })
                  }
                  disabled={desk.unsubmittedTeamCount === 0 || !desk.stepPhase.startsWith("STEP")}
                  className="rounded-lg bg-sky-800 px-3 py-2 text-sm hover:bg-sky-700 disabled:opacity-40"
                >
                  Force (미제출 전체)
                </button>

                <button
                  onClick={() =>
                    openAction({
                      key: "reopen",
                      title: "Step 재개",
                      description: "이전 Step으로 되돌리고 해당 Step 결정을 삭제합니다.",
                      confirmLabel: "Step 재개",
                      confirmTone: "warning",
                      endpoint: `/api/v1/gm/sessions/${sessionId}/reopen-step`,
                    })
                  }
                  disabled={desk.stepPhase === "STEP1_FINANCE" || desk.sessionPhase === "FINISHED"}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100 disabled:opacity-40"
                >
                  ↩ Reopen Step
                </button>

                {desk.stepLocked ? (
                  <button
                    onClick={() =>
                      openAction({
                        key: "unlock",
                        title: "Step 해제",
                        description: "CEO 제출을 다시 허용합니다.",
                        confirmLabel: "Step 해제",
                        endpoint: `/api/v1/gm/sessions/${sessionId}/unlock-step`,
                      })
                    }
                    className="rounded-lg border border-emerald-700 px-3 py-2 text-sm text-emerald-700 hover:bg-emerald-950"
                  >
                    🔓 Unlock
                  </button>
                ) : (
                  <button
                    onClick={() =>
                      openAction({
                        key: "lock",
                        title: "Step 잠금",
                        description: "CEO 제출을 차단합니다.",
                        confirmLabel: "Step 잠금",
                        confirmTone: "warning",
                        endpoint: `/api/v1/gm/sessions/${sessionId}/lock-step`,
                      })
                    }
                    disabled={desk.sessionPhase === "FINISHED"}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100 disabled:opacity-40"
                  >
                    🔒 Lock
                  </button>
                )}

                <button
                  onClick={() =>
                    openAction({
                      key: "close",
                      title: "반기 종료 (결산)",
                      description: "현재 반기 결산을 실행합니다.",
                      confirmLabel: "반기 종료",
                      endpoint: `/api/v1/gm/sessions/${sessionId}/close-period`,
                    })
                  }
                  disabled={desk.stepPhase !== "STEP7_SETTLEMENT"}
                  className="rounded-lg bg-emerald-600 px-3 py-2 text-sm hover:bg-emerald-500 disabled:opacity-40"
                >
                  반기 종료
                </button>

                <button
                  onClick={() =>
                    openAction({
                      key: "next-half",
                      title: "다음 반기 시작",
                      description: `P${desk.periodIndex + 1} 반기를 시작합니다.`,
                      confirmLabel: "다음 반기",
                      endpoint: `/api/v1/gm/sessions/${sessionId}/start-next-half`,
                    })
                  }
                  disabled={!desk.canStartNextHalf}
                  className="rounded-lg bg-violet-600 px-3 py-2 text-sm hover:bg-violet-500 disabled:opacity-40"
                >
                  다음 반기
                </button>

                <button
                  onClick={() =>
                    openAction({
                      key: "game-end",
                      title: "게임 종료",
                      description: "P6 결산 후 게임을 종료합니다.",
                      confirmLabel: "게임 종료",
                      confirmTone: "danger",
                      endpoint: `/api/v1/gm/sessions/${sessionId}/game-end`,
                    })
                  }
                  disabled={!desk.canEndGame}
                  className="rounded-lg bg-rose-600 px-3 py-2 text-sm hover:bg-rose-500 disabled:opacity-40"
                >
                  게임 종료
                </button>
              </div>
            </div>
          </div>

          <GmTeamTable
            desk={desk}
            onForceSubmit={(companyId) =>
              openAction({
                key: "force-one",
                title: "강제 제출",
                description: "선택 팀에 zero payload 강제 제출",
                confirmLabel: "Force Submit",
                endpoint: `/api/v1/gm/sessions/${sessionId}/force-submit`,
                body: { companyId },
              })
            }
            onZeroSubmit={(companyId) =>
              openAction({
                key: "zero-one",
                title: "Zero Submit",
                description: "선택 팀에 D-10 zero decision 적용",
                confirmLabel: "Zero Submit",
                confirmTone: "warning",
                endpoint: `/api/v1/gm/sessions/${sessionId}/zero-submit`,
                body: { companyId },
              })
            }
          />

          <MarketClearingResultsPanel marketResults={desk.marketResults} variant="gm" />
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="mb-3 font-semibold">팀 순위</h3>
            <ol className="space-y-2 text-sm">
              {desk.ranking.map((r) => (
                <li key={r.companyId} className="flex justify-between rounded bg-slate-50 px-3 py-2">
                  <span>
                    <span className="mr-2 text-violet-700">#{r.rank}</span>
                    {r.teamName}
                  </span>
                  <span className="font-mono text-slate-700">{r.cashManwon.toLocaleString()}</span>
                </li>
              ))}
              {desk.ranking.length === 0 && <p className="text-slate-500">팀 없음</p>}
            </ol>
          </div>
        </div>
      </div>

      <GmAuditLogPanel entries={auditLog} prominent />
      </>
      )}

      {gmTab === "events" && (
      <GmEventControlPanel
        sessionId={sessionId}
        year={desk.year}
        half={desk.half}
        onMessage={onMessage}
        onRefresh={onRefresh}
      />
      )}

      {gmTab === "economy" && (
      <GmEconomyControlPanel sessionId={sessionId} onMessage={onMessage} onRefresh={onRefresh} />
      )}

      <GmConfirmDialog
        open={!!pending}
        title={pending?.title ?? ""}
        description={pending?.description ?? ""}
        confirmLabel={pending?.confirmLabel ?? "확인"}
        confirmTone={pending?.confirmTone}
        reason={reason}
        onReasonChange={setReason}
        onConfirm={executeAction}
        onCancel={() => setPending(null)}
        loading={loading}
      />
    </>
  );
}
