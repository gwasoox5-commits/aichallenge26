"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { authFetch } from "@/lib/bsp/auth-client";
import { mapStudioEffectToEngine } from "@/lib/v2/event-studio/variable-mapper";
import type {
  EventScenarioDraft,
  EventStudioInput,
  NewsDisplayMode,
  ScenarioKey,
  ScenarioWeights,
  SelectionMode,
} from "@/lib/v2/event-studio/types";
import type { EventApplyTiming } from "@/src/bsp/domain/events/event-types";
import { SCENARIO_LABEL_KO } from "@/lib/v2/event-studio/scenario-labels";

const DEFAULT_INPUT: EventStudioInput = {
  naturalLanguagePrompt:
    "미국과 EU가 전기차 보조금을 축소하고, 아시아산 부품에 관세 인상을 검토하고 있습니다.",
  targetIndustry: "자동차·부품 제조",
  targetMarketOrRegion: "북미 · EU",
  expectedDuration: "1~2반기",
  targetHalfLabel: "Y2H1 (P3/6)",
  analysisIntensity: "STANDARD",
};

const STEPS = [
  "자연어 입력",
  "AI 분석",
  "전망 비교",
  "변수 Preview",
  "선택 정책",
  "발행 시점",
  "뉴스 공개 수준",
  "최종 승인",
  "발행 결과",
  "Audit 확인",
];

