"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { authFetch } from "@/lib/bsp/auth-client";
import type { BspGameStep, BspStepPhase } from "@/src/bsp/domain/types";
import { PHASE_TO_STEP } from "@/src/bsp/domain/types";
import { formatPeriodLabel, STEP_PHASE_LABELS } from "@/src/bsp/domain/period/display-labels";
import { formatStepTime } from "@/lib/bsp/step-timer";
import { useStepCountdown } from "@/lib/bsp/use-step-countdown";

export type CeoDashboardView = {
  teamName: string;
  periodLabel: string;
  periodIndex?: number;
  year?: number;
  half?: string;
  stepPhase?: BspStepPhase;
  sessionPhase?: "RUNNING" | "PREPARE" | "PAUSED" | "FINISHED";
  cashManwon: number;
  equityManwon: number;
  debtManwon: number;
  debtRatioPercent?: number;
  completedSteps?: BspGameStep[];
  remainingTimeSec?: number;
  stepStartedAt?: string;
  stepDurationSec?: number;
  stepLocked?: boolean;
  currentStepSubmitted?: boolean;
  economyLabel?: string;
  economy?: {
    rawMaterialIndex: number;
    marketDemandIndex: number;
    businessCycleIndex: number;
  };
};

type EnvironmentDto = {
  activeEvents: Array<{ id: string; title: string }>;
  recentChanges?: string[];
  topDeltas: Array<{ description?: string; label: string }>;
  environmentChangedBadge: boolean;
};

const STEP_LABELS = STEP_PHASE_LABELS;

const STEP_TASKS: Partial<Record<BspStepPhase, string>> = {
  STEP1_FINANCE: "자금 조달(차입·예금) 입력 후 제출",
  STEP2_INVESTMENT: "토지·설비 투자 결정 후 제출",
  STEP3_HR: "부서별 인력 채용 후 제출",
  STEP4_PURCHASE: "원재료 구매·지역 선택 후 제출",
  STEP5_PRODUCTION: "생산량·기계 가동 결정 후 제출",
  STEP6_SALES: "판매 가격·수량·지역 결정 후 제출",
  STEP7_SETTLEMENT: "GM이 반기 결산을 실행할 때까지 대기",
  HALF_YEAR_END: "GM이 다음 반기 또는 게임 종료를 진행할 때까지 대기",
  GAME_END: "최종 결과 확인 및 토론",
};

type Props = {
  companyId: string;
  dashboard: CeoDashboardView | null;
};

