"use client";

import { StepSubmitBar } from "./StepSubmitBar";
type Preview = {
  landCost: number;
  machineCost: number;
  total: number;
  capacity: number;
  maxMaterials: number;
};

function fmt(n: number) {
  return n.toLocaleString("ko-KR") + " 만원";
}

type Props = {
  landPlots: number;
  machineBig: number;
  machineSmall: number;
  preview: Preview;
  loading: boolean;
  checklistReady?: boolean;
  onChange: (field: string, value: number) => void;
  onValidate: () => void;
  onSubmit: () => void;
};

export function StepFacilityForm({
  landPlots,
  machineBig,
  machineSmall,
  preview,
  loading,
  checklistReady = true,
  onChange,
  onValidate,
  onSubmit,
}: Props) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="mb-4 text-lg font-semibold text-amber-800">Step 2 — 설비 투자</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block text-sm">
          필지 (신규)
          <input
            type="number"
            min={0}
            max={4}
            value={landPlots}
            onChange={(e) => onChange("landPlots", +e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          Big 기계
          <input
            type="number"
            min={0}
            value={machineBig}
            onChange={(e) => onChange("machineBig", +e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          Small 기계
          <input
            type="number"
            min={0}
            value={machineSmall}
            onChange={(e) => onChange("machineSmall", +e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2"
          />
        </label>
      </div>
      <div className="mt-4 rounded-lg bg-white p-4 text-sm text-slate-700">
        <p className="font-medium text-slate-800">Capacity Preview</p>
        <p>CAPEX: {fmt(preview.total)} (토지 {fmt(preview.landCost)} + 설비 {fmt(preview.machineCost)})</p>
        <p>생산능력: {preview.capacity} · Max 원재료: {preview.maxMaterials}</p>
      </div>
      <div className="mt-6 flex gap-3">
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
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500 disabled:opacity-50"
        >
          Submit Step 2
        </button>
      </div>
    </div>
  );
}
