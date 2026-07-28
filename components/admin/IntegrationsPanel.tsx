"use client";

import { useCallback, useEffect, useState } from "react";
import { authFetch } from "@/lib/bsp/auth-client";
import type { IntegrationHealthResponse } from "@/lib/integrations/types";

type UsagePayload = {
  summary: {
    todayCalls: number;
    todayTokens: number;
    todayFailures: number;
    avgLatencyMs: number;
    estimatedCostUsd?: number;
    byFeature: Record<string, { calls: number; tokens: number; failures: number }>;
  };
};

export function IntegrationsPanel() {
  const [health, setHealth] = useState<IntegrationHealthResponse | null>(null);
  const [usage, setUsage] = useState<UsagePayload | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string>("");

  const refresh = useCallback(async (opts?: { live?: boolean }) => {
    const live = opts?.live ? "1" : "0";
    const [h, u] = await Promise.all([
      authFetch(`/api/integrations/health?live=${live}`).then((r) => (r.ok ? r.json() : null)),
      authFetch("/api/integrations/usage").then((r) => (r.ok ? r.json() : null)),
    ]);
    setHealth(h);
    setUsage(u);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const runTest = async (kind: "openai" | "news" | "fx") => {
    setTesting(kind);
    setTestResult("");
    const path =
      kind === "openai"
        ? "/api/integrations/test/openai"
        : kind === "news"
          ? "/api/integrations/test/news"
          : "/api/integrations/test/external-data";
    const res = await authFetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    const data = await res.json();
    setTestResult(JSON.stringify(data, null, 2));
    setTesting(null);
    await refresh({ live: true });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">외부 API 연동</h2>
        <button type="button" onClick={() => refresh()} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">
          새로고침
        </button>
      </div>

      <p className="text-sm text-slate-600">
        API Key 원문은 표시되지 않습니다. 설정됨/미설정 및 연결 테스트 결과만 확인합니다.
        <span className="mt-1 block text-slate-500">
          AI 사용량(토큰)은 인텔리전스·시나리오 등 실제 AI 기능 호출만 집계됩니다. 연결 테스트는 토큰에 포함되지 않습니다.
        </span>
      </p>

      {health && (
        <section className="grid gap-4 md:grid-cols-3">
          <ProviderCard
            title="OpenAI"
            snapshot={health.openai}
            onTest={() => runTest("openai")}
            testing={testing === "openai"}
          />
          <ProviderCard
            title="뉴스 Provider"
            snapshot={health.news}
            onTest={() => runTest("news")}
            testing={testing === "news"}
          />
          <ProviderCard
            title="외부 데이터 (환율)"
            snapshot={health.externalData}
            onTest={() => runTest("fx")}
            testing={testing === "fx"}
          />
        </section>
      )}

      {usage && (
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h3 className="font-semibold text-slate-900">AI 사용량 (오늘)</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="호출 수" value={String(usage.summary.todayCalls)} />
            <Stat label="토큰" value={String(usage.summary.todayTokens)} />
            <Stat label="실패" value={String(usage.summary.todayFailures)} />
            <Stat label="평균 응답" value={`${usage.summary.avgLatencyMs}ms`} />
          </div>
          {usage.summary.estimatedCostUsd != null && (
            <p className="mt-3 text-sm text-slate-600">추정 비용 (USD): ${usage.summary.estimatedCostUsd}</p>
          )}
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b text-left text-slate-500">
                  <th className="py-2 pr-4">기능</th>
                  <th className="py-2 pr-4">호출</th>
                  <th className="py-2 pr-4">토큰</th>
                  <th className="py-2">실패</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(usage.summary.byFeature).map(([feature, row]) => (
                  <tr key={feature} className="border-b border-slate-100">
                    <td className="py-2 pr-4 font-mono text-xs">{feature}</td>
                    <td className="py-2 pr-4">{row.calls}</td>
                    <td className="py-2 pr-4">{row.tokens}</td>
                    <td className="py-2">{row.failures}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {testResult && (
        <pre className="max-h-64 overflow-auto rounded-lg bg-slate-900 p-4 text-xs text-slate-100">{testResult}</pre>
      )}
    </div>
  );
}

const ERROR_HINTS: Record<string, string> = {
  QUOTA_EXCEEDED: "OpenAI 계정에 결제 수단·크레딧이 없으면 429로 표시될 수 있습니다. platform.openai.com → Billing을 확인하세요.",
  RATE_LIMITED: "짧은 시간에 너무 많은 요청을 보냈을 때 발생합니다. 새로고침 대신 「연결 테스트」만 사용하세요.",
  API_KEY_INVALID: "API Key가 만료되었거나 잘못되었습니다. .env.local의 OPENAI_API_KEY를 확인하세요.",
  API_KEY_MISSING: ".env.local에 OPENAI_API_KEY를 설정한 뒤 dev 서버를 재시작하세요.",
};

function ProviderCard({
  title,
  snapshot,
  onTest,
  testing,
}: {
  title: string;
  snapshot: IntegrationHealthResponse["openai"];
  onTest: () => void;
  testing: boolean;
}) {
  const modeColor =
    snapshot.mode === "LIVE"
      ? "text-emerald-700 bg-emerald-50"
      : snapshot.mode === "NOT_CONFIGURED" || snapshot.mode === "DISABLED"
        ? "text-slate-700 bg-slate-100"
        : snapshot.mode === "ERROR"
          ? "text-rose-700 bg-rose-50"
          : snapshot.mode === "FALLBACK" || snapshot.mode === "FIXTURE" || snapshot.mode === "MOCK"
            ? "text-amber-700 bg-amber-50"
            : "text-slate-600 bg-slate-100";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{title}</h3>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${modeColor}`}>{snapshot.mode}</span>
      </div>
      <dl className="mt-3 space-y-1 text-sm text-slate-600">
        <div>설정: {snapshot.configured ? "설정됨" : "미설정"}</div>
        <div>활성: {snapshot.enabled ? "예" : "아니오"}</div>
        {snapshot.avgLatencyMs != null && <div>평균 응답: {snapshot.avgLatencyMs}ms</div>}
        {snapshot.mode === "NOT_CONFIGURED" && (
          <p className="mt-2 text-xs text-slate-500">운영 환경에서는 Provider 설정이 필요합니다. 수동 뉴스 입력으로 계속할 수 있습니다.</p>
        )}
        {snapshot.lastErrorCode && (
          <div className="text-rose-600">
            <div>최근 오류: {snapshot.lastErrorCode}</div>
            {ERROR_HINTS[snapshot.lastErrorCode] && (
              <p className="mt-1 text-xs font-normal text-rose-500">{ERROR_HINTS[snapshot.lastErrorCode]}</p>
            )}
          </div>
        )}
      </dl>
      <button
        type="button"
        disabled={testing}
        onClick={onTest}
        className="mt-4 w-full rounded-lg bg-indigo-600 py-2 text-sm text-white hover:bg-indigo-500 disabled:opacity-50"
      >
        {testing ? "테스트 중…" : "연결 테스트"}
      </button>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}
