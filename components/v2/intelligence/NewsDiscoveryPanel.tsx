"use client";

import type { NewsArticle } from "@/lib/v2/intelligence/types";

interface Props {
  articles: NewsArticle[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  keywords: string;
  onKeywordsChange: (v: string) => void;
  onSearch: () => void;
  loading: boolean;
}

export function NewsDiscoveryPanel({
  articles,
  selectedIds,
  onToggle,
  keywords,
  onKeywordsChange,
  onSearch,
  loading,
}: Props) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-violet-800">1. 실시간 뉴스 검색</h2>
      <p className="mt-1 text-xs text-slate-500">키워드: AI, 반도체, 관세, 환율, ESG, supply chain 등</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <input
          className="min-w-[240px] flex-1 rounded-lg border border-slate-300 p-2 text-sm"
          placeholder="키워드 (쉼표 구분)"
          value={keywords}
          onChange={(e) => onKeywordsChange(e.target.value)}
        />
        <button
          type="button"
          onClick={onSearch}
          disabled={loading}
          className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
        >
          {loading ? "검색 중…" : "뉴스 검색"}
        </button>
      </div>
      <ul className="mt-4 space-y-3">
        {articles.map((a) => (
          <li
            key={a.id}
            className={`rounded-lg border p-4 transition ${
              selectedIds.has(a.id) ? "border-violet-500 bg-violet-50" : "border-slate-200"
            }`}
          >
            <label className="flex cursor-pointer gap-3">
              <input type="checkbox" checked={selectedIds.has(a.id)} onChange={() => onToggle(a.id)} />
              <div className="flex-1">
                <p className="font-medium text-slate-900">{a.title}</p>
                <p className="mt-1 text-sm text-slate-600">{a.summary}</p>
                <p className="mt-2 text-xs text-slate-500">
                  {a.source} · {new Date(a.publishedAt).toLocaleDateString("ko-KR")}
                  {a.url && (
                    <>
                      {" · "}
                      <a href={a.url} target="_blank" rel="noreferrer" className="text-violet-700 hover:underline">
                        원문
                      </a>
                    </>
                  )}
                </p>
              </div>
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
}
