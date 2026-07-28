"use client";

import type { WorldTimelineEntry } from "@/lib/v3/world/types";

interface Props {
  timeline: WorldTimelineEntry[];
}

export function WorldTimelinePanel({ timeline }: Props) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="font-semibold text-slate-800">World Timeline</h3>
      {timeline.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">타임라인 기록이 없습니다.</p>
      ) : (
        <ol className="mt-3 space-y-2 border-l-2 border-indigo-200 pl-4">
          {[...timeline].reverse().slice(0, 12).map((t) => (
            <li key={t.id} className="text-sm">
              <time className="text-xs text-slate-400">{t.periodLabel}</time>
              <p className="font-medium text-slate-800">{t.eventLabel}</p>
              {t.detail && <p className="text-xs text-slate-600">{t.detail}</p>}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
