"use client";

import { useCallback, useEffect, useState } from "react";
import { authFetch } from "@/lib/bsp/auth-client";
import { useAdminSession } from "@/lib/bsp/admin-session-context";
import type { GmDeskDto } from "@/src/bsp/domain/types";

export function AdminDebriefPanel() {
  const { sessionId } = useAdminSession();
  const [desk, setDesk] = useState<GmDeskDto | null>(null);

  const refresh = useCallback(async (id: string) => {
    const res = await authFetch(`/api/v1/gm/sessions/${id}/desk`);
    if (res.ok) setDesk(await res.json());
  }, []);

  useEffect(() => {
    if (sessionId) refresh(sessionId);
  }, [sessionId, refresh]);

  if (!sessionId) return <p className="text-sm text-slate-500">세션을 선택하세요.</p>;
  if (!desk) return <p className="text-sm text-slate-500">디브리프 데이터 로딩…</p>;

  const exportCsv = () => {
    const rows = [
      ["rank", "teamName", "cashManwon", "netIncomeManwon", "halfYearRevenueManwon"],
      ...desk.ranking.map((r) => [r.rank, r.teamName, r.cashManwon, r.netIncomeManwon, r.halfYearRevenueManwon]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `debrief-${desk.name}.csv`;
    a.click();
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ desk, exportedAt: new Date().toISOString() }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `debrief-${desk.name}.json`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">디브리프</h2>
        <div className="flex gap-2">
          <button type="button" onClick={() => window.print()} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">
            인쇄
          </button>
          <button type="button" onClick={exportCsv} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">
            CSV
          </button>
          <button type="button" onClick={exportJson} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">
            JSON
          </button>
        </div>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h3 className="font-semibold">팀별 성과 · 순위</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-slate-500">
                <th className="pb-2 pr-4">순위</th>
                <th className="pb-2 pr-4">팀</th>
                <th className="pb-2 pr-4 text-right">현금</th>
                <th className="pb-2 pr-4 text-right">당기순이익</th>
                <th className="pb-2 text-right">반기 매출</th>
              </tr>
            </thead>
            <tbody>
              {desk.ranking.map((r) => (
                <tr key={r.companyId} className="border-b border-slate-100">
                  <td className="py-2 pr-4 font-medium">{r.rank}</td>
                  <td className="py-2 pr-4">{r.teamName}</td>
                  <td className="py-2 pr-4 text-right font-mono">{r.cashManwon.toLocaleString()}</td>
                  <td className="py-2 pr-4 text-right font-mono">{r.netIncomeManwon.toLocaleString()}</td>
                  <td className="py-2 text-right font-mono">{r.halfYearRevenueManwon.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-violet-200 bg-violet-50 p-6">
        <h3 className="font-semibold text-violet-900">강사용 분석 (GM 전용)</h3>
        <p className="mt-2 text-sm text-violet-800">
          AI 코멘트 및 내부 분석은 학습자에게 공개되지 않습니다. 팀별 제출 Step: {desk.teams.map((t) => `${t.teamName}(${t.submittedSteps.length}/6)`).join(" · ")}
        </p>
      </section>
    </div>
  );
}
