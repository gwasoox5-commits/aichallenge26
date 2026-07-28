"use client";

import type { VariableImpactExplainability } from "@/lib/v2/intelligence/types";
import type { ScenarioKey } from "@/lib/v2/event-studio/types";

interface Props {
  scenarioKey: ScenarioKey;
  impacts: VariableImpactExplainability[];
}

export function EconomyPreviewPanel({ scenarioKey, impacts }: Props) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-violet-800">4. Economy 영향 Preview ({scenarioKey})</h2>
      <p className="mt-1 text-xs text-slate-500">AI 제안 · 허용 범위 · 클램프 최종값 · GM Preview 전용 (V1 미적용)</p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
              <th className="pb-2 pr-2">변수</th>
              <th className="pb-2 pr-2">Mode</th>
              <th className="pb-2 pr-2 text-right">AI 제안</th>
              <th className="pb-2 pr-2 text-right">허용 범위</th>
              <th className="pb-2 pr-2 text-right">클램프</th>
              <th className="pb-2 pr-2">신뢰도</th>
              <th className="pb-2">근거 / 가정</th>
            </tr>
          </thead>
          <tbody>
            {impacts.map((v) => (
              <tr key={v.key} className="border-b border-slate-100">
                <td className="py-2 font-mono text-xs">{v.key}</td>
                <td className="py-2">{v.mode}</td>
                <td className="py-2 text-right font-mono">{v.proposedValue}</td>
                <td className="py-2 text-right font-mono text-xs text-slate-500">
                  [{v.allowedMin}, {v.allowedMax}]
                </td>
                <td className="py-2 text-right font-mono font-semibold text-violet-700">{v.clampedValue}</td>
                <td className="py-2">
                  <span
                    className={`rounded px-1.5 py-0.5 text-xs ${
                      v.confidence === "LOW"
                        ? "bg-amber-100 text-amber-800"
                        : v.confidence === "HIGH"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-100"
                    }`}
                  >
                    {formatConfidence(v.confidence)}
                  </span>
                  {v.lowAccuracyWarning && (
                    <p className="mt-0.5 text-xs text-amber-700">{v.lowAccuracyWarning}</p>
                  )}
                </td>
                <td className="py-2 text-xs text-slate-600">
                  <p>{v.reason}</p>
                  <p className="text-slate-400">가정: {v.assumption}</p>
                  {v.isEstimate && <span className="text-amber-700">(추정)</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function formatConfidence(label: VariableImpactExplainability["confidence"]): string {
  switch (label) {
    case "HIGH":
      return "높음";
    case "LOW":
      return "낮음";
    default:
      return "중간";
  }
}