export function EventStudioWorkflow() {
  const [sessionId, setSessionId] = useState("");
  const [step, setStep] = useState(0);
  const [input, setInput] = useState<EventStudioInput>(DEFAULT_INPUT);
  const [draft, setDraft] = useState<EventScenarioDraft | null>(null);
  const [selectedPreview, setSelectedPreview] = useState<ScenarioKey>("neutral");
  const [selectionMode, setSelectionMode] = useState<SelectionMode>("MANUAL");
  const [weights, setWeights] = useState<ScenarioWeights>({ pessimistic: 25, neutral: 50, optimistic: 25 });
  const [randomSeed, setRandomSeed] = useState("");
  const [applyTiming, setApplyTiming] = useState<EventApplyTiming>("IMMEDIATE");
  const [displayMode, setDisplayMode] = useState<NewsDisplayMode>("DIRECTIONAL");
  const [approveReason, setApproveReason] = useState("교육용 시나리오 승인");
  const [approveResult, setApproveResult] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [authRole, setAuthRole] = useState<string | null>(null);
  const [usedFixture, setUsedFixture] = useState(false);

  useEffect(() => {
    authFetch("/api/v1/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.role) setAuthRole(d.role);
        if (d?.sessionId && !sessionId) setSessionId(d.sessionId);
      })
      .catch(() => undefined);
  }, [sessionId]);

  const gmReady = authRole === "GM" || authRole === "PLATFORM_ADMIN";

  function formatStudioError(message: string) {
    if (message.includes("Insufficient role")) {
      return "권한 부족: Event Studio는 GM 또는 관리자(PLATFORM_ADMIN)만 사용할 수 있습니다. /admin/login 에서 로그인한 뒤 세션을 생성하세요.";
    }
    if (message.includes("Authentication required") || message.includes("Invalid or expired")) {
      return "로그인이 필요합니다. /admin/login 에서 관리자 로그인 후 다시 시도하세요.";
    }
    return message;
  }

  const mappedEffects = useMemo(() => {
    if (!draft?.studioOutput) return [];
    const key = draft.selection?.selectedOutcome ?? selectedPreview;
    return draft.studioOutput.economyVariableChanges[key].effects.flatMap(mapStudioEffectToEngine);
  }, [draft, selectedPreview]);

  const api = useCallback(
    async (path: string, body?: Record<string, unknown>) => {
      if (!sessionId) throw new Error("sessionId required");
      const res = await authFetch(`/api/v2/event-studio${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body ?? {}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      return data;
    },
    [sessionId]
  );

  const runStep = async () => {
    setLoading(true);
    setError("");
    try {
      if (step === 0) {
        const res = await authFetch("/api/v2/event-studio/drafts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, input }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Create failed");
        if (!data.draft) throw new Error(data.error ?? "Create failed");
        setDraft(data.draft);
        setUsedFixture(false);
        setStep(1);
      } else if (step === 1 && draft) {
        const data = await api(`/drafts/${draft.draftId}/generate`, {});
        setDraft(data.draft);
        setUsedFixture(Boolean(data.meta?.usedFixture));
        setStep(2);
      } else if (step === 2 && draft) {
        setSelectedPreview(draft.selection?.selectedOutcome ?? "neutral");
        setStep(3);
      } else if (step === 3 && draft) {
        await api(`/drafts/${draft.draftId}/preview`, { selectedScenario: selectedPreview });
        setStep(4);
      } else if (step === 4 && draft) {
        const data = await api(`/drafts/${draft.draftId}/select`, {
          mode: selectionMode,
          selectedOutcome: selectionMode === "MANUAL" ? selectedPreview : undefined,
          weights: selectionMode === "WEIGHTED_RANDOM" ? weights : undefined,
          randomSeed: randomSeed || undefined,
        });
        setDraft(data.draft);
        setRandomSeed(data.selection.randomSeed);
        setStep(5);
      } else if (step === 5 && draft) {
        const data = await api(`/drafts/${draft.draftId}/schedule`, {
          applyTiming,
          displayMode,
          reason: approveReason,
        });
        setDraft(data);
        setStep(6);
      } else if (step === 6) {
        setStep(7);
      } else if (step === 7 && draft) {
        const data = await api(`/drafts/${draft.draftId}/approve`, { reason: approveReason });
        setApproveResult(data);
        const refreshed = await authFetch(`/api/v2/event-studio/drafts/${draft.draftId}`).then((r) => r.json());
        setDraft(refreshed.draft);
        setStep(8);
      } else if (step === 8) {
        setStep(9);
      }
    } catch (e) {
      setError(formatStudioError(e instanceof Error ? e.message : "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-6 py-8">
      <section className="rounded-xl border border-violet-200 bg-violet-50 p-4 text-sm">
        <strong>V2.1a Scenario Publishing</strong> — AI 생성 → 선택/랜덤 → 뉴스+Economy Patch 원자 발행
      </section>

      {!gmReady && (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <p className="font-medium">GM/관리자 로그인 필요</p>
          <p className="mt-1">
            현재 역할: {authRole ?? "미로그인"}
            {authRole === "CEO" && " (학습자). Join 후에는 Event Studio를 쓸 수 없습니다."}
          </p>
          <Link href="/admin/login?switch=admin" className="mt-2 inline-block font-medium text-indigo-700 underline">
            관리자 로그인 →
          </Link>
        </section>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <label className="block text-xs text-slate-600">Session ID (GM 토큰 세션과 일치)</label>
        <input
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 font-mono text-sm"
          value={sessionId}
          onChange={(e) => setSessionId(e.target.value)}
          placeholder="세션 UUID — /gm 에서 생성"
        />
      </section>

      <nav className="flex flex-wrap gap-2">
        {STEPS.map((label, i) => (
          <span
            key={label}
            className={`rounded-full px-3 py-1 text-xs ${
              i === step ? "bg-violet-600 text-white" : i < step ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-500"
            }`}
          >
            {i + 1}. {label}
          </span>
        ))}
      </nav>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {usedFixture && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          샘플 모드: OpenAI Live 대신 입력 프롬프트를 반영한 교육용 시나리오입니다. 실제 AI 분석을 쓰려면 `.env.local`의
          OPENAI_API_KEY를 확인하고 dev 서버를 재시작하세요.
        </p>
      )}

      {step === 0 && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
          <h2 className="text-lg font-semibold text-violet-800">1. 자연어 이벤트 입력</h2>
          <textarea
            className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm"
            rows={3}
            value={input.naturalLanguagePrompt}
            onChange={(e) => setInput({ ...input, naturalLanguagePrompt: e.target.value })}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="대상 산업" value={input.targetIndustry} onChange={(v) => setInput({ ...input, targetIndustry: v })} />
            <Field label="시장/지역" value={input.targetMarketOrRegion} onChange={(v) => setInput({ ...input, targetMarketOrRegion: v })} />
            <Field label="지속 기간" value={input.expectedDuration} onChange={(v) => setInput({ ...input, expectedDuration: v })} />
            <Field label="영향 반기" value={input.targetHalfLabel} onChange={(v) => setInput({ ...input, targetHalfLabel: v })} />
          </div>
        </section>
      )}

      {step === 2 && draft?.studioOutput && (
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-violet-800">3. 세 전망 비교</h2>
          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            {(["pessimistic", "neutral", "optimistic"] as ScenarioKey[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedPreview(key)}
                className={`rounded-lg border p-4 text-left ${
                  selectedPreview === key ? "border-violet-500 bg-violet-50" : "border-slate-300"
                }`}
              >
                <p className="font-semibold">{SCENARIO_LABEL_KO[key]}</p>
                <p className="mt-2 text-xs text-slate-600 line-clamp-3">{draft.studioOutput!.scenarios[key].narrative}</p>
                <p className="mt-2 text-xs text-orange-800">{draft.studioOutput!.scenarios[key].newsHeadline}</p>
              </button>
            ))}
          </div>
        </section>
      )}

      {step === 3 && draft?.studioOutput && (
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-violet-800">4. Economy 변수 Preview</h2>
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="border-b border-slate-300 text-left text-slate-500">
                <th className="pb-2">Engine Key</th>
                <th className="pb-2">Mode</th>
                <th className="pb-2 text-right">Value</th>
              </tr>
            </thead>
            <tbody>
              {mappedEffects.map((e, i) => (
                <tr key={`${e.key}-${i}`} className="border-b border-slate-200">
                  <td className="py-2 font-mono text-sky-700">{e.key}</td>
                  <td className="py-2">{e.mode}</td>
                  <td className="py-2 text-right font-mono">{e.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {step === 4 && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
          <h2 className="text-lg font-semibold text-violet-800">5. 선택 정책</h2>
          <div className="flex flex-wrap gap-2">
            {(["MANUAL", "EQUAL_RANDOM", "WEIGHTED_RANDOM"] as SelectionMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setSelectionMode(m)}
                className={`rounded-lg px-4 py-2 text-sm ${selectionMode === m ? "bg-violet-600" : "bg-slate-200"}`}
              >
                {m}
              </button>
            ))}
          </div>
          {selectionMode === "WEIGHTED_RANDOM" && (
            <div className="grid grid-cols-3 gap-2">
              {(["pessimistic", "neutral", "optimistic"] as const).map((k) => (
                <label key={k} className="text-xs">
                  {SCENARIO_LABEL_KO[k]} %
                  <input
                    type="number"
                    className="mt-1 w-full rounded border border-slate-300 bg-white p-2"
                    value={weights[k]}
                    onChange={(e) => setWeights({ ...weights, [k]: Number(e.target.value) })}
                  />
                </label>
              ))}
            </div>
          )}
          <Field label="Random Seed (optional)" value={randomSeed} onChange={setRandomSeed} />
        </section>
      )}

      {step === 5 && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
          <h2 className="text-lg font-semibold text-violet-800">6. 발행 시점</h2>
          <select
            className="w-full rounded-lg border border-slate-300 bg-white p-2"
            value={applyTiming}
            onChange={(e) => setApplyTiming(e.target.value as EventApplyTiming)}
          >
            <option value="IMMEDIATE">즉시 발행</option>
            <option value="NEXT_STEP">다음 Step 시작 시</option>
            <option value="NEXT_HALF">다음 반기 시작 시</option>
          </select>
        </section>
      )}

      {step === 6 && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
          <h2 className="text-lg font-semibold text-violet-800">7. 뉴스 공개 수준</h2>
          <select
            className="w-full rounded-lg border border-slate-300 bg-white p-2"
            value={displayMode}
            onChange={(e) => setDisplayMode(e.target.value as NewsDisplayMode)}
          >
            <option value="HEADLINE_ONLY">HEADLINE_ONLY</option>
            <option value="DIRECTIONAL">DIRECTIONAL</option>
            <option value="DETAILED">DETAILED</option>
          </select>
        </section>
      )}

      {step === 7 && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
          <h2 className="text-lg font-semibold text-orange-800">8. 최종 승인</h2>
          <textarea
            className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm"
            rows={2}
            value={approveReason}
            onChange={(e) => setApproveReason(e.target.value)}
          />
          <p className="text-xs text-slate-500">승인 시 뉴스 발행 + Economy Patch가 원자적으로 적용됩니다.</p>
        </section>
      )}

      {step === 8 && approveResult && (
        <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-6">
          <h2 className="text-lg font-semibold text-emerald-700">9. 발행 결과</h2>
          <pre className="mt-2 overflow-auto text-xs text-slate-700">{JSON.stringify(approveResult, null, 2)}</pre>
        </section>
      )}

      {step === 9 && draft && (
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-violet-800">10. 적용 상태</h2>
          <p className="mt-2 text-sm">Status: <strong>{draft.status}</strong></p>
          {draft.newsPublication && (
            <p className="text-sm text-slate-600">News: {draft.newsPublication.headline}</p>
          )}
          {draft.customEvent && (
            <p className="text-sm text-slate-600">Event: {draft.customEvent.templateId}</p>
          )}
        </section>
      )}

      {step < 9 && (
        <button
          type="button"
          disabled={loading || !sessionId}
          onClick={runStep}
          className="rounded-lg bg-violet-600 px-6 py-2.5 text-sm font-semibold hover:bg-violet-500 disabled:opacity-50"
        >
          {loading ? "처리 중…" : step === 7 ? "GM 승인 및 발행" : "다음 단계"}
        </button>
      )}
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
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