export function CeoCommandDashboard({ companyId, dashboard }: Props) {
  const [env, setEnv] = useState<EnvironmentDto | null>(null);
  const remainingTimeSec = useStepCountdown({
    stepStartedAt: dashboard?.stepStartedAt,
    stepDurationSec: dashboard?.stepDurationSec,
    remainingTimeSec: dashboard?.remainingTimeSec,
    enabled: !!dashboard,
  });

  const loadEnv = useCallback(async () => {
    const res = await authFetch(`/api/v1/play/companies/${companyId}/environment`);
    if (res.ok) setEnv(await res.json());
  }, [companyId]);

  useEffect(() => {
    loadEnv();
  }, [loadEnv]);

  const stepPhase = dashboard?.stepPhase ?? "STEP1_FINANCE";
  const currentStep = PHASE_TO_STEP[stepPhase];
  const submitted = dashboard?.currentStepSubmitted ?? dashboard?.completedSteps?.includes(currentStep ?? "LOAN");

  const gmWaitState = useMemo(() => {
    if (dashboard?.sessionPhase === "PAUSED") {
      return { icon: "⏸", label: "GM 일시정지", tone: "amber" as const, detail: "제출 불가 — GM 재개 대기" };
    }
    if (dashboard?.stepLocked) {
      return { icon: "🔒", label: "Step 잠금", tone: "amber" as const, detail: "GM이 Step을 잠갔습니다" };
    }
    if (submitted) {
      return { icon: "⏳", label: "GM 대기", tone: "sky" as const, detail: "제출 완료 — GM이 다음 Step 진행" };
    }
    if (stepPhase === "STEP7_SETTLEMENT" || stepPhase === "HALF_YEAR_END") {
      return { icon: "⏳", label: "GM 대기", tone: "sky" as const, detail: "GM 조작 대기 중" };
    }
    return { icon: "✏️", label: "입력 중", tone: "emerald" as const, detail: "아래 폼에 입력 후 제출" };
  }, [dashboard, submitted, stepPhase]);

  const submitStatus = submitted
    ? { icon: "✓", label: "제출 완료", className: "text-emerald-700 bg-emerald-950/40 border-emerald-300" }
    : { icon: "○", label: "미제출", className: "text-amber-800 bg-amber-950/40 border-amber-700/50" };

  if (!dashboard) return null;

  const task = STEP_TASKS[stepPhase] ?? "현재 Step 확인";

  return (
    <section
      className="rounded-xl border border-sky-200 bg-gradient-to-br from-white via-slate-50 to-sky-50 p-5 shadow-lg"
      aria-label="CEO 명령 대시보드"
      data-testid="ceo-command-dashboard"
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-sky-400">지금 해야 할 일</p>
          <h2 className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">{task}</h2>
          <p className="mt-1 text-sm text-slate-600">{dashboard.teamName}</p>
        </div>
        <div
          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold ${submitStatus.className}`}
          role="status"
          aria-live="polite"
        >
          <span aria-hidden="true">{submitStatus.icon}</span>
          <span>{submitStatus.label}</span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="현재 Step" value={STEP_LABELS[stepPhase] ?? stepPhase} accent="sky" />
        <StatCard
          label="현재 반기"
          value={
            dashboard.periodIndex
              ? `P${dashboard.periodIndex}/6 · ${formatPeriodLabel(dashboard.periodLabel)}`
              : dashboard.periodLabel
          }
          accent="violet"
        />
        <StatCard
          label="회사 상태"
          value={`현금 ${dashboard.cashManwon.toLocaleString()}만원`}
          sub={`자본 ${dashboard.equityManwon.toLocaleString()} · 부채비율 ${(dashboard.debtRatioPercent ?? 0).toFixed(1)}%`}
          accent="slate"
        />
        <StatCard
          label="남은 시간"
          value={formatStepTime(remainingTimeSec)}
          sub="Step 제한 시간"
          accent="orange"
          mono
        />
        <StatCard
          label={gmWaitState.label}
          value={gmWaitState.detail}
          icon={gmWaitState.icon}
          accent={gmWaitState.tone}
        />
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-slate-100 p-3">
          <p className="text-xs font-medium text-slate-500">경제 환경</p>
          <p className="mt-1 text-sm font-medium text-slate-800">
            {dashboard.economyLabel ??
              (dashboard.economy
                ? `원자재 ${dashboard.economy.rawMaterialIndex} · 수요 ${dashboard.economy.marketDemandIndex} · 경기 ${dashboard.economy.businessCycleIndex}`
                : "—")}
          </p>
          {env && env.topDeltas.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs text-slate-600">
              {env.topDeltas.slice(0, 3).map((d) => (
                <li key={d.label}>• {d.description ?? d.label}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-100 p-3">
          <p className="text-xs font-medium text-slate-500">활성 이벤트</p>
          {env && env.activeEvents.length > 0 ? (
            <ul className="mt-2 space-y-1 text-sm text-amber-800">
              {env.activeEvents.map((e) => (
                <li key={e.id}>⚡ {e.title}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-slate-500">현재 활성 이벤트 없음</p>
          )}
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-100 p-3">
          <p className="text-xs font-medium text-slate-500">최근 변화</p>
          {env && (env.recentChanges?.length ?? 0) > 0 ? (
            <ul className="mt-2 space-y-1 text-xs text-slate-700">
              {env.recentChanges!.slice(0, 4).map((line) => (
                <li key={line}>• {line}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-slate-500">이번 반기 기준 변화 없음</p>
          )}
        </div>
      </div>
    </section>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon,
  accent = "slate",
  mono,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: string;
  accent?: "sky" | "violet" | "slate" | "orange" | "emerald" | "amber";
  mono?: boolean;
}) {
  const accentMap = {
    sky: "border-sky-200 text-sky-200",
    violet: "border-violet-200 text-violet-800",
    slate: "border-slate-300 text-slate-800",
    orange: "border-orange-200 text-orange-800",
    emerald: "border-emerald-200 text-emerald-200",
    amber: "border-amber-200 text-amber-800",
  };

  return (
    <div className={`rounded-lg border bg-slate-50 p-3 ${accentMap[accent]}`}>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-1 text-sm font-semibold ${mono ? "font-mono text-lg" : ""}`}>
        {icon && <span className="mr-1" aria-hidden="true">{icon}</span>}
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}
