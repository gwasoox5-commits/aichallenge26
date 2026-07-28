"use client";

import { getScenario } from "@/data/scenarios";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScenarioPanel } from "@/components/simulation/scenario-panel";
import {
  isAllocationValid,
  StrategyAllocationForm,
} from "@/components/simulation/strategy-allocation-form";
import { KpiGrid } from "@/components/simulation/kpi-grid";
import { cn } from "@/lib/utils/cn";
import type { KpiSnapshot } from "@/types/kpi";
import type { RoundNumber } from "@/types/simulation";
import type { Allocation, StrategyId } from "@/types/strategy";

type RoundScreenProps = {
  currentRound: RoundNumber;
  kpi: KpiSnapshot;
  allocation: Allocation;
  onAllocationChange: (id: StrategyId, value: number) => void;
  onSubmit: () => void;
};

const PHASE_BADGE: Record<number, "default" | "warning" | "info" | "success"> =
  {
    1: "default",
    2: "warning",
    3: "info",
    4: "success",
  };

export function RoundScreen({
  currentRound,
  kpi,
  allocation,
  onAllocationChange,
  onSubmit,
}: RoundScreenProps) {
  const scenario = getScenario(currentRound);
  const valid = isAllocationValid(allocation);
  const isLastRound = currentRound === 4;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 pb-28 pt-2 sm:px-6 lg:pb-12">
      {/* Round header */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md">
        <div className="flex flex-col gap-4 border-b border-slate-200 bg-gradient-to-r from-white to-sky-50 px-6 py-5 text-slate-900 sm:flex-row sm:items-center sm:justify-between lg:px-8 lg:py-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-100 text-2xl font-bold text-brand-800">
              R{currentRound}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-brand-700">
                  라운드 {currentRound} / 4
                </span>
                <Badge
                  variant={PHASE_BADGE[currentRound] ?? "default"}
                  className="border-brand-200 bg-brand-50 text-brand-800"
                >
                  {scenario.phaseLabel}
                </Badge>
              </div>
              <h2 className="mt-1 text-xl font-bold leading-snug lg:text-2xl">
                {scenario.name}
              </h2>
            </div>
          </div>
          <p className="text-sm text-slate-700 sm:max-w-xs sm:text-right">
            팀 토론 후 100포인트를 배분하고 확정하세요.
          </p>
        </div>
      </div>

      {/* KPI snapshot — compact on round screen */}
      <KpiGrid kpi={kpi} title="현재 경영 지표" />

      {/* Main grid: scenario | allocation */}
      <div className="grid gap-6 xl:grid-cols-5">
        <div className="xl:col-span-2">
          <ScenarioPanel scenario={scenario} />
        </div>
        <div className="xl:col-span-3">
          <StrategyAllocationForm
            allocation={allocation}
            onChange={onAllocationChange}
          />
        </div>
      </div>

      {/* Sticky footer CTA — easy to reach on projector setup */}
      <div className="fixed bottom-0 left-0 right-0 z-10 border-t border-slate-200 bg-white/95 px-4 py-4 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] backdrop-blur sm:px-6 lg:static lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
        <div className="mx-auto flex max-w-7xl flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p
            className={cn(
              "text-center text-sm font-medium sm:text-left",
              valid ? "text-emerald-700" : "text-amber-700",
            )}
          >
            {valid
              ? "배분이 완료되었습니다. 결과를 확인하고 다음 단계로 이동하세요."
              : "합계 100포인트가 되도록 조정한 뒤 확정할 수 있습니다."}
          </p>
          <Button
            size="lg"
            className="shrink-0 px-10 py-4 text-lg shadow-md"
            disabled={!valid}
            onClick={onSubmit}
          >
            {isLastRound
              ? "배분 확정 · 최종 결과 확인"
              : `배분 확정 · 라운드 ${currentRound} 결과 보기`}
          </Button>
        </div>
      </div>
    </div>
  );
}
