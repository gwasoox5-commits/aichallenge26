"use client";

import type { GmDeskDto } from "@/src/bsp/domain/types";
import { STEP_LABELS } from "./GmTeamTable";

type Props = {
  desk: GmDeskDto;
  onRecommendedAction?: () => void;
  recommendedLabel?: string;
  recommendedDisabled?: boolean;
};

export function GmOpsSummaryPanel({
  desk,
  onRecommendedAction,
  recommendedLabel,
  recommendedDisabled,
}: Props) {
  const stepLabel = STEP_LABELS[desk.stepPhase] ?? desk.stepPhase;

  return (
    <div
      className="rounded-xl border border-violet-200 bg-gradient-to-r from-white to-violet-50 p-5"
      data-testid="gm-ops-summary"
      aria-label="GM 운영 요약"
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="제출률"
          value={`${desk.submitRatePercent}%`}
          sub={`${desk.totalTeamCount - desk.unsubmittedTeamCount}/${desk.totalTeamCount}팀 제출`}
          icon={desk.submitRatePercent >= 100 ? "✓" : "!"}
          warn={desk.unsubmittedTeamCount > 0}
        />
        <SummaryCard
          label="미제출 팀"
          value={`${desk.unsubmittedTeamCount}팀`}
          sub={desk.unsubmittedTeamCount > 0 ? "Zero 또는 강제제출 검토" : "모두 제출 완료"}
          icon={desk.unsubmittedTeamCount > 0 ? "⚠" : "✓"}
          warn={desk.unsubmittedTeamCount > 0}
        />
        <SummaryCard
          label="경제 환경"
          value={desk.economyLabel}
          sub={`이벤트: ${desk.currentEventState}`}
          icon="📊"
        />
        <SummaryCard
          label="순위 1위"
          value={desk.ranking[0]?.teamName ?? "—"}
          sub={
            desk.ranking[0]
              ? `${desk.ranking[0].cashManwon.toLocaleString()}만원`
              : "참가 팀 없음"
          }
          icon="🏆"
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-300 bg-slate-50 px-4 py-3">
        <div>
          <p className="text-xs text-slate-500">현재 Step · 반기</p>
          <p className="text-sm font-semibold text-sky-700">
            {stepLabel} · P{desk.periodIndex}/6 {desk.periodLabel}
          </p>
        </div>
        {onRecommendedAction && recommendedLabel && (
          <button
            type="button"
            onClick={onRecommendedAction}
            disabled={recommendedDisabled}
            aria-label={`권장 조작: ${recommendedLabel}`}
            className="rounded-lg bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 disabled:opacity-40"
            data-testid="gm-recommended-action"
          >
            ▶ {recommendedLabel}
          </button>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  sub,
  icon,
  warn,
}: {
  label: string;
  value: string;
  sub: string;
  icon: string;
  warn?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-3 ${
        warn ? "border-amber-700/50 bg-amber-50" : "border-slate-200 bg-slate-100"
      }`}
    >
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-base font-semibold text-slate-900">
        <span aria-hidden="true" className="mr-1">
          {icon}
        </span>
        {value}
      </p>
      <p className="mt-0.5 text-xs text-slate-600">{sub}</p>
    </div>
  );
}

export function getGmRecommendedAction(desk: GmDeskDto): {
  label: string;
  key: string;
  disabled: boolean;
} {
  if (desk.sessionPhase === "PAUSED") {
    return { label: "세션 재개", key: "resume", disabled: false };
  }
  if (desk.stepPhase === "STEP7_SETTLEMENT") {
    return { label: "반기 종료 (결산)", key: "close", disabled: desk.sessionPhase !== "RUNNING" };
  }
  if (desk.stepPhase === "HALF_YEAR_END") {
    if (desk.canEndGame) return { label: "게임 종료", key: "game-end", disabled: false };
    return { label: "다음 반기 시작", key: "next-half", disabled: !desk.canStartNextHalf };
  }
  if (desk.unsubmittedTeamCount > 0) {
    return { label: "미제출 Zero Submit", key: "zero-all", disabled: !desk.stepPhase.startsWith("STEP") };
  }
  const canAdvance =
    desk.sessionPhase === "RUNNING" &&
    !desk.stepPhase.startsWith("HALF") &&
    desk.stepPhase !== "GAME_END";
  return { label: "다음 Step", key: "advance", disabled: !canAdvance };
}
