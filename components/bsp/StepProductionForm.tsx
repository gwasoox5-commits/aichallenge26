"use client";

import { GAME_CONSTANTS } from "@/src/bsp/domain/types";
import { StepSubmitBar } from "./StepSubmitBar";

function fmt(n: number) {
  return n.toLocaleString("ko-KR") + " 만원";
}

type Props = {
  productionQty: number;
  machineBigRun: number;
  machineSmallRun: number;
  machineBig: number;
  machineSmall: number;
  productionCapacity: number;
  inventoryTotalUnits: number;
  preview: {
    maxProduction: number;
    maxByMaterial: number;
    maxByMachine: number;
    maxByLabor: number;
    machineOpCostManwon: number;
    materialCostConsumedManwon: number;
    cashAfterManwon: number;
    finishedGoodsQtyAfter: number;
  };
  loading: boolean;
  checklistReady?: boolean;
  onChange: (field: "productionQty" | "machineBigRun" | "machineSmallRun", value: number) => void;
  onValidate: () => void;
  onSubmit: () => void;
};

export function StepProductionForm({
  productionQty,
  machineBigRun,
  machineSmallRun,
  machineBig,
  machineSmall,
  productionCapacity,
  inventoryTotalUnits,
  preview,
  loading,
  checklistReady = true,
  onChange,
  onValidate,
  onSubmit,
}: Props) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="mb-1 text-lg font-semibold">Step 5 — 생산</h2>
      <p className="mb-4 text-sm text-slate-600">
        BOM 4:1 · 기계/인력 Capacity · 기계가동비 {GAME_CONSTANTS.machineBigOperatingCostManwon}/
        {GAME_CONSTANTS.machineSmallOperatingCostManwon}만
      </p>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <label className="text-sm">
          <span className="text-slate-600">생산량 (완제품)</span>
          <input
            type="number"
            min={0}
            value={productionQty}
            onChange={(e) => onChange("productionQty", Number(e.target.value))}
            className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2"
          />
        </label>
        <label className="text-sm">
          <span className="text-slate-600">Big Machine 가동 ({machineBig}대 보유)</span>
          <input
            type="number"
            min={0}
            max={machineBig}
            value={machineBigRun}
            onChange={(e) => onChange("machineBigRun", Number(e.target.value))}
            className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2"
          />
        </label>
        <label className="text-sm">
          <span className="text-slate-600">Small Machine 가동 ({machineSmall}대 보유)</span>
          <input
            type="number"
            min={0}
            max={machineSmall}
            value={machineSmallRun}
            onChange={(e) => onChange("machineSmallRun", Number(e.target.value))}
            className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2"
          />
        </label>
      </div>

      <div className="mb-4 rounded-lg bg-white/80 p-4 text-sm text-slate-700">
        <p>원재료 재고 {inventoryTotalUnits}단위 · 생산인력 Capacity {productionCapacity}</p>
        <p className="mt-1">
          Capacity — 재료 {preview.maxByMaterial} / 기계 {preview.maxByMachine} / 인력 {preview.maxByLabor} → 최대{" "}
          {preview.maxProduction}
        </p>
        <p className="mt-1">
          재료비 {fmt(preview.materialCostConsumedManwon)} · 기계가동비 {fmt(preview.machineOpCostManwon)} · 생산 후
          현금 {fmt(preview.cashAfterManwon)}
        </p>
        <p className="mt-1">완제품 재고 {preview.finishedGoodsQtyAfter}개</p>
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
          disabled={loading}
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium hover:bg-sky-500 disabled:opacity-50"
        >
          생산 제출
        </button>
      </div>
    </div>
  );
}
