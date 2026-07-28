"use client";

import type { WorldForecast } from "@/lib/v3/world/types";

interface Props {
  forecast: WorldForecast | null;
}

export function ForecastPanel({ forecast }: Props) {
  if (!forecast) return null;

  return (
    <section className="rounded-xl border border-violet-200 bg-violet-50/50 p-4">
      <h3 className="font-semibold text-violet-900">AI Forecast (GM 전용)</h3>
      <p className="mt-1 text-xs text-violet-700">학생에게 공개되지 않습니다</p>
      <div className="mt-3 space-y-4">
        {forecast.horizons.map((h) => (
          <div key={h.periodsAhead}>
            <h4 className="text-sm font-medium text-slate-800">{h.label}</h4>
            <ul className="mt-1 space-y-1">
              {h.predictions.slice(0, 4).map((p) => (
                <li key={p.dimension} className="text-xs text-slate-700">
                  {p.summary}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
