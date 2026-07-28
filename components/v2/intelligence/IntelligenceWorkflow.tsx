"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { authFetch } from "@/lib/bsp/auth-client";
import type {
  IntelligencePreview,
  IntelligenceScenario,
  LibraryEntry,
  NewsAnalysis,
  NewsArticle,
  ScenarioQualityScore,
} from "@/lib/v2/intelligence/types";
import type { ConsultantOutput } from "@/lib/v2/intelligence/types";
import type { ScenarioKey } from "@/lib/v2/event-studio/types";
import {
  demoAnalysis,
  demoConsultant,
  demoQuality,
  demoScenarios,
  demoSearch,
  DEMO_ARTICLES,
} from "@/lib/v2/intelligence/client-fixtures";
import { NewsDiscoveryPanel } from "./NewsDiscoveryPanel";
import { AnalysisPanel } from "./AnalysisPanel";
import { ScenarioComparePanel } from "./ScenarioComparePanel";
import { EconomyPreviewPanel } from "./EconomyPreviewPanel";
import { ConsultantPanel } from "./ConsultantPanel";
import { QualityBadge } from "./QualityBadge";
import { ScenarioLibraryPanel } from "./ScenarioLibraryPanel";
import { PublishWorkflowPanel } from "./PublishWorkflowPanel";

function parseKeywords(raw: string): string[] {
  return raw
    .split(/[,，、\s]+/)
    .map((k) => k.trim())
    .filter(Boolean);
}

async function readApiError(res: Response, fallback: string): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string; message?: string };
    return data.error ?? data.message ?? fallback;
  } catch {
    return fallback;
  }
}

