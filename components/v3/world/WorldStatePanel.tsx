"use client";

import type { WorldDimensionKey, WorldDimensionValues } from "@/lib/v3/world/types";
import { WORLD_DIMENSION_LABELS } from "@/lib/v3/world/world-profiles";

interface Props {
  dimensions: WorldDimensionValues;
}

function barColor(value: number) {
  if (value >= 70) return "bg-emerald-500";
  if (value >= 40) return "bg-amber-400";
  return "bg-red-400";
}

export function WorldStatePanel({ dimensions }: Props) {
  const keys = Object.keys(WORLD_DIMENSION_LABELS) as WorldDimensionKey[];

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="font-semibold text-slate-800">World State</h3>
      <p className="mt-1 text-xs text-slate-500">10개 거시 경제 차원 (0–100)</p>
      <ul className="mt-4 space-y-3">
        {keys.map((key) => {
          const value = dimensions[key];
          return (
            <li key={key}>
              <div className="flex justify-between text-sm">
                <span className="text-slate-700">{WORLD_DIMENSION_LABELS[key]}</span>
                <span className="font-medium text-slate-900">{value}</span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-slate-100">
                <div className={`h-2 rounded-full ${barColor(value)}`} style={{ width: `${value}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
