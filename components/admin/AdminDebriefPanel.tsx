"use client";

import { useCallback, useEffect, useState } from "react";
import { authFetch } from "@/lib/bsp/auth-client";
import { useAdminSession } from "@/lib/bsp/admin-session-context";
import { useAdminRealtimeRefresh } from "@/lib/bsp/admin-realtime-context";
import type { SessionDebriefAnalysis } from "@/src/bsp/application/debrief-analysis-service";
import type { GmDeskDto } from "@/src/bsp/domain/types";
import { formatPeriodLabel, formatStepPhaseLabel } from "@/src/bsp/domain/period/display-labels";

async function readApiError(res: Response, fallback: string): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string; message?: string };
    return data.error ?? data.message ?? fallback;
  } catch {
    return fallback;
  }
}

export function AdminDebriefPanel() {
  const { sessionId } = useAdminSession();
  const [desk, setDesk] = useState<GmDeskDto | null>(null);
  const [analysis, setAnalysis] = useState<SessionDebriefAnalysis | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const refresh = useCallback(async (id: string) => {
    setLoading(true);
    setLoadError(null);
    setAnalysisError(null);

    const [deskRes, analysisRes] = await Promise.all([
      authFetch(`/api/v1/gm/sessions/${id}/desk`),
      authFetch(`/api/v1/gm/sessions/${id}/debrief-analysis`),
    ]);

    if (!deskRes.ok) {
      setDesk(null);
      setAnalysis(null);
      setLoadError(await readApiError(deskRes, `디브리프 데이터 조회 실패 (${deskRes.status})`));
      setLoading(false);
      return;
    }

    setDesk(await deskRes.json());

    if (!analysisRes.ok) {
      setAnalysis(null);
      setAnalysisError(await readApiError(analysisRes, `강사용 분석 조회 실패 (${analysisRes.status})`));
    } else {
      setAnalysis(await analysisRes.json());
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    if (sessionId) void refresh(sessionId);
  }, [sessionId, refresh]);

  useAdminRealtimeRefresh(() => {
    if (sessionId) void refresh(sessionId);
  });

  const handleRefresh = async () => {
    if (!sessionId) return;
    setRefreshing(true);
    try {
      await refresh(sessionId);
    } finally {
      setRefreshing(false);
    }
  };

  if (!sessionId) return <p className="text-sm text-slate-500">세션을 선택하세요.</p>;

  if (loading && !desk) {
    return <p className="text-sm text-slate-500">디브리프 데이터 로딩…</p>;
  }

  if (loadError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        <p className="font-medium">디브리프 데이터를 불러오지 못했습니다</p>
        <p className="mt-2">{loadError}</p>
        <button
          type="button"
          onClick={() => void handleRefresh()}
          disabled={refreshing}
          className="mt-4 rounded-lg border border-red-300 bg-white px-3 py-1.5 hover:bg-red-100 disabled:opacity-50"
        >
          {refreshing ? "재시도 중…" : "다시 시도"}
        </button>
      </div>
    );
  }

  if (!desk) return null;

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
    const blob = new Blob(
      [JSON.stringify({ desk, analysis, exportedAt: new Date().toISOString() }, null, 2)],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `debrief-${desk.name}.json`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">디브리프</h2>
          <p className="mt-1 text-sm text-slate-500">
            {formatPeriodLabel(desk.periodLabel)} · {formatStepPhaseLabel(desk.stepPhase)} · 실시간 갱신
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void handleRefresh()}
            disabled={refreshing}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50"
          >
            {refreshing ? "새로고침 중…" : "새로고침"}
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
          AI 코멘트 및 내부 분석은 학습자에게 공개되지 않습니다. 팀별 제출 Step:{" "}
          {desk.teams.map((t) => `${t.teamName}(${t.submittedSteps.length}/6)`).join(" · ")}
        </p>

        {analysisError && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-medium">강사용 분석을 불러오지 못했습니다</p>
            <p className="mt-1">{analysisError}</p>
          </div>
        )}

        {analysis && (
          <div className="mt-4 space-y-4">
            <div className="rounded-lg border border-violet-200 bg-white/70 p-4">
              <h4 className="text-sm font-semibold text-violet-900">세션 요약</h4>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                {analysis.sessionSummary.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-lg border border-violet-200 bg-white/70 p-4">
              <h4 className="text-sm font-semibold text-violet-900">팀 간 비교</h4>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                {analysis.crossTeamNotes.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {analysis.teams.map((team) => (
                <div key={team.companyId} className="rounded-lg border border-violet-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-semibold text-slate-900">{team.teamName}</h4>
                    <span className="text-xs text-slate-500">현금 {team.cashManwon.toLocaleString()}만</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    제출 {team.submittedSteps.length}/6 Step
                  </p>

                  {team.highlights.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-medium text-slate-600">의사결정 요약</p>
                      <ul className="mt-1 list-disc space-y-1 pl-4 text-sm text-slate-700">
                        {team.highlights.map((line) => (
                          <li key={line}>{line}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {team.warnings.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-medium text-amber-800">주의 포인트</p>
                      <ul className="mt-1 list-disc space-y-1 pl-4 text-sm text-amber-900">
                        {team.warnings.map((line) => (
                          <li key={line}>{line}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {team.discussionPoints.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-medium text-violet-800">토론 질문</p>
                      <ul className="mt-1 list-disc space-y-1 pl-4 text-sm text-violet-900">
                        {team.discussionPoints.map((line) => (
                          <li key={line}>{line}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {!analysis && !analysisError && (
          <p className="mt-4 text-sm text-violet-800">팀 제출 데이터가 쌓이면 강사용 분석이 표시됩니다.</p>
        )}
      </section>
    </div>
  );
}
