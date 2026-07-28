import { KPI_DEFINITIONS } from "@/data/kpis";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDelta, formatKpiValue } from "@/lib/utils/format";
import type { KpiDelta, KpiSnapshot } from "@/types/kpi";
import { cn } from "@/lib/utils/cn";

type KpiDeltaListProps = {
  before: KpiSnapshot;
  after: KpiSnapshot;
  delta: KpiDelta;
};

function isGoodChange(invertGood: boolean, delta: number): boolean {
  if (invertGood) return delta < 0;
  return delta > 0;
}

export function KpiDeltaList({ before, after, delta }: KpiDeltaListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>주요 지표 변화</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="pb-3 pr-4 font-semibold">지표</th>
                <th className="pb-3 pr-4 font-semibold text-right">이전</th>
                <th className="pb-3 pr-4 font-semibold text-right">이후</th>
                <th className="pb-3 font-semibold text-right">변화</th>
              </tr>
            </thead>
            <tbody>
              {KPI_DEFINITIONS.map((def) => {
                const d = delta[def.id];
                const good = isGoodChange(def.invertGood, d);
                const neutral = Math.abs(d) < 0.5;

                return (
                  <tr key={def.id} className="border-b border-slate-50">
                    <td className="py-3 pr-4 font-medium text-slate-800">
                      {def.label}
                      {def.invertGood && (
                        <span className="ml-1 text-xs text-slate-600">
                          (↓좋음)
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-right text-slate-600">
                      {formatKpiValue(def.id, before[def.id])}
                    </td>
                    <td className="py-3 pr-4 text-right font-semibold text-slate-900">
                      {formatKpiValue(def.id, after[def.id])}
                    </td>
                    <td
                      className={cn(
                        "py-3 text-right font-bold",
                        neutral && "text-slate-600",
                        !neutral && good && "text-emerald-600",
                        !neutral && !good && "text-red-600",
                      )}
                    >
                      {formatDelta(def.id, d)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
