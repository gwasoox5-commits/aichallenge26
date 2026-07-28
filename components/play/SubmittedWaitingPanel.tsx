"use client";

import type { CeoNewsItem } from "@/components/v2/news/CeoNewsPanel";

type Props = {
  teamName: string;
  periodLabel: string;
  stepLabel: string;
  submittedAt?: string;
  submitRatePercent?: number;
  totalTeams?: number;
  submittedTeams?: number;
  newsItems?: CeoNewsItem[];
  cashManwon?: number;
  revenueManwon?: number;
};

export function SubmittedWaitingPanel({
  teamName,
  periodLabel,
  stepLabel,
  submittedAt,
  submitRatePercent,
  totalTeams,
  submittedTeams,
  newsItems = [],
  cashManwon,
  revenueManwon,
}: Props) {
  const recentNews = newsItems.slice(0, 3);

  return (
    <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-6" data-testid="submitted-waiting-panel">
      <div className="flex items-start gap-3">
        <span className="text-2xl" aria-hidden="true">✓</span>
        <div>
          <h2 className="text-lg font-semibold text-emerald-900">제출 완료</h2>
          <p className="mt-1 text-sm text-emerald-800">
            {teamName} · {periodLabel} · {stepLabel}
          </p>
          {submittedAt && (
            <p className="mt-1 text-xs text-emerald-700">제출 시각: {new Date(submittedAt).toLocaleString("ko-KR")}</p>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg bg-white p-4">
          <p className="text-xs text-slate-500">전체 제출 현황</p>
          <p className="mt-1 text-lg font-semibold">
            {submittedTeams ?? "—"}/{totalTeams ?? "—"}팀
            {submitRatePercent != null && <span className="ml-2 text-sm text-slate-500">({submitRatePercent}%)</span>}
          </p>
          <p className="mt-1 text-xs text-slate-500">GM이 다음 Step을 진행하면 자동으로 화면이 전환됩니다.</p>
        </div>
        <div className="rounded-lg bg-white p-4">
          <p className="text-xs text-slate-500">현재 KPI</p>
          <dl className="mt-2 space-y-1 text-sm">
            {cashManwon != null && (
              <div className="flex justify-between"><dt className="text-slate-600">현금</dt><dd className="font-mono">{cashManwon.toLocaleString()}만원</dd></div>
            )}
            {revenueManwon != null && (
              <div className="flex justify-between"><dt className="text-slate-600">매출</dt><dd className="font-mono">{revenueManwon.toLocaleString()}만원</dd></div>
            )}
          </dl>
        </div>
      </div>

      {recentNews.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-slate-700">최근 뉴스</h3>
          <ul className="mt-2 space-y-2">
            {recentNews.map((n) => (
              <li key={n.newsId} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                <span className="font-medium">{n.headline}</span>
                {n.summary && <p className="text-xs text-slate-500">{n.summary}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-4 text-xs text-slate-500">다른 팀의 의사결정 내용은 공개되지 않습니다.</p>
    </section>
  );
}
