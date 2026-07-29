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

function MetricRange({
  before,
  after,
  unit,
}: {
  before: number;
  after: number;
  unit: string;
}) {
  const changed = before !== after;
  const delta = formatDelta(before, after);
  return (
    <span className="tabular-nums">
      <span className="text-slate-600">
        {before}
        {unit}
      </span>
      <span className="mx-1 text-slate-400">→</span>
      <span className={changed ? "font-medium text-amber-900" : "text-slate-600"}>
        {after}
        {unit}
      </span>
      {changed ? (
        <span className="ml-1.5 text-amber-800">({delta})</span>
      ) : null}
    </span>
  );
}

function IndexImpactTable({
  indexChanges,
  beforeLabel,
  afterLabel,
}: {
  indexChanges: LearnerEconomyKeyChange[];
  beforeLabel: string;
  afterLabel: string;
}) {
  if (indexChanges.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-200 text-left text-slate-500">
            <th className="py-1.5 pr-2 font-medium">거시 지표</th>
            <th className="py-1.5 px-2 font-medium">{beforeLabel}</th>
            <th className="py-1.5 px-2 font-medium">{afterLabel}</th>
            <th className="py-1.5 pl-2 font-medium">변화</th>
          </tr>
        </thead>
        <tbody>
          {indexChanges.map((c) => {
            const delta = formatDelta(c.before, c.after);
            const changed = delta !== "—";
            return (
              <tr key={c.key} className="border-b border-slate-100 last:border-0">
                <td className="py-1.5 pr-2 text-slate-700">{c.label}</td>
                <td className="py-1.5 px-2 tabular-nums text-slate-600">
                  {formatIndexValue(c.key, c.before)}
                </td>
                <td
                  className={`py-1.5 px-2 tabular-nums ${changed ? "font-medium text-amber-900" : "text-slate-600"}`}
                >
                  {formatIndexValue(c.key, c.after)}
                </td>
                <td
                  className={`py-1.5 pl-2 tabular-nums ${changed ? "font-medium text-amber-800" : "text-slate-400"}`}
                >
                  {delta}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function RegionalImpactTable({ regions }: { regions: LearnerGameplayMetrics[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-200 text-left text-slate-500">
            <th className="py-1.5 pr-2 font-medium">지역</th>
            <th className="py-1.5 px-2 font-medium">원자재 구매 단가</th>
            <th className="py-1.5 pl-2 font-medium">판매 수요량</th>
          </tr>
        </thead>
        <tbody>
          {regions.map((region) => (
            <tr key={region.regionCode} className="border-b border-slate-100 last:border-0">
              <td className="py-1.5 pr-2 font-medium text-slate-700">{region.regionDisplayName}</td>
              <td className="py-1.5 px-2">
                <MetricRange
                  before={region.materialUnitPriceManwon.before}
                  after={region.materialUnitPriceManwon.after}
                  unit="만원"
                />
              </td>
              <td className="py-1.5 pl-2">
                <MetricRange
                  before={region.saleLimit.before}
                  after={region.saleLimit.after}
                  unit="단위"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ImpactSection({
  indexChanges,
  regions,
  beforeLabel,
  afterLabel,
}: {
  indexChanges: LearnerEconomyKeyChange[];
  regions: LearnerGameplayMetrics[];
  beforeLabel: string;
  afterLabel: string;
}) {
  return (
    <div className="space-y-3">
      <IndexImpactTable indexChanges={indexChanges} beforeLabel={beforeLabel} afterLabel={afterLabel} />
      <div>
        <div className="mb-1.5 text-[11px] font-medium text-slate-500">7개 지역 · 구매·영업 Step 반영값</div>
        <RegionalImpactTable regions={regions} />
      </div>
    </div>
  );
}

function hasPeriodChanges(periodImpact: LearnerPeriodImpact): boolean {
  return (
    periodImpact.indexChanges.length > 0 ||
    periodImpact.regions.some(
      (r) =>
        r.materialUnitPriceManwon.before !== r.materialUnitPriceManwon.after ||
        r.saleLimit.before !== r.saleLimit.after
    )
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
        거시 지표와 7개 지역별 원자재 구매 단가·판매 수요량을 이벤트 반영 전·후로 비교합니다.
      </p>

      {showPeriod && (
        <div className="mt-3">
          <h4 className="mb-2 text-xs font-semibold text-slate-700">이번 반기 누적 (반기 시작 → 현재)</h4>
          <ImpactSection
            indexChanges={periodImpact.indexChanges}
            regions={periodImpact.regions}
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
                <ImpactSection
                  indexChanges={impact.indexChanges}
                  regions={impact.regions}
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
