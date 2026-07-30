"use client";

import { REGION_CATALOG } from "@/src/bsp/domain/regions/region-catalog";
import { StepSubmitBar } from "./StepSubmitBar";

function fmt(n: number) {
  return n.toLocaleString("ko-KR") + " 만원";
}

export type MaterialFormState = {
  regionCode: string;
  materials: { A: number; B: number; C: number; D: number };
  unitPriceBidManwon: number;
  openBranch: boolean;
};

type Props = {
  form: MaterialFormState;
  purchaseCapacity: number;
  openBranches?: string[];
  openSalesBranches?: string[];
  regionExpansionCap?: number;
  preview: {
    unitPrice: number;
    totalUnits: number;
    materialCost: number;
    logisticsCost: number;
    branchFee: number;
    totalCost: number;
    cashAfter: number;
  };
  loading: boolean;
  checklistReady?: boolean;
  onChange: (next: MaterialFormState) => void;
  onValidate: () => void;
  onSubmit: () => void;
};

export function StepMaterialForm({
  form,
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
  const region = REGION_CATALOG.find((r) => r.code === form.regionCode);
  const hasBranch =
    openBranches.includes(form.regionCode) || openSalesBranches.includes(form.regionCode);
  const operatingCount = new Set([...openBranches, ...openSalesBranches]).size;
  const atCap = !hasBranch && form.openBranch && operatingCount >= regionExpansionCap;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="mb-1 text-lg font-semibold">Step 4 — 원재료 구매 (경쟁입찰)</h2>
      <p className="mb-4 text-sm text-slate-600">
        브랜치 개설 지역에서만 구매 가능 · {regionExpansionCap}개 지역까지 ({operatingCount}/{regionExpansionCap} 개설)
      </p>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <label className="block text-sm">
          <span className="text-slate-600">구매 지역</span>
          <select
            value={form.regionCode}
            onChange={(e) => onChange({ ...form, regionCode: e.target.value })}
            className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2"
          >
            {REGION_CATALOG.map((r) => (
              <option key={r.code} value={r.code}>
                {r.displayName}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-slate-600">입찰 단가 (적용 단가 {preview.unitPrice}만 이상)</span>
          <input
            type="number"
            min={preview.unitPrice}
            value={form.unitPriceBidManwon}
            onChange={(e) => onChange({ ...form, unitPriceBidManwon: Number(e.target.value) })}
            className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2"
          />
        </label>
        <label className="flex items-end gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.openBranch}
            disabled={hasBranch || atCap}
            onChange={(e) => onChange({ ...form, openBranch: e.target.checked })}
            className="rounded"
          />
          <span>
            {hasBranch
              ? "이미 브랜치 개설됨"
              : atCap
                ? "연도 지역 한도 초과"
                : `신규 브랜치 개설 (+${region?.branchSetupFeeManwon ?? 0}만, 1회)`}
          </span>
        </label>
      </div>

      {!hasBranch && preview.totalUnits > 0 && !form.openBranch && (
        <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          이 지역에 브랜치가 없습니다. 원재료 구매를 하려면 「신규 브랜치 개설」을 선택하세요.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(["A", "B", "C", "D"] as const).map((mat) => (
          <label key={mat} className="text-sm">
            <span className="text-slate-600">재료 {mat}</span>
            <input
              type="number"
              min={0}
              value={form.materials[mat]}
              onChange={(e) =>
                onChange({
                  ...form,
                  materials: { ...form.materials, [mat]: Number(e.target.value) },
                })
              }
              className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1"
            />
          </label>
        ))}
      </div>

      <div className="mt-4 space-y-1 rounded-lg bg-slate-100 p-3 text-sm text-slate-700">
        <p>
          입찰 단가 {form.unitPriceBidManwon}만 · 총 {preview.totalUnits}단위 / 처리량 한도 {purchaseCapacity}
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
          disabled={loading}
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium hover:bg-sky-500 disabled:opacity-50"
        >
          제출
        </button>
      </div>
    </div>
  );
}
