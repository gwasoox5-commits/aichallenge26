"use client";

import { REGION_CATALOG } from "@/src/bsp/domain/regions/region-catalog";

function fmt(n: number) {
  return n.toLocaleString("ko-KR") + " 만원";
}

export type MaterialLineForm = {
  regionCode: string;
  qty: number;
  unitPriceBidManwon: number;
  openBranch: boolean;
};

type Props = {
  lines: MaterialLineForm[];
  selectedRegions: string[];
  purchaseCapacity: number;
  openBranches?: string[];
  openSalesBranches?: string[];
  regionExpansionCap?: number;
  preview: {
    totalUnits: number;
    materialCost: number;
    logisticsCost: number;
    branchFee: number;
    totalCost: number;
    cashAfter: number;
  };
  loading: boolean;
  checklistReady?: boolean;
  onChange: (lines: MaterialLineForm[]) => void;
  onValidate: () => void;
  onSubmit: () => void;
};

export function StepMaterialForm({
  lines,
  selectedRegions,
  purchaseCapacity,
  openBranches = [],
  openSalesBranches = [],
  regionExpansionCap = 3,
  preview,
  loading,
  checklistReady = true,
  onChange,
  onValidate,
  onSubmit,
}: Props) {
  const operatingCount = new Set([...openBranches, ...openSalesBranches]).size;

  const updateLine = (index: number, patch: Partial<MaterialLineForm>) => {
    onChange(lines.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  };

  if (selectedRegions.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="mb-2 text-lg font-semibold">Step 4 — 원재료 구매 (경쟁입찰)</h2>
        <p className="text-sm text-slate-600">먼저 운영 지역을 선택한 뒤 원재료 입찰을 진행할 수 있습니다.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="mb-1 text-lg font-semibold">Step 4 — 원재료 구매 (경쟁입찰)</h2>
      <p className="mb-4 text-sm text-slate-600">
        선택한 {selectedRegions.length}개 운영 지역 · 브랜치 개설 지역에서만 구매 · {regionExpansionCap}개 지역까지 (
        {operatingCount}/{regionExpansionCap} 개설) · 4단위 = 완제품 1개
      </p>

      <div className="space-y-4">
        {lines.map((line, index) => {
          const region = REGION_CATALOG.find((r) => r.code === line.regionCode);
          const hasBranch =
            openBranches.includes(line.regionCode) || openSalesBranches.includes(line.regionCode);
          const atCap = !hasBranch && line.openBranch && operatingCount >= regionExpansionCap;

          return (
            <div key={line.regionCode} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="mb-2 font-medium">{region?.displayName ?? line.regionCode}</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="text-sm">
                  <span className="text-slate-600">입찰 단가 (최소 {region?.materialUnitPriceManwon}만)</span>
                  <input
                    type="number"
                    min={region?.materialUnitPriceManwon ?? 0}
                    value={line.unitPriceBidManwon}
                    onChange={(e) => updateLine(index, { unitPriceBidManwon: Number(e.target.value) })}
                    className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2"
                  />
                </label>
                <label className="text-sm">
                  <span className="text-slate-600">입찰 수량 (지역 한도 {region?.materialLimit})</span>
                  <input
                    type="number"
                    min={0}
                    value={line.qty}
                    onChange={(e) => updateLine(index, { qty: Number(e.target.value) })}
                    className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2"
                  />
                </label>
                <label className="flex items-end gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={line.openBranch}
                    disabled={hasBranch || atCap}
                    onChange={(e) => updateLine(index, { openBranch: e.target.checked })}
                    className="rounded"
                  />
                  <span>
                    {hasBranch
                      ? "이미 브랜치 개설됨"
                      : atCap
                        ? "연도 지역 한도 초과"
                        : `신규 브랜치 (+${region?.branchSetupFeeManwon ?? 0}만, 1회)`}
                  </span>
                </label>
              </div>
              {!hasBranch && line.qty > 0 && !line.openBranch && (
                <p className="mt-2 text-xs text-amber-800">
                  이 지역에 브랜치가 없습니다. 구매하려면 「신규 브랜치 개설」을 선택하세요.
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 space-y-1 rounded-lg bg-slate-100 p-3 text-sm text-slate-700">
        <p>
          총 {preview.totalUnits}단위 / 처리량 한도 {purchaseCapacity}
        </p>
        <p>
          재료비 {fmt(preview.materialCost)} · 물류 {fmt(preview.logisticsCost)} · 브랜치 {fmt(preview.branchFee)}
        </p>
        <p className="font-medium text-sky-700">
          총 비용 {fmt(preview.totalCost)} · 구매 후 현금 {fmt(preview.cashAfter)}
        </p>
      </div>

      <div className="mt-4 flex gap-3">
        <button
          onClick={onValidate}
          disabled={loading}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100 disabled:opacity-50"
        >
          Validation
        </button>
        <button
          onClick={onSubmit}
          disabled={loading || !checklistReady}
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium hover:bg-sky-500 disabled:opacity-50"
        >
          제출
        </button>
      </div>
    </div>
  );
}
