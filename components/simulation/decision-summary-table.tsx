import { STRATEGIES } from "@/data/strategies";
import { getScenario } from "@/data/scenarios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RoundHistory } from "@/types/simulation";

const SHORT_LABELS: Record<string, string> = {
  aiAutomation: "AI",
  esg: "ESG",
  supplyChain: "공급망",
  talent: "인재",
  costReduction: "원가",
  rnd: "R&D",
};

export function DecisionSummaryTable({
  history,
}: {
  history: RoundHistory[];
}) {
  return (
    <Card className="border-slate-200 shadow-md">
      <CardHeader className="border-b border-slate-100 bg-slate-50/60">
        <CardTitle>라운드별 의사결정 요약</CardTitle>
        <p className="mt-1 text-sm text-slate-600">
          4라운드 투자 배분 패턴 — HRD 강사는 라운드별 전략 변화를 비교하며
          토론을 이끌어 주세요.
        </p>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-left text-sm">
            <thead>
              <tr className="border-b-2 border-slate-200 text-slate-500">
                <th className="pb-3 pr-3 font-semibold">라운드</th>
                {STRATEGIES.map((s) => (
                  <th
                    key={s.id}
                    className="pb-3 pr-2 text-center font-semibold"
                    title={s.label}
                  >
                    {SHORT_LABELS[s.id]}
                  </th>
                ))}
                <th className="pb-3 text-center font-semibold">합계</th>
                <th className="pb-3 pl-2 font-semibold">주요 투자</th>
              </tr>
            </thead>
            <tbody>
              {history.map((entry) => {
                const total = STRATEGIES.reduce(
                  (sum, s) => sum + entry.allocation[s.id],
                  0,
                );
                const top = STRATEGIES.map((s) => ({
                  label: SHORT_LABELS[s.id],
                  value: entry.allocation[s.id],
                }))
                  .sort((a, b) => b.value - a.value)
                  .slice(0, 2)
                  .filter((x) => x.value > 0)
                  .map((x) => `${x.label} ${x.value}`)
                  .join(", ");

                const scenario = getScenario(entry.round);

                return (
                  <tr
                    key={entry.round}
                    className="border-b border-slate-100 hover:bg-slate-50/80"
                  >
                    <td className="py-3 pr-3">
                      <p className="font-bold text-slate-900">
                        R{entry.round}
                      </p>
                      <p className="text-xs text-slate-500">
                        {scenario.phaseLabel}
                      </p>
                    </td>
                    {STRATEGIES.map((s) => {
                      const val = entry.allocation[s.id];
                      const isMax =
                        val ===
                        Math.max(
                          ...STRATEGIES.map((x) => entry.allocation[x.id]),
                        );
                      return (
                        <td
                          key={s.id}
                          className={`py-3 pr-2 text-center tabular-nums ${
                            isMax && val > 0
                              ? "font-bold text-brand-700"
                              : "text-slate-600"
                          }`}
                        >
                          {val}
                        </td>
                      );
                    })}
                    <td className="py-3 text-center font-semibold tabular-nums text-slate-800">
                      {total}
                    </td>
                    <td className="py-3 pl-2 text-xs text-slate-600">
                      {top || "—"}
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
