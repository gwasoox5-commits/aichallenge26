"use client";

import { REGION_CATALOG, type RegionCode } from "@/src/bsp/domain/regions/region-catalog";
import { regionExpansionCap } from "@/src/bsp/domain/regions/region-expansion";

type Props = {
  year?: number;
  openBranches?: string[];
  openSalesBranches?: string[];
  compact?: boolean;
};

/** World-ish layout for seven regions (compact grid positions). */
const REGION_LAYOUT: Record<RegionCode, { row: number; col: number }> = {
  NORTH_AMERICA: { row: 1, col: 1 },
  EUROPE: { row: 1, col: 2 },
  ASIA: { row: 1, col: 3 },
  MIDDLE_EAST: { row: 2, col: 2 },
  AFRICA: { row: 2, col: 1 },
  SOUTH_AMERICA: { row: 3, col: 1 },
  OCEANIA: { row: 3, col: 3 },
};

function branchLabel(openBranches: string[], openSalesBranches: string[], code: string) {
  const purchase = openBranches.includes(code);
  const sales = openSalesBranches.includes(code);
  if (purchase && sales) return "구매·판매";
  if (purchase) return "구매";
  if (sales) return "판매";
  return "미개설";
}

export function BranchMapPanel({
  year = 1,
  openBranches = [],
  openSalesBranches = [],
  compact = false,
}: Props) {
  const cap = regionExpansionCap(year);
  const operating = new Set([...openBranches, ...openSalesBranches]);

  return (
    <div className={`rounded-xl border border-slate-200 bg-white ${compact ? "p-3" : "p-4"}`}>
      <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className={`font-semibold text-slate-900 ${compact ? "text-sm" : "text-base"}`}>지역 브랜치 지도</h3>
          <p className="text-xs text-slate-500">
            {year}년차 최대 {cap}개 지역 · 현재 {operating.size}개 개설
          </p>
        </div>
        <div className="flex gap-2 text-[10px] text-slate-500">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> 개설
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-slate-300" /> 미개설
          </span>
        </div>
      </div>

      <div
        className="grid gap-1.5"
        style={{
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gridTemplateRows: "repeat(3, minmax(0, 1fr))",
        }}
      >
        {REGION_CATALOG.map((region) => {
          const pos = REGION_LAYOUT[region.code];
          const active = operating.has(region.code);
          const status = branchLabel(openBranches, openSalesBranches, region.code);
          return (
            <div
              key={region.code}
              style={{ gridRow: pos.row, gridColumn: pos.col }}
              className={`rounded-lg border px-2 py-1.5 text-center ${
                active
                  ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                  : "border-slate-200 bg-slate-50 text-slate-500"
              } ${compact ? "text-[10px]" : "text-xs"}`}
              title={`${region.displayName} · ${status}`}
            >
              <div className={`font-medium ${compact ? "" : "text-sm"}`}>{region.displayName}</div>
              <div className="mt-0.5 opacity-80">{status}</div>
            </div>
          );
        })}
      </div>

      <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
        구매·판매 브랜치 cap은 Step별로 따로 적용됩니다. 구매 브랜치가 있는 지역은 별도 판매 브랜치 없이 판매할 수
        있습니다. 거래 가능 지역은 운영 지역(selectedRegions) {cap}개로 제한됩니다.
      </p>
    </div>
  );
}
