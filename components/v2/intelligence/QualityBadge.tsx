"use client";

import type { ScenarioQualityScore } from "@/lib/v2/intelligence/types";

export function QualityBadge({ quality }: { quality: ScenarioQualityScore }) {
  const tone =
    quality.overall >= 75 ? "border-emerald-300 bg-emerald-50 text-emerald-900" : quality.overall >= 55
      ? "border-amber-300 bg-amber-50 text-amber-900"
      : "border-red-300 bg-red-50 text-red-900";

  return (
    <div className={`rounded-lg border p-4 ${tone}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">시나리오 품질 점수</h3>
        <span className="text-2xl font-bold">{quality.overall}</span>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
        <Metric label="현실성" value={quality.realism} />
        <Metric label="논리성" value={quality.logic} />
        <Metric label="경제 일관성" value={quality.economicConsistency} />
        <Metric label="교육 가치" value={quality.educationValue} />
        <Metric label="다양성" value={quality.diversity} />
        <Metric label="게임 적합" value={quality.gameFit} />
      </dl>
      {quality.recommendRegenerate && (
        <p className="mt-3 text-sm font-medium text-red-700">점수가 낮습니다 — 재생성을 권장합니다.</p>
      )}
      {quality.notes.length > 0 && (
        <ul className="mt-2 list-inside list-disc text-xs">
          {quality.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-mono font-semibold">{value}</dd>
    </div>
  );
}
