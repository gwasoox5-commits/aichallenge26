"use client";

import type { NewsAnalysis } from "@/lib/v2/intelligence/types";

export function AnalysisPanel({ analysis }: { analysis: NewsAnalysis }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-violet-800">2. AI 뉴스 분석</h2>
      <div className="mt-2 flex flex-wrap gap-2 text-xs">
        <span className="rounded bg-slate-100 px-2 py-0.5">프롬프트 {analysis.promptVersion}</span>
        <span className="rounded bg-slate-100 px-2 py-0.5">신뢰도 {formatConfidence(analysis.confidenceLabel)}</span>
        {analysis.isEstimate && <span className="rounded bg-amber-100 px-2 py-0.5 text-amber-800">추정 포함</span>}
      </div>
      <p className="mt-4 text-sm text-slate-800">{analysis.eventSummary}</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Block title="핵심 이슈" items={analysis.keyIssues} />
        <Block title="리스크" items={analysis.riskFactors} />
        <Block title="기회" items={analysis.opportunityFactors} />
      </div>
      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <Impact label="공급망" text={analysis.supplyChainImpact} />
        <Impact label="생산" text={analysis.productionImpact} />
        <Impact label="판매" text={analysis.salesImpact} />
        <Impact label="재무" text={analysis.financialImpact} />
      </div>
      <h3 className="mt-4 text-sm font-medium text-slate-600">출처 인용</h3>
      <ul className="mt-2 space-y-1 text-xs text-slate-600">
        {analysis.citations.map((c) => (
          <li key={c.articleId}>
            {c.title} — {c.outlet} ({new Date(c.publishedAt).toLocaleDateString("ko-KR")}){" "}
            <a href={c.url} className="text-violet-700 hover:underline" target="_blank" rel="noreferrer">
              URL
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

function formatConfidence(label: NewsAnalysis["confidenceLabel"]): string {
  switch (label) {
    case "HIGH":
      return "높음";
    case "LOW":
      return "낮음";
    default:
      return "중간";
  }
}

function Block({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="text-sm font-medium text-slate-600">{title}</h3>
      <ul className="mt-1 list-inside list-disc text-sm text-slate-700">
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </div>
  );
}

function Impact({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-sm text-slate-700">{text}</p>
    </div>
  );
}
