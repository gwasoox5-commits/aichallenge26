"use client";

import { KPI_DEFINITIONS } from "@/data/kpis";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DecisionSummaryTable } from "@/components/simulation/decision-summary-table";
import { KpiGrid } from "@/components/simulation/kpi-grid";
import {
  classifyCompany,
  getCompanyTypeDefinition,
} from "@/lib/simulation/company-types";
import { analyzeKpiProfile, computeTotalScore } from "@/lib/simulation/scoring";
import { cn } from "@/lib/utils/cn";
import type { CumulativeState, RoundHistory } from "@/types/simulation";
import type { KpiSnapshot } from "@/types/kpi";

type FinalResultScreenProps = {
  teamName: string;
  kpi: KpiSnapshot;
  cumulative: CumulativeState;
  history: RoundHistory[];
  onRestart: () => void;
};

function ScoreRing({ score }: { score: number }) {
  const pct = score;
  const color =
    score >= 75
      ? "text-emerald-600"
      : score >= 60
        ? "text-brand-600"
        : "text-amber-600";

  return (
    <div className="relative flex h-36 w-36 items-center justify-center">
      <svg className="absolute h-full w-full -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-white/15"
        />
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${pct * 2.64} 264`}
          className={color}
        />
      </svg>
      <div className="text-center">
        <p className={cn("text-4xl font-bold", color)}>{score}</p>
        <p className="text-xs text-slate-600">/ 100</p>
      </div>
    </div>
  );
}

export function FinalResultScreen({
  teamName,
  kpi,
  cumulative,
  history,
  onRestart,
}: FinalResultScreenProps) {
  const totalScore = computeTotalScore(kpi);
  const archetype = classifyCompany(kpi, cumulative);
  const companyType = getCompanyTypeDefinition(archetype);
  const { strengths, weaknesses } = analyzeKpiProfile(kpi);

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 pb-16 pt-2 sm:px-6">
      {/* ── Hero ── */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
        <div className="border-b border-slate-200 bg-gradient-to-br from-white via-slate-50 to-violet-50 px-6 py-8 text-slate-900 lg:px-10 lg:py-10">
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-700">
            최종 결과 리포트
          </p>
          <h2 className="mt-2 text-3xl font-bold lg:text-4xl">{teamName}</h2>

          <div className="mt-8 flex flex-col items-start gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-8">
              <ScoreRing score={totalScore} />
              <div>
                <p className="text-sm text-slate-700">종합 점수</p>
                <p className="mt-1 text-lg text-slate-800">
                  7개 경영 지표 가중 평균
                </p>
                <Badge
                  variant="info"
                  className="mt-4 border-brand-200 bg-brand-50 px-4 py-1.5 text-base text-brand-800"
                >
                  {companyType.name}
                </Badge>
              </div>
            </div>
            <p className="max-w-xl leading-relaxed text-slate-700">
              {companyType.description}
            </p>
          </div>
        </div>

        {/* Facilitator guide */}
        <div className="border-t border-brand-200 bg-brand-50 px-6 py-4 lg:px-10">
          <p className="text-xs font-bold uppercase tracking-wider text-brand-700">
            HRD 강사 가이드
          </p>
          <p className="mt-1 text-sm leading-relaxed text-brand-900">
            {companyType.facilitatorGuide}
          </p>
        </div>
      </section>

      {/* ── Strengths & Weaknesses ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-emerald-200 shadow-md">
          <CardHeader className="border-b border-emerald-100 bg-emerald-50/60">
            <CardTitle className="text-emerald-800">강점 TOP 3</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-5">
            {strengths.map((s, i) => (
              <div
                key={s.id}
                className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-sm font-bold text-white">
                      {i + 1}
                    </span>
                    <span className="font-bold text-slate-900">{s.label}</span>
                  </div>
                  <span className="text-2xl font-bold tabular-nums text-emerald-700">
                    {Math.round(s.score)}
                  </span>
                </div>
                <p className="mt-2 pl-11 text-sm leading-relaxed text-slate-600">
                  {s.insight}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-amber-200 shadow-md">
          <CardHeader className="border-b border-amber-100 bg-amber-50/60">
            <CardTitle className="text-amber-800">취약점 TOP 3</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-5">
            {weaknesses.map((w, i) => (
              <div
                key={w.id}
                className="rounded-xl border border-amber-100 bg-amber-50/40 p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-600 text-sm font-bold text-white">
                      {i + 1}
                    </span>
                    <span className="font-bold text-slate-900">{w.label}</span>
                  </div>
                  <span className="text-2xl font-bold tabular-nums text-amber-700">
                    {Math.round(w.score)}
                  </span>
                </div>
                <p className="mt-2 pl-11 text-sm leading-relaxed text-slate-600">
                  {w.insight}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* ── Decision summary ── */}
      <DecisionSummaryTable history={history} />

      {/* ── Final KPI + trend ── */}
      <KpiGrid kpi={kpi} title="최종 경영 지표" />

      <Card className="border-slate-200 shadow-md">
        <CardHeader>
          <CardTitle>4라운드 KPI 추이</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="pb-3 pr-4 font-semibold">지표</th>
                  {history.map((h) => (
                    <th
                      key={h.round}
                      className="pb-3 pr-4 text-right font-semibold"
                    >
                      R{h.round}
                    </th>
                  ))}
                  <th className="pb-3 font-semibold text-right">최종</th>
                </tr>
              </thead>
              <tbody>
                {KPI_DEFINITIONS.map((def) => (
                  <tr key={def.id} className="border-b border-slate-50">
                    <td className="py-2.5 pr-4 font-medium text-slate-700">
                      {def.label}
                    </td>
                    {history.map((h) => (
                      <td
                        key={h.round}
                        className="py-2.5 pr-4 text-right tabular-nums text-slate-600"
                      >
                        {Math.round(h.kpiAfter[def.id])}
                      </td>
                    ))}
                    <td className="py-2.5 text-right font-bold tabular-nums text-slate-900">
                      {Math.round(kpi[def.id])}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── Debrief ── */}
      <Card className="border-slate-200 shadow-md">
        <CardHeader className="border-b border-slate-100 bg-slate-50/60">
          <CardTitle>디브리핑 질문 (5)</CardTitle>
          <p className="mt-1 text-sm text-slate-600">
            HRD 강사가 팀별로 15~20분 토론을 진행할 때 활용하세요. 정답보다
            「왜 그렇게 선택했는가」를 중심으로 대화하세요.
          </p>
        </CardHeader>
        <CardContent className="pt-5">
          <ol className="space-y-3">
            {companyType.debriefQuestions.map((q, i) => (
              <li
                key={i}
                className="flex gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
                  Q{i + 1}
                </span>
                <p className="pt-1.5 leading-relaxed text-slate-700">{q}</p>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <div className="flex justify-center pt-2">
        <Button size="lg" variant="outline" className="px-12" onClick={onRestart}>
          다시 시작
        </Button>
      </div>
    </div>
  );
}
