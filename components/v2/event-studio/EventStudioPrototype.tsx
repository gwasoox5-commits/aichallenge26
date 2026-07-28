"use client";

import { useMemo, useState } from "react";
import { MOCK_SCENARIO_OUTPUT } from "@/lib/v2/event-studio/mock-scenario-output";
import { mapStudioEffectToEngine } from "@/lib/v2/event-studio/variable-mapper";
import type { EventScenarioStudioOutput, EventStudioInput, ScenarioKey } from "@/lib/v2/event-studio/types";

const DEFAULT_INPUT: EventStudioInput = {
  naturalLanguagePrompt:
    "미국과 EU가 전기차 보조금을 축소하고, 아시아산 부품에 관세 인상을 검토하고 있습니다.",
  targetIndustry: "자동차·부품 제조",
  targetMarketOrRegion: "북미 · EU",
  expectedDuration: "1~2반기",
  targetHalfLabel: "Y2H1 (P3/6)",
  analysisIntensity: "STANDARD",
  economySnapshotId: "demo-session-live",
};

export function EventStudioPrototype() {
  const [input, setInput] = useState<EventStudioInput>(DEFAULT_INPUT);
  const [output, setOutput] = useState<EventScenarioStudioOutput | null>(null);
  const [selected, setSelected] = useState<ScenarioKey>("neutral");
  const [loading, setLoading] = useState(false);
  const [approved, setApproved] = useState(false);

  const mappedEffects = useMemo(() => {
    if (!output) return [];
    return output.economyVariableChanges[selected].effects.flatMap(mapStudioEffectToEngine);
  }, [output, selected]);

  const runMockGenerate = () => {
    setLoading(true);
    setApproved(false);
    setTimeout(() => {
      setOutput({
        ...MOCK_SCENARIO_OUTPUT,
        meta: {
          ...MOCK_SCENARIO_OUTPUT.meta,
          summary: MOCK_SCENARIO_OUTPUT.meta.summary,
          targetIndustry: input.targetIndustry,
          targetMarketOrRegion: input.targetMarketOrRegion,
          expectedDuration: input.expectedDuration,
          targetPeriodLabel: input.targetHalfLabel,
          analysisIntensity: input.analysisIntensity,
        },
      });
      setLoading(false);
    }, 800);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-6 py-8">
      <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-100">
        <strong>V2.1 Prototype</strong> — OpenAI 미연동 · Mock Structured Output · GM 승인 전 Event Engine
        전달 없음
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-violet-800">1. 시나리오 입력</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-xs text-slate-600">이벤트 자연어 설명</span>
            <textarea
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm"
              rows={3}
              value={input.naturalLanguagePrompt}
              onChange={(e) => setInput({ ...input, naturalLanguagePrompt: e.target.value })}
            />
          </label>
          <Field label="대상 산업" value={input.targetIndustry} onChange={(v) => setInput({ ...input, targetIndustry: v })} />
          <Field
            label="대상 시장/지역"
            value={input.targetMarketOrRegion}
            onChange={(v) => setInput({ ...input, targetMarketOrRegion: v })}
          />
          <Field
            label="예상 지속 기간"
            value={input.expectedDuration}
            onChange={(v) => setInput({ ...input, expectedDuration: v })}
          />
          <Field
            label="영향 반기"
            value={input.targetHalfLabel}
            onChange={(v) => setInput({ ...input, targetHalfLabel: v })}
          />
          <label className="block">
            <span className="text-xs text-slate-600">분석 강도</span>
            <select
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-sm"
              value={input.analysisIntensity}
              onChange={(e) =>
                setInput({ ...input, analysisIntensity: e.target.value as EventStudioInput["analysisIntensity"] })
              }
            >
              <option value="LIGHT">LIGHT</option>
              <option value="STANDARD">STANDARD</option>
              <option value="DEEP">DEEP</option>
            </select>
          </label>
          <Field
            label="Economy Snapshot (세션 ID)"
            value={input.economySnapshotId ?? ""}
            onChange={(v) => setInput({ ...input, economySnapshotId: v })}
          />
        </div>
        <button
          type="button"
          onClick={runMockGenerate}
          disabled={loading}
          className="mt-4 rounded-lg bg-violet-600 px-6 py-2.5 text-sm font-semibold hover:bg-violet-500 disabled:opacity-50"
        >
          {loading ? "분석 중… (Mock)" : "AI 시나리오 생성 (Mock)"}
        </button>
      </section>

      {output && (
        <>
          <section className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-violet-800">2. AI 출력 요약</h2>
            <p className="mt-2 text-xl font-bold text-slate-900">{output.meta.title}</p>
            <p className="mt-2 text-sm text-slate-700">{output.meta.summary}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <Badge>{output.meta.category}</Badge>
              <Badge>신뢰: {output.meta.confidenceLabel}</Badge>
              {output.meta.isEstimate && <Badge tone="amber">추정 포함</Badge>}
            </div>
            <h3 className="mt-4 text-sm font-medium text-slate-600">주요 가정</h3>
            <ul className="mt-1 list-inside list-disc text-sm text-slate-700">
              {output.assumptions.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
            <h3 className="mt-4 text-sm font-medium text-slate-600">영향 경로</h3>
            <ul className="mt-1 space-y-1 text-sm text-slate-700">
              {output.impactPathways.map((p) => (
                <li key={p.path}>
                  {p.path} <span className="text-slate-500">→ {p.affectedSteps.join(", ")}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-violet-800">3. 전망 선택 (GM 검토)</h2>
            <p className="mt-1 text-xs text-slate-500">
              확률이 아닌 교육용 what-if 시나리오 — 하나를 선택해 Preview 후 승인
            </p>
            <div className="mt-4 grid gap-3 lg:grid-cols-3">
              {(["pessimistic", "neutral", "optimistic"] as ScenarioKey[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setSelected(key);
                    setApproved(false);
                  }}
                  className={`rounded-lg border p-4 text-left transition ${
                    selected === key
                      ? "border-violet-500 bg-violet-50 ring-1 ring-violet-600"
                      : "border-slate-300 bg-slate-50 hover:border-slate-300"
                  }`}
                >
                  <p className="font-semibold text-slate-900">{output.scenarios[key].label}</p>
                  <p className="mt-2 line-clamp-4 text-xs text-slate-600">{output.scenarios[key].narrative}</p>
                </button>
              ))}
            </div>
            <div className="mt-4 rounded-lg bg-slate-100 p-4 text-sm">
              <p className="font-medium text-orange-800">근거</p>
              <p className="mt-1 text-slate-700">{output.scenarios[selected].rationale}</p>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-violet-800">4. Economy 변수 Preview (Engine 매핑)</h2>
            <table className="mt-3 w-full text-sm">
              <thead>
                <tr className="border-b border-slate-300 text-left text-slate-500">
                  <th className="pb-2">Studio 변수</th>
                  <th className="pb-2">Engine Key</th>
                  <th className="pb-2">Mode</th>
                  <th className="pb-2 text-right">Value</th>
                </tr>
              </thead>
              <tbody>
                {mappedEffects.map((e, i) => (
                  <tr key={`${e.key}-${i}`} className="border-b border-slate-200">
                    <td className="py-2 text-slate-600">—</td>
                    <td className="py-2 font-mono text-sky-700">{e.key}</td>
                    <td className="py-2">{e.mode}</td>
                    <td className="py-2 text-right font-mono">{e.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-amber-800">{output.uncertainty.educationDisclaimer}</p>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-violet-800">5. GM 승인 → Event Engine</h2>
            <p className="mt-2 text-sm text-slate-600">
              승인 시에만 <code className="text-violet-700">Event Draft</code> → 기존 P4{" "}
              <code className="text-violet-700">fireEvent</code> / Economy Patch 파이프라인으로 전달됩니다.
            </p>
            <button
              type="button"
              onClick={() => setApproved(true)}
              className="mt-4 rounded-lg bg-orange-600 px-6 py-2.5 text-sm font-semibold hover:bg-orange-500"
            >
              GM 승인 (Prototype — Engine 미연결)
            </button>
            {approved && (
              <p className="mt-3 text-sm text-emerald-700" role="status">
                ✓ 승인 기록됨 (Prototype). Production: POST /api/v2/event-studio/drafts/&#123;id&#125;/approve →
                EventEngineService.fireCustomEvent()
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs text-slate-600">{label}</span>
      <input
        className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function Badge({ children, tone }: { children: React.ReactNode; tone?: "amber" }) {
  return (
    <span
      className={`rounded px-2 py-0.5 ${
        tone === "amber" ? "bg-amber-100 text-amber-800" : "bg-slate-200 text-slate-700"
      }`}
    >
      {children}
    </span>
  );
}
