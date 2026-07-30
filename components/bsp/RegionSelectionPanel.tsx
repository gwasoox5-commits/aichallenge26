"use client";

import { useMemo, useState } from "react";
import { REGION_CATALOG, type RegionCode } from "@/src/bsp/domain/regions/region-catalog";

type Props = {
  year: number;
  regionsToSelect: number;
  selectedRegions: string[];
  loading: boolean;
  onSubmit: (regionCodes: RegionCode[]) => void;
};

export function RegionSelectionPanel({
  year,
  regionsToSelect,
  selectedRegions,
  loading,
  onSubmit,
}: Props) {
  const [picks, setPicks] = useState<RegionCode[]>([]);

  const available = useMemo(
    () => REGION_CATALOG.filter((r) => !selectedRegions.includes(r.code)),
    [selectedRegions]
  );

  const toggle = (code: RegionCode) => {
    setPicks((prev) => {
      if (prev.includes(code)) return prev.filter((c) => c !== code);
      if (prev.length >= regionsToSelect) return prev;
      return [...prev, code];
    });
  };

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
      <h2 className="mb-1 text-lg font-semibold text-amber-950">운영 지역 선택</h2>
      <p className="mb-4 text-sm text-amber-900">
        {year}년차 운영 지역 {regionsToSelect}개를 선택하세요. (7개 중 · 이미 선택 {selectedRegions.length}개)
      </p>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {available.map((region) => {
          const checked = picks.includes(region.code);
          const disabled = !checked && picks.length >= regionsToSelect;
          return (
            <label
              key={region.code}
              className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-sm ${
                checked
                  ? "border-amber-400 bg-white text-amber-950"
                  : disabled
                    ? "border-amber-100 bg-amber-100/50 text-amber-700 opacity-60"
                    : "border-amber-200 bg-white text-amber-900 hover:border-amber-300"
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={disabled || loading}
                onChange={() => toggle(region.code)}
                className="mt-1 rounded"
              />
              <span>
                <span className="font-medium">{region.displayName}</span>
                <span className="mt-0.5 block text-xs text-amber-800">
                  원재료 {region.materialUnitPriceManwon}만 · 브랜치 {region.branchSetupFeeManwon}만
                </span>
              </span>
            </label>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-sm text-amber-900">
          {picks.length}/{regionsToSelect}개 선택됨
        </p>
        <button
          type="button"
          disabled={loading || picks.length !== regionsToSelect}
          onClick={() => onSubmit(picks)}
          className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-50"
        >
          운영 지역 확정
        </button>
      </div>
    </div>
  );
}
