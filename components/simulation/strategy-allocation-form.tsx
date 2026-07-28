"use client";

import { STRATEGIES } from "@/data/strategies";
import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BUDGET_TOTAL,
  clampStrategyValue,
  getMaxForStrategy,
  getRemainingBudget,
  isAllocationValid,
  sumAllocation,
} from "@/lib/allocation";
import { cn } from "@/lib/utils/cn";
import type { Allocation, StrategyId } from "@/types/strategy";

type StrategyAllocationFormProps = {
  allocation: Allocation;
  onChange: (id: StrategyId, value: number) => void;
};

function AdjustButton({
  label,
  onClick,
  disabled,
  className,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        "flex h-11 w-11 items-center justify-center rounded-xl border-2 border-slate-200 bg-white text-xl font-bold text-slate-700 transition-colors hover:border-brand-300 hover:bg-brand-50 active:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-30",
        className,
      )}
    >
      {label}
    </button>
  );
}

function StrategyRow({
  strategy,
  value,
  maxAllowed,
  onChange,
}: {
  strategy: (typeof STRATEGIES)[number];
  value: number;
  maxAllowed: number;
  onChange: (v: number) => void;
}) {
  const atMax = value >= maxAllowed;
  const atMin = value <= 0;

  const adjust = (delta: number) => {
    onChange(value + delta);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-6">
        {/* Label + short description */}
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold text-slate-900 lg:text-lg">
            {strategy.label}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {strategy.shortDescription}
          </p>
        </div>

        {/* Controls */}
        <div className="flex shrink-0 items-center gap-2 lg:gap-3">
          <AdjustButton
            label="−5"
            disabled={atMin}
            onClick={() => adjust(-5)}
            className="hidden h-10 w-10 text-sm sm:flex"
          />
          <AdjustButton
            label="−"
            disabled={atMin}
            onClick={() => adjust(-1)}
          />
          <div className="flex min-w-[4.5rem] flex-col items-center">
            <span className="text-3xl font-bold tabular-nums text-brand-700">
              {value}
            </span>
            <span className="text-xs font-medium text-slate-600">포인트</span>
          </div>
          <AdjustButton
            label="+"
            disabled={atMax}
            onClick={() => adjust(1)}
          />
          <AdjustButton
            label="+5"
            disabled={atMax}
            onClick={() => adjust(5)}
            className="hidden h-10 w-10 text-sm sm:flex"
          />
        </div>
      </div>

      {/* Slider */}
      <div className="mt-4 space-y-2">
        <input
          type="range"
          min={0}
          max={maxAllowed}
          step={1}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value, 10))}
          className="h-3 w-full cursor-pointer accent-brand-600"
          aria-label={`${strategy.label} 배분`}
        />
        <div className="flex justify-between text-xs text-slate-600">
          <span>0</span>
          <span>최대 {maxAllowed}pt</span>
        </div>
        <Progress value={value} max={BUDGET_TOTAL} />
      </div>
    </div>
  );
}

export function StrategyAllocationForm({
  allocation,
  onChange,
}: StrategyAllocationFormProps) {
  const total = sumAllocation(allocation);
  const remaining = getRemainingBudget(allocation);
  const isValid = isAllocationValid(allocation);
  const isOver = remaining < 0;

  const handleChange = (id: StrategyId, requested: number) => {
    onChange(id, clampStrategyValue(allocation, id, requested));
  };

  return (
    <Card className="border-slate-200 shadow-md">
      <CardHeader className="border-b border-slate-100 bg-slate-50/60">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg">전략 투자 배분</CardTitle>
            <p className="mt-1 text-sm text-slate-600">
              총 예산 {BUDGET_TOTAL}포인트 · 합계가 100을 넘을 수 없습니다
            </p>
          </div>

          {/* Budget meter */}
          <div
            className={cn(
              "rounded-2xl border-2 px-6 py-3 text-center",
              isValid
                ? "border-emerald-300 bg-emerald-50"
                : isOver
                  ? "border-red-300 bg-red-50"
                  : "border-amber-300 bg-amber-50",
            )}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              사용 / 총 예산
            </p>
            <p
              className={cn(
                "text-3xl font-bold tabular-nums",
                isValid
                  ? "text-emerald-700"
                  : isOver
                    ? "text-red-700"
                    : "text-amber-700",
              )}
            >
              {total}
              <span className="text-lg text-slate-600"> / {BUDGET_TOTAL}</span>
            </p>
            <p className="mt-0.5 text-sm font-medium text-slate-600">
              {isValid
                ? "✓ 배분 완료"
                : remaining > 0
                  ? `${remaining}pt 더 배분하세요`
                  : `${Math.abs(remaining)}pt 초과 — 조정 필요`}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-6">
        {STRATEGIES.map((strategy) => (
          <StrategyRow
            key={strategy.id}
            strategy={strategy}
            value={allocation[strategy.id]}
            maxAllowed={getMaxForStrategy(allocation, strategy.id)}
            onChange={(v) => handleChange(strategy.id, v)}
          />
        ))}
      </CardContent>
    </Card>
  );
}

export { isAllocationValid };
