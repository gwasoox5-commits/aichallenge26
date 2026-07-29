"use client";

import type {
  LearnerEconomyKeyChange,
  LearnerEventImpact,
  LearnerGameplayMetrics,
  LearnerPeriodImpact,
} from "@/src/bsp/domain/economy/learner-economy-impact";

type Props = {
  periodImpact: LearnerPeriodImpact;
  eventImpacts: LearnerEventImpact[];
};

function formatDelta(before: number, after: number): string {
  const diff = after - before;
  if (Math.abs(diff) < 0.01) return "—";
  const sign = diff > 0 ? "+" : "";
  if (Number.isInteger(before) && Number.isInteger(after)) {
    return `${sign}${Math.round(diff)}`;
  }
  return `${sign}${Math.round(diff * 10) / 10}`;
}

function formatIndexValue(key: string, value: number): string {
  if (key === "tariffRate") return `${value}%`;
  if (key === "logisticsCostMultiplier") return `×${value}`;
  if (key === "exchangeRate") return `${Math.round(value)}원`;
  return String(value);
}

function ImpactTable({
  indexChanges,
  gameplay,
  beforeLabel,
  afterLabel,
}: {
  indexChanges: LearnerEconomyKeyChange[];
  gameplay: LearnerGameplayMetrics;
  beforeLabel: string;
  afterLabel: string;
}) {
  const rows: Array<{ label: string; before: string; after: string; delta: string }> = [];

  for (const c of indexChanges) {
    rows.push({
      label: c.label,
      before: formatIndexValue(c.key, c.before),
      after: formatIndexValue(c.key, c.after),
      delta: formatDelta(c.before, c.after),
    });
  }

  rows.push({
    label: `원자재 구매 단가 (${gameplay.regionDisplayName})`,
    before: `${gameplay.materialUnitPriceManwon.before}만원`,
    after: `${gameplay.materialUnitPriceManwon.after}만원`,
    delta: formatDelta(
      gameplay.materialUnitPriceManwon.before,
      gameplay.materialUnitPriceManwon.after
    ),
  });
  rows.push({
    label: `판매 수요량 (${gameplay.regionDisplayName})`,
    before: `${gameplay.saleLimit.before}단위`,
    after: `${gameplay.saleLimit.after}단위`,
    delta: formatDelta(gameplay.saleLimit.before, gameplay.saleLimit.after),
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-200 text-left text-slate-500">
            <th className="py-1.5 pr-2 font-medium">항목</th>
            <th className="py-1.5 px-2 font-medium">{beforeLabel}</th>
            <th className="py-1.5 px-2 font-medium">{afterLabel}</th>
            <th className="py-1.5 pl-2 font-medium">변화</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const changed = row.delta !== "—";
            return (
              <tr key={row.label} className="border-b border-slate-100 last:border-0">
                <td className="py-1.5 pr-2 text-slate-700">{row.label}</td>
                <td className="py-1.5 px-2 tabular-nums text-slate-600">{row.before}</td>
                <td
                  className={`py-1.5 px-2 tabular-nums ${changed ? "font-medium text-amber-900" : "text-slate-600"}`}
                >
                  {row.after}
                </td>
                <td
                  className={`py-1.5 pl-2 tabular-nums ${changed ? "font-medium text-amber-800" : "text-slate-400"}`}
                >
                  {row.delta}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function hasPeriodChanges(periodImpact: LearnerPeriodImpact): boolean {
  return (
    periodImpact.indexChanges.length > 0 ||
    periodImpact.gameplay.materialUnitPriceManwon.before !==
      periodImpact.gameplay.materialUnitPriceManwon.after ||
    periodImpact.gameplay.saleLimit.before !== periodImpact.gameplay.saleLimit.after
  );
}

export function CeoEconomyImpactPanel({ periodImpact, eventImpacts }: Props) {
  const showPeriod = hasPeriodChanges(periodImpact);
  if (!showPeriod && eventImpacts.length === 0) return null;

  return (
    <div
      className="rounded-lg border border-emerald-200 bg-emerald-50/80 p-4"
      data-testid="ceo-economy-impact-panel"
    >
      <h3 className="text-sm font-semibold text-emerald-900">경제 영향 현황</h3>
      <p className="mt-1 text-xs text-emerald-800/80">
        이벤트 반영 전·후 수치입니다. 아시아 지역 기준 구매 단가·판매 수요량을 함께 표시합니다.
      </p>

      {showPeriod && (
        <div className="mt-3">
          <h4 className="mb-2 text-xs font-semibold text-slate-700">이번 반기 누적 (반기 시작 → 현재)</h4>
          <ImpactTable
            indexChanges={periodImpact.indexChanges}
            gameplay={periodImpact.gameplay}
            beforeLabel="반기 시작"
            afterLabel="현재"
          />
        </div>
      )}

      {eventImpacts.length > 0 && (
        <div className={showPeriod ? "mt-4 space-y-3" : "mt-3 space-y-3"}>
          <h4 className="text-xs font-semibold text-slate-700">이벤트별 영향</h4>
          {eventImpacts.map((impact) => (
            <div
              key={impact.eventId}
              className="rounded-md border border-white/80 bg-white/90 p-3"
              data-testid={`ceo-event-impact-${impact.eventId}`}
            >
              <div className="text-xs font-medium text-slate-900">{impact.title}</div>
              <div className="mt-2">
                <ImpactTable
                  indexChanges={impact.indexChanges}
                  gameplay={impact.gameplay}
                  beforeLabel="이벤트 전"
                  afterLabel="이벤트 후"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
