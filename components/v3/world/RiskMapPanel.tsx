"use client";

import type { RegionalState, IndustryState } from "@/lib/v3/world/types";

interface Props {
  regions: RegionalState[];
  industries: IndustryState[];
}

export function RiskMapPanel({ regions, industries }: Props) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="font-semibold text-slate-800">Risk Map</h3>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <div>
          <h4 className="text-xs font-medium uppercase text-slate-500">지역</h4>
          <ul className="mt-2 space-y-2">
            {regions.map((r) => (
              <li key={r.regionId} className="rounded border border-slate-100 p-2 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">{r.label}</span>
                  <span className={r.riskLevel >= 60 ? "text-red-600" : "text-emerald-600"}>
                    Risk {r.riskLevel}
                  </span>
                </div>
                <p className="text-xs text-slate-500">Growth {r.growth} · Trade {r.tradeOpenness}</p>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-xs font-medium uppercase text-slate-500">산업</h4>
          <ul className="mt-2 space-y-2">
            {industries.map((i) => (
              <li key={i.industryId} className="rounded border border-slate-100 p-2 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">{i.label}</span>
                  <span className="text-slate-500">×{i.impactMultiplier.toFixed(2)}</span>
                </div>
                <p className="text-xs text-slate-500">
                  Demand {i.demandIndex} · Cost {i.costPressure}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
