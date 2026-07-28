import { STRATEGIES } from "@/data/strategies";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Allocation } from "@/types/strategy";

type AllocationSummaryProps = {
  allocation: Allocation;
};

const COLORS = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
];

export function AllocationSummary({ allocation }: AllocationSummaryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>투자 배분</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {STRATEGIES.map((s, i) => {
            const value = allocation[s.id];
            return (
              <div key={s.id} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-slate-700">{s.label}</span>
                  <span className="font-bold text-slate-900">{value}pt</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${COLORS[i % COLORS.length]}`}
                    style={{ width: `${value}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex h-8 overflow-hidden rounded-lg">
          {STRATEGIES.map((s, i) =>
            allocation[s.id] > 0 ? (
              <div
                key={s.id}
                className={`${COLORS[i % COLORS.length]} flex items-center justify-center text-xs font-medium text-white`}
                style={{ width: `${allocation[s.id]}%` }}
                title={`${s.label}: ${allocation[s.id]}pt`}
              />
            ) : null,
          )}
        </div>
      </CardContent>
    </Card>
  );
}
