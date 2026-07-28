import type { KpiSnapshot } from "@/types/kpi";
import { KPI_DEFINITIONS } from "@/data/kpis";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatKpiValue } from "@/lib/utils/format";

type KpiGridProps = {
  kpi: KpiSnapshot;
  title?: string;
};

export function KpiGrid({ kpi, title = "현재 경영 지표" }: KpiGridProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-7">
          {KPI_DEFINITIONS.map((def) => {
            const value = kpi[def.id];
            const displayValue = def.invertGood
              ? formatKpiValue(def.id, value)
              : formatKpiValue(def.id, value);

            return (
              <div
                key={def.id}
                className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-center"
              >
                <p className="text-xs font-medium text-slate-500">{def.label}</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {displayValue}
                </p>
                {def.invertGood && (
                  <p className="mt-1 text-xs text-amber-600">낮을수록 좋음</p>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
