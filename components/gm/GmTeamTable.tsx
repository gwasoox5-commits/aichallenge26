"use client";

import type { GmDeskDto } from "@/src/bsp/domain/types";
import { formatPeriodLabel, STEP_PHASE_LABELS } from "@/src/bsp/domain/period/display-labels";
import { formatStepTime } from "@/lib/bsp/step-timer";
import { useStepCountdown } from "@/lib/bsp/use-step-countdown";

const STEP_LABELS = STEP_PHASE_LABELS;

type Props = {
  desk: GmDeskDto;
  onForceSubmit: (companyId: string) => void;
  onZeroSubmit: (companyId: string) => void;
  onDeleteTeam?: (companyId: string, teamName: string) => void;
};

export function GmTeamTable({ desk, onForceSubmit, onZeroSubmit, onDeleteTeam }: Props) {
  const currentStepLabel = STEP_LABELS[desk.stepPhase] ?? desk.stepPhase;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold">팀 관리</h3>
        <span className="text-xs text-slate-500">현재 Step: {currentStepLabel}</span>
      </div>
      {desk.teams.length === 0 ? (
        <p className="text-sm text-slate-500">참가 팀 없음 — CEO가 Join Code로 참가합니다.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-300 text-left text-slate-600">
                <th className="pb-2 pr-3">팀</th>
                <th className="pb-2 pr-3">제출</th>
                <th className="pb-2 pr-3">마지막 제출</th>
                <th className="pb-2 pr-3 text-right">현금</th>
                <th className="pb-2 pr-3 text-right">생산</th>
                <th className="pb-2 pr-3 text-right">판매</th>
                <th className="pb-2 pr-3">상태</th>
                <th className="pb-2">조작</th>
              </tr>
            </thead>
            <tbody>
              {desk.teams.map((t) => {
                const isUnsubmitted = !t.currentStepSubmitted && desk.stepPhase.startsWith("STEP");
                return (
                  <tr
                    key={t.companyId}
                    className={`border-b border-slate-200 ${isUnsubmitted ? "bg-amber-50" : ""}`}
                  >
                    <td className="py-2.5 pr-3 font-medium">{t.teamName}</td>
                    <td className="py-2.5 pr-3">
                      {t.currentStepSubmitted ? (
                        <span className="text-emerald-700" aria-label="제출 완료">
                          <span aria-hidden="true">✓</span> 제출
                        </span>
                      ) : (
                        <span className="font-semibold text-amber-700" aria-label="미제출">
                          <span aria-hidden="true">✗</span> 미제출
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 pr-3 text-slate-600">
                      {t.lastSubmitAt ? new Date(t.lastSubmitAt).toLocaleTimeString("ko-KR") : "-"}
                    </td>
                    <td className="py-2.5 pr-3 text-right font-mono">{t.cashManwon.toLocaleString()}</td>
                    <td className="py-2.5 pr-3 text-right">{t.halfYearProductionQty}</td>
                    <td className="py-2.5 pr-3 text-right">{t.halfYearSalesQty}</td>
                    <td className="py-2.5 pr-3">
                      {t.warningStatus === "NOT_SUBMITTED" ? (
                        <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">미제출</span>
                      ) : (
                        <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">정상</span>
                      )}
                    </td>
                    <td className="py-2.5">
                      <div className="flex gap-1">
                        {isUnsubmitted && (
                          <>
                            <button
                              onClick={() => onForceSubmit(t.companyId)}
                              aria-label={`${t.teamName} 강제 제출`}
                              className="rounded bg-sky-100 px-2 py-1 text-xs hover:bg-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                            >
                              강제제출
                            </button>
                            <button
                              onClick={() => onZeroSubmit(t.companyId)}
                              aria-label={`${t.teamName} Zero Submit`}
                              className="rounded bg-amber-100 px-2 py-1 text-xs hover:bg-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                            >
                              Zero
                            </button>
                          </>
                        )}
                        {onDeleteTeam && (
                          <button
                            onClick={() => onDeleteTeam(t.companyId, t.teamName)}
                            aria-label={`${t.teamName} 팀 삭제`}
                            className="rounded bg-rose-100 px-2 py-1 text-xs text-rose-800 hover:bg-rose-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                          >
                            삭제
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function GmStatusBanner({ desk }: { desk: GmDeskDto }) {
  const stepLabel = STEP_LABELS[desk.stepPhase] ?? desk.stepPhase;
  const hasUnsubmitted = desk.unsubmittedTeamCount > 0;
  const remainingTimeSec = useStepCountdown({
    stepStartedAt: desk.stepStartedAt,
    stepDurationSec: desk.stepDurationSec,
    remainingTimeSec: desk.remainingTimeSec,
  });

  let guidance = "모든 팀 제출 완료 → 「다음 Step」 진행 가능";
  if (desk.sessionPhase === "PAUSED") {
    guidance = "세션 일시정지 중 — 「재개」 후 진행";
  } else if (desk.stepPhase === "STEP7_SETTLEMENT") {
    guidance = "결산 Step — 「반기 종료 (결산)」 실행";
  } else if (desk.stepPhase === "HALF_YEAR_END") {
    guidance = desk.canEndGame ? "P6 결산 완료 → 「게임 종료」" : "「다음 반기 시작」으로 P" + (desk.periodIndex + 1) + " 진행";
  } else if (hasUnsubmitted) {
    guidance = `${desk.unsubmittedTeamCount}팀 미제출 — Zero Submit 또는 강제제출 후 「다음 Step」`;
  }

  return (
    <div
      className={`rounded-xl border p-4 ${hasUnsubmitted && desk.sessionPhase === "RUNNING" ? "border-amber-300 bg-amber-50" : "border-slate-300 bg-white/95"}`}
    >
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <div>
          <span className="text-xs text-slate-500">현재 반기</span>
          <p className="font-semibold text-violet-700">
            P{desk.periodIndex}/6 · {formatPeriodLabel(desk.periodLabel)}
          </p>
        </div>
        <div>
          <span className="text-xs text-slate-500">현재 Step</span>
          <p className="font-semibold text-sky-700">{stepLabel}</p>
        </div>
        <div>
          <span className="text-xs text-slate-500">남은 시간</span>
          <p className="font-mono text-lg">{formatStepTime(remainingTimeSec)}</p>
        </div>
        <div>
          <span className="text-xs text-slate-500">제출률</span>
          <p className={`font-semibold ${desk.submitRatePercent < 100 ? "text-amber-700" : "text-emerald-700"}`}>
            {desk.submitRatePercent}% ({desk.totalTeamCount - desk.unsubmittedTeamCount}/{desk.totalTeamCount})
          </p>
        </div>
        <div>
          <span className="text-xs text-slate-500">세션</span>
          <p className={desk.sessionPhase === "PAUSED" ? "text-amber-700" : "text-emerald-700"}>
            {desk.sessionPhase === "PAUSED"
              ? "⏸ 일시정지"
              : desk.sessionPhase === "RUNNING"
                ? "▶ 진행 중"
                : desk.sessionPhase === "FINISHED"
                  ? "■ 종료"
                  : desk.sessionPhase}
            {desk.stepLocked && " · 🔒 Step 잠금"}
          </p>
        </div>
      </div>
      <p className="mt-3 text-sm font-medium text-slate-800">▶ {guidance}</p>
    </div>
  );
}

export { STEP_LABELS };
