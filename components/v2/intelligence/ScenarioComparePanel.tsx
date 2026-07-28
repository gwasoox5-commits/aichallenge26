"use client";

import type { IntelligenceScenario } from "@/lib/v2/intelligence/types";
import type { ScenarioKey } from "@/lib/v2/event-studio/types";

interface Props {
  scenarios: IntelligenceScenario[];
  selected: ScenarioKey;
  onSelect: (key: ScenarioKey) => void;
}

export function ScenarioComparePanel({ scenarios, selected, onSelect }: Props) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-violet-800">3. 시나리오 비교 (3-way)</h2>
      <p className="mt-1 text-xs text-slate-500">제조 기업 what-if (교육용) — GM 검토 후 Preview</p>
      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {scenarios.map((s) => (
          <button
            key={s.scenarioKey}
            type="button"
            onClick={() => onSelect(s.scenarioKey)}
            className={`rounded-lg border p-4 text-left ${
              selected === s.scenarioKey
                ? "border-violet-500 bg-violet-50 ring-1 ring-violet-600"
                : "border-slate-200 bg-slate-50 hover:border-slate-300"
            }`}
          >
            <p className="font-semibold">{s.label}</p>
            <p className="mt-2 text-xs text-slate-600 line-clamp-4">{s.description}</p>
            <p className="mt-2 text-xs text-slate-500">가정 {s.assumptions.length}개 · 변수 {s.variableImpacts.length}개</p>
          </button>
        ))}
      </div>
      {scenarios
        .filter((s) => s.scenarioKey === selected)
        .map((s) => (
          <div key={s.scenarioKey} className="mt-4 rounded-lg bg-slate-50 p-4 text-sm">
            <p className="font-medium">가정</p>
            <ul className="mt-1 list-inside list-disc text-slate-700">
              {s.assumptions.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
            <p className="mt-3 font-medium">예상 결과</p>
            <ul className="mt-1 list-inside list-disc text-slate-700">
              {s.expectedOutcomes.map((o) => (
                <li key={o}>{o}</li>
              ))}
            </ul>
          </div>
        ))}
    </section>
  );
}
