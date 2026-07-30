"use client";

import { REGION_CATALOG } from "@/src/bsp/domain/regions/region-catalog";
import { StepSubmitBar } from "./StepSubmitBar";

function fmt(n: number) {
  return n.toLocaleString("ko-KR") + " 만원";
}

export type SalesLineForm = {
  regionCode: string;
  unitPriceManwon: number;
  qty: number;
  openBranch: boolean;
};

type Props = {
  lines: SalesLineForm[];
  finishedGoodsQty: number;
  salesCapacity: number;
  openBranches?: string[];
  openSalesBranches?: string[];
  regionExpansionCap?: number;
  preview: {
    totalRevenueManwon: number;
    totalSoldQty: number;
    cogsManwon: number;
    logisticsSalesManwon: number;
    branchFeesManwon: number;
    cashAfterManwon: number;
  };
  loading: boolean;
  checklistReady?: boolean;
  onChange: (lines: SalesLineForm[]) => void;
  onValidate: () => void;
  onSubmit: () => void;
};

export function StepSalesForm({
  lines,
  finishedGoodsQty,
  salesCapacity,
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
  const salesBranchCount = openSalesBranches.length;

  const updateLine = (index: number, patch: Partial<SalesLineForm>) => {
    onChange(lines.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="mb-1 text-lg font-semibold">Step 6 — 판매 (경쟁입찰)</h2>
      <p className="mb-4 text-sm text-slate-600">
        입찰가 ↓ 우선 판매 · GM Step 종료 시 지역별 수요 배분 · 완제품 {finishedGoodsQty} · Capacity {salesCapacity} ·
        운영 지역 {regionExpansionCap}개 내 판매 · 판매 브랜치 {regionExpansionCap}개까지 ({salesBranchCount}/
        {regionExpansionCap} 판매 전용 개설)
      </p>

      <div className="space-y-4">
        {lines.map((line, index) => {
          const region = REGION_CATALOG.find((r) => r.code === line.regionCode);
          const canSell =
            openBranches.includes(line.regionCode) || openSalesBranches.includes(line.regionCode);
          const atCap = !canSell && line.openBranch && salesBranchCount >= regionExpansionCap;

          return (
            <div key={line.regionCode} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="mb-2 font-medium">{region?.displayName ?? line.regionCode}</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="text-sm">
                  <span className="text-slate-600">입찰 판매가 (최대 {region?.maxSalePriceManwon})</span>
                  <input
                    type="number"
                    min={0}
                    max={region?.maxSalePriceManwon}
                    value={line.unitPriceManwon}
                    onChange={(e) => updateLine(index, { unitPriceManwon: Number(e.target.value) })}
                    className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2"
                  />
                </label>
                <label className="text-sm">
                  <span className="text-slate-600">입찰 판매량 (지역 수요 {region?.saleLimit})</span>
                  <input
                    type="number"
                    min={0}
                    value={line.qty}
                    onChange={(e) => {
                      const qty = Number(e.target.value);
                      const patch: Partial<SalesLineForm> = { qty };
                      if (qty > 0 && !canSell && !atCap) {
                        patch.openBranch = true;
                      }
                      updateLine(index, patch);
                    }}
                    className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2"
                  />
                </label>
                <label className="flex items-end gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={line.openBranch}
                    disabled={canSell || atCap}
                    onChange={(e) => updateLine(index, { openBranch: e.target.checked })}
                    className="rounded"
                  />
                  <span>
                    {canSell
                      ? openBranches.includes(line.regionCode)
                        ? "구매 브랜치로 판매 가능"
                        : "이미 판매 브랜치 개설됨"
                      : atCap
                        ? "판매 브랜치 연도 한도 초과"
                        : `신규 판매 브랜치 (+${region?.salesSetupFeeManwon ?? 0}만, 1회)`}
                  </span>
                </label>
              </div>
              {!canSell && line.qty > 0 && !line.openBranch && (
                <p className="mt-2 text-xs text-amber-800">
                  이 지역에서 판매하려면 구매 브랜치가 없을 경우 「신규 판매 브랜치」를 선택하세요.
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="my-4 rounded-lg bg-white/80 p-4 text-sm text-slate-700">
        <p>
          매출 {fmt(preview.totalRevenueManwon)} · 매출원가 {fmt(preview.cogsManwon)} · 물류 {fmt(preview.logisticsSalesManwon)}
        </p>
        <p className="mt-1">
          판매량 {preview.totalSoldQty} · 브랜치비 {fmt(preview.branchFeesManwon)} · 판매 후 현금 {fmt(preview.cashAfterManwon)}
        </p>
      </div>

      <div className="flex gap-2">
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
          판매 제출
        </button>
      </div>
    </div>
  );
}