export function IntelligenceWorkflow() {
  const [sessionId, setSessionId] = useState("");
  const [keywords, setKeywords] = useState("반도체, AI, 관세");
  const [articles, setArticles] = useState<NewsArticle[]>(DEMO_ARTICLES);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<NewsAnalysis | null>(null);
  const [scenarios, setScenarios] = useState<IntelligenceScenario[] | null>(null);
  const [consultant, setConsultant] = useState<ConsultantOutput | null>(null);
  const [quality, setQuality] = useState<ScenarioQualityScore | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<ScenarioKey>("neutral");
  const [library, setLibrary] = useState<LibraryEntry[]>([]);
  const [demoMode, setDemoMode] = useState(true);
  const [statusNote, setStatusNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [authRole, setAuthRole] = useState<string | null>(null);

  useEffect(() => {
    authFetch("/api/v1/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.role) setAuthRole(d.role);
        if (d?.sessionId && !sessionId) setSessionId(d.sessionId);
      })
      .catch(() => undefined);
  }, [sessionId]);

  const loadLibrary = useCallback(async (sid: string) => {
    if (!sid) return;
    try {
      const res = await authFetch(`/api/v2/intelligence/library?sessionId=${encodeURIComponent(sid)}`);
      if (!res.ok) return;
      const data = (await res.json()) as { entries?: LibraryEntry[] };
      if (data.entries) setLibrary(data.entries);
    } catch {
      /* ignore — local library still works */
    }
  }, []);

  useEffect(() => {
    if (sessionId) loadLibrary(sessionId);
  }, [sessionId, loadLibrary]);

  const selectedArticles = useMemo(
    () => articles.filter((a) => selectedIds.has(a.id)),
    [articles, selectedIds]
  );

  const toggleArticle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const searchNews = useCallback(async () => {
    if (!sessionId) {
      setError("GM 세션 ID를 입력하세요.");
      return;
    }
    setLoading(true);
    setError(null);
    setStatusNote(null);
    try {
      const res = await authFetch("/api/v2/intelligence/news/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          keywords: parseKeywords(keywords),
        }),
      });
      const data = (await res.json()) as {
        articles?: NewsArticle[];
        usedFixture?: boolean;
        error?: string;
        errorMessage?: string;
        note?: string;
      };
      if (res.ok && data.articles && data.articles.length > 0) {
        setArticles(data.articles);
        setSelectedIds(new Set());
        setDemoMode(Boolean(data.usedFixture));
        setStatusNote(
          data.note ??
            (data.errorMessage ? `${data.errorMessage}` : undefined) ??
            (data.usedFixture
              ? "샘플 뉴스 모드입니다. 실뉴스는 Google News RSS(기본) 또는 GNews API Key 설정이 필요합니다."
              : "실시간 뉴스 검색 결과입니다 (Google News RSS).")
        );
        return;
      }
      if (res.ok) {
        const fallback = demoSearch(keywords);
        setArticles(fallback);
        setSelectedIds(new Set());
        setDemoMode(true);
        setStatusNote(data.note ?? "검색 결과가 없어 샘플 뉴스를 표시합니다.");
        return;
      }
      const message = data.error ?? `뉴스 검색 실패 (${res.status})`;
      const fallback = demoSearch(keywords);
      setArticles(fallback);
      setSelectedIds(new Set());
      setDemoMode(true);
      setError(`${message} · 샘플 뉴스 ${fallback.length}건을 표시합니다.`);
    } catch (e) {
      const fallback = demoSearch(keywords);
      setArticles(fallback);
      setSelectedIds(new Set());
      setDemoMode(true);
      setError(`${e instanceof Error ? e.message : "뉴스 검색 실패"} · 샘플 뉴스를 표시합니다.`);
    } finally {
      setLoading(false);
    }
  }, [keywords, sessionId]);

  const runDemoPipeline = (apiError?: string) => {
    const a = demoAnalysis(selectedArticles);
    const s = demoScenarios();
    const c = demoConsultant();
    const q = demoQuality(a, s);
    setPreviewId(`demo-${Date.now()}`);
    setAnalysis(a);
    setScenarios(s);
    setConsultant(c);
    setQuality(q);
    setDemoMode(true);
    setError(null);
    setStatusNote(
      apiError
        ? `API 연결 실패(${apiError}) — 샘플 분석 결과를 표시합니다.`
        : "API 연결 실패로 샘플 분석 결과를 표시합니다."
    );
  };

  const runPipeline = async () => {
    if (!sessionId) {
      setError("GM 세션 ID를 입력하세요.");
      return;
    }
    if (selectedArticles.length === 0) {
      setError("기사를 1개 이상 선택하세요.");
      return;
    }
    setLoading(true);
    setError(null);
    setStatusNote(null);
    try {
      const analyzeRes = await authFetch("/api/v2/intelligence/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          articleIds: selectedArticles.map((a) => a.id),
          articles: selectedArticles,
        }),
      });
      if (!analyzeRes.ok) {
        throw new Error(await readApiError(analyzeRes, "AI 분석 실패"));
      }
      const analyzed = (await analyzeRes.json()) as { previewId: string; analysis: NewsAnalysis };
      setPreviewId(analyzed.previewId);
      setAnalysis(analyzed.analysis);

      const scenRes = await authFetch("/api/v2/intelligence/scenarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, previewId: analyzed.previewId }),
      });
      if (!scenRes.ok) {
        throw new Error(await readApiError(scenRes, "시나리오 생성 실패"));
      }
      const scenData = (await scenRes.json()) as { scenarios: IntelligenceScenario[] };
      setScenarios(scenData.scenarios);

      const prevRes = await authFetch("/api/v2/intelligence/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, previewId: analyzed.previewId, selectedScenario }),
      });
      if (!prevRes.ok) {
        throw new Error(await readApiError(prevRes, "Preview 생성 실패"));
      }
      const prev = (await prevRes.json()) as { preview: IntelligencePreview };
      setConsultant(prev.preview.consultant ?? null);
      setQuality(prev.preview.quality ?? null);
      setDemoMode(false);
      setStatusNote("AI 분석·시나리오·Preview가 완료되었습니다.");
    } catch (e) {
      const apiError = e instanceof Error ? e.message : "파이프라인 실행 실패";
      runDemoPipeline(apiError);
    } finally {
      setLoading(false);
    }
  };

  const saveToLibrary = async () => {
    if (!previewId || !analysis) return;
    try {
      const res = await authFetch("/api/v2/intelligence/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, previewId, title: analysis.eventSummary.slice(0, 80) }),
      });
      if (res.ok) {
        const data = (await res.json()) as { entry: LibraryEntry };
        setLibrary((prev) => [data.entry, ...prev.filter((e) => e.libraryId !== data.entry.libraryId)]);
        setStatusNote("시나리오를 라이브러리에 저장했습니다.");
        return;
      }
      setError(await readApiError(res, "라이브러리 저장 실패"));
    } catch {
      /* demo fallback below */
    }
    const entry: LibraryEntry = {
      libraryId: `lib-${previewId}`,
      title: analysis.eventSummary.slice(0, 80),
      favorite: false,
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      preview: {
        previewId,
        sessionId,
        articles: selectedArticles,
        analysis,
        scenarios: scenarios ?? undefined,
        consultant: consultant ?? undefined,
        quality: quality ?? undefined,
        status: "PREVIEW",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: "demo-gm",
      },
    };
    setLibrary((prev) => [entry, ...prev]);
    setStatusNote("로컬 라이브러리에 저장했습니다 (데모).");
  };

  const currentImpacts = scenarios?.find((s) => s.scenarioKey === selectedScenario)?.variableImpacts ?? [];
  const gmReady = authRole === "GM" || authRole === "PLATFORM_ADMIN";

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-6 py-8">
      <section className="rounded-xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-900">
        <strong>실시간 Intelligence</strong> — 실뉴스 → AI 분석 → 시나리오 → 경제 변수 미리보기 → GM 발행
        {demoMode && " · (현재 샘플/데모 모드)"}
      </section>

      {!gmReady && (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <p className="font-medium">GM/관리자 로그인 필요</p>
          <p className="mt-1">현재 역할: {authRole ?? "미로그인"}</p>
        </section>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <label className="block text-xs text-slate-600">
          GM 세션 ID (운영 콘솔 세션과 동일해야 Publish 가능)
          <input
            className="mt-1 w-full max-w-md rounded border border-slate-300 p-2 font-mono text-sm"
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            placeholder="세션 UUID"
          />
        </label>
      </section>

      <NewsDiscoveryPanel
        articles={articles}
        selectedIds={selectedIds}
        onToggle={toggleArticle}
        keywords={keywords}
        onKeywordsChange={setKeywords}
        onSearch={searchNews}
        loading={loading}
      />

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={loading || selectedArticles.length === 0}
          onClick={runPipeline}
          className="rounded-lg bg-violet-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
        >
          {loading ? "파이프라인 실행 중…" : "AI 분석 → 시나리오 → Preview"}
        </button>
        {analysis && (
          <button
            type="button"
            onClick={saveToLibrary}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
          >
            라이브러리 저장
          </button>
        )}
      </div>

      {statusNote && <p className="text-sm text-emerald-700">{statusNote}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {analysis && <AnalysisPanel analysis={analysis} />}
      {scenarios && (
        <ScenarioComparePanel scenarios={scenarios} selected={selectedScenario} onSelect={setSelectedScenario} />
      )}
      {currentImpacts.length > 0 && (
        <EconomyPreviewPanel scenarioKey={selectedScenario} impacts={currentImpacts} />
      )}
      {quality && <QualityBadge quality={quality} />}
      {consultant && <ConsultantPanel consultant={consultant} />}

      {analysis && scenarios && previewId && !demoMode && (
        <PublishWorkflowPanel sessionId={sessionId} previewId={previewId} selectedScenario={selectedScenario} />
      )}

      {analysis && scenarios && demoMode && (
        <section className="rounded-xl border border-slate-200 bg-slate-50 p-6">
          <h2 className="text-lg font-semibold text-slate-800">Preview 완료 (데모)</h2>
          <p className="mt-2 text-sm text-slate-600">
            GM 세션 토큰과 OpenAI/GNews 연동이 되면 Publish Workflow가 활성화됩니다.
          </p>
        </section>
      )}

      <ScenarioLibraryPanel
        entries={library}
        onFavorite={(id, fav) => setLibrary((prev) => prev.map((e) => (e.libraryId === id ? { ...e, favorite: fav } : e)))}
        onDuplicate={(id) => {
          const src = library.find((e) => e.libraryId === id);
          if (!src) return;
          setLibrary((prev) => [
            {
              ...structuredClone(src),
              libraryId: `lib-dup-${Date.now()}`,
              title: `${src.title} (복사)`,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            ...prev,
          ]);
        }}
        onExport={(id) => {
          const entry = library.find((e) => e.libraryId === id);
          if (!entry) return;
          const blob = new Blob([JSON.stringify(entry, null, 2)], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${entry.libraryId}.json`;
          a.click();
          URL.revokeObjectURL(url);
        }}
        onImport={(json) => {
          try {
            const entry = JSON.parse(json) as LibraryEntry;
            entry.libraryId = `lib-imp-${Date.now()}`;
            setLibrary((prev) => [entry, ...prev]);
          } catch {
            setError("JSON 가져오기 실패");
          }
        }}
      />
    </div>
  );
}
