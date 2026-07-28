"use client";

import type { LibraryEntry } from "@/lib/v2/intelligence/types";

interface Props {
  entries: LibraryEntry[];
  onFavorite: (id: string, fav: boolean) => void;
  onDuplicate: (id: string) => void;
  onExport: (id: string) => void;
  onImport: (json: string) => void;
}

export function ScenarioLibraryPanel({ entries, onFavorite, onDuplicate, onExport, onImport }: Props) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-violet-800">시나리오 라이브러리</h2>
        <label className="cursor-pointer rounded-lg border border-slate-300 px-3 py-1.5 text-xs hover:bg-slate-50">
          JSON 가져오기
          <input
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              file.text().then(onImport);
            }}
          />
        </label>
      </div>
      <ul className="mt-4 space-y-2">
        {entries.length === 0 && <li className="text-sm text-slate-500">저장된 시나리오 없음</li>}
        {entries.map((e) => (
          <li key={e.libraryId} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 p-3 text-sm">
            <div>
              <p className="font-medium">{e.title}</p>
              <p className="text-xs text-slate-500">{new Date(e.updatedAt).toLocaleString("ko-KR")}</p>
            </div>
            <div className="flex gap-2">
              <button type="button" className="text-xs text-violet-700 hover:underline" onClick={() => onFavorite(e.libraryId, !e.favorite)}>
                {e.favorite ? "★ 즐겨찾기" : "☆ 즐겨찾기"}
              </button>
              <button type="button" className="text-xs text-slate-600 hover:underline" onClick={() => onDuplicate(e.libraryId)}>
                복제
              </button>
              <button type="button" className="text-xs text-slate-600 hover:underline" onClick={() => onExport(e.libraryId)}>
                내보내기
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
