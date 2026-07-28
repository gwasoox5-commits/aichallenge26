"use client";

import { useCallback, useMemo, useState } from "react";
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

const DEFAULT_SESSION = "demo-intelligence-session";

export function IntelligenceWorkflow() {
  const [sessionId, setSessionId] = useState(DEFAULT_SESSION);
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
  const [error, setError] = useState<string | null>(null);

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
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch("/api/v2/intelligence/news/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          keywords: keywords.split(",").map((k) => k.trim()).filter(Boolean),
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { articles: NewsArticle[]; usedFixture?: boolean };
        setArticles(data.articles);
        setDemoMode(Boolean(data.usedFixture));
      } else {
        setArticles(demoSearch(keywords));
        setDemoMode(true);
      }
    } catch {
      setArticles(demoSearch(keywords));
      setDemoMode(true);
    } finally {
      setLoading(false);
    }
  }, [keywords, sessionId]);

  const runPipeline = async () => {
    if (selectedArticles.length === 0) {
      setError("기사를 1개 이상 선택하세요.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const analyzeRes = await authFetch("/api/v2/intelligence/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          articleIds: selectedArticles.map((a) => a.id),
        }),
      });
      if (!analyzeRes.ok) throw new Error("analyze failed");
      const analyzed = (await analyzeRes.json()) as { previewId: string; analysis: NewsAnalysis };
      setPreviewId(analyzed.previewId);
      setAnalysis(analyzed.analysis);

      const scenRes = await authFetch("/api/v2/intelligence/scenarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, previewId: analyzed.previewId }),
      });
      if (!scenRes.ok) throw new Error("scenarios failed");
      const scenData = (await scenRes.json()) as { scenarios: IntelligenceScenario[] };
      setScenarios(scenData.scenarios);

      const prevRes = await authFetch("/api/v2/intelligence/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, previewId: analyzed.previewId, selectedScenario }),
      });
      if (!prevRes.ok) throw new Error("preview failed");
      const prev = (await prevRes.json()) as {
        preview: IntelligencePreview;
      };
      setConsultant(prev.preview.consultant ?? null);
      setQuality(prev.preview.quality ?? null);
      setDemoMode(false);
    } catch {
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
        return;
      }
    } catch {
      /* demo fallback */
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
  };

  const currentImpacts = scenarios?.find((s) => s.scenarioKey === selectedScenario)?.variableImpacts ?? [];

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-6 py-8">
      <section className="rounded-xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-900">
        <strong>V2.3 + V2.4 Real-world Intelligence</strong> — 실뉴스 → AI 분석 → 시나리오 → Economy Preview → GM
        Publish. {demoMode && "(데모·Fixture 모드 — Publish는 GM 세션 + 토큰 필요)"}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <label className="block text-xs text-slate-600">
          GM 세션 ID (API 인증 시 GM 토큰 필요)
          <input
            className="mt-1 w-full max-w-md rounded border border-slate-300 p-2 text-sm"
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
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
        <PublishWorkflowPanel
          sessionId={sessionId}
          previewId={previewId}
          selectedScenario={selectedScenario}
        />
      )}

      {analysis && scenarios && demoMode && (
        <section className="rounded-xl border border-slate-200 bg-slate-50 p-6">
          <h2 className="text-lg font-semibold text-slate-800">GM Preview 완료</h2>
          <p className="mt-2 text-sm text-slate-600">
            데모 모드에서는 Publish가 비활성화됩니다. GM 토큰으로 API 연결 시 V2.4 Publish Workflow가 표시됩니다.
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
