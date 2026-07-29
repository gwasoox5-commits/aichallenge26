"use client";

import type { HiringDepartment, HiringResignations } from "@/src/bsp/domain/types";

function fmt(n: number) {
  return n.toLocaleString("ko-KR") + " 만원";
}

type Props = {
  periodYear: number;
  currentHeads: { headPurchase: number; headProduction: number; headSales: number };
  headPurchase: number;
  headProduction: number;
  headSales: number;
  resignations: HiringResignations;
  transferFrom: HiringDepartment;
  transferTo: HiringDepartment;
  transferHeadcount: number;
  preview: {
    purchaseCapacity: number;
    productionCapacity: number;
    salesCapacity: number;
    payrollForecastHalfManwon: number;
    welfareForecastHalfManwon: number;
  };
  loading: boolean;
  onChange: (field: "headPurchase" | "headProduction" | "headSales", value: number) => void;
  onResignChange: (field: keyof HiringResignations, value: number) => void;
  onTransferChange: (
    field: "transferFrom" | "transferTo" | "transferHeadcount",
    value: HiringDepartment | number
  ) => void;
  onValidate: () => void;
  onSubmit: () => void;
};

const DEPT_OPTIONS: { value: HiringDepartment; label: string }[] = [
  { value: "PURCHASE", label: "구매" },
  { value: "PRODUCTION", label: "생산" },
  { value: "SALES", label: "영업" },
];

export function StepHRForm({
  periodYear,
  currentHeads,
  headPurchase,
  headProduction,
  headSales,
  resignations,
  transferFrom,
  transferTo,
  transferHeadcount,
  preview,
  loading,
  onChange,
  onResignChange,
  onTransferChange,
  onValidate,
  onSubmit,
}: Props) {
  const restructuringEnabled = periodYear >= 2;

  const rows = [
    {
      key: "headPurchase" as const,
      resignKey: "purchase" as const,
      label: "구매",
      current: currentHeads.headPurchase,
      value: headPurchase,
      capacity: preview.purchaseCapacity,
      perHead: 30,
    },
    {
      key: "headProduction" as const,
      resignKey: "production" as const,
      label: "생산",
      current: currentHeads.headProduction,
      value: headProduction,
      capacity: preview.productionCapacity,
      perHead: 10,
    },
    {
      key: "headSales" as const,
      resignKey: "sales" as const,
      label: "영업",
      current: currentHeads.headSales,
      value: headSales,
      capacity: preview.salesCapacity,
      perHead: 10,
    },
  ];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="mb-1 text-lg font-semibold">Step 3 — 인력 채용</h2>
      <p className="mb-4 text-sm text-slate-600">
        부서별 인원은 구매·생산·판매 처리량을 결정합니다. 인건비는 Settlement 시 분개됩니다 (D-12).
        {!restructuringEnabled && (
          <span className="mt-1 block text-amber-700">
            구조조정(전환·퇴사)은 2년차부터 가능합니다.
          </span>
        )}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-300 text-left text-slate-600">
              <th className="py-2">부서</th>
              <th>현재</th>
              <th>목표 인원</th>
              {restructuringEnabled && <th>퇴사</th>}
              <th>처리량/인</th>
              <th>Capacity</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-b border-slate-200">
                <td className="py-3">{row.label}</td>
                <td className="text-slate-600">{row.current}명</td>
                <td>
                  <input
                    type="number"
                    min={0}
                    value={row.value}
                    onChange={(e) => onChange(row.key, Number(e.target.value))}
                    className="w-20 rounded border border-slate-300 bg-white px-2 py-1"
                  />
                </td>
                {restructuringEnabled && (
                  <td>
                    <input
                      type="number"
                      min={0}
                      max={row.current}
                      value={resignations[row.resignKey] ?? 0}
                      onChange={(e) => onResignChange(row.resignKey, Number(e.target.value))}
                      className="w-20 rounded border border-slate-300 bg-white px-2 py-1"
                    />
                  </td>
                )}
                <td className="text-slate-600">{row.perHead}/반기</td>
                <td>{row.capacity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {restructuringEnabled && (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <h3 className="mb-2 text-sm font-semibold text-slate-800">구조조정 — 부서 전환 (30명 단위)</h3>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <select
              value={transferFrom}
              onChange={(e) => onTransferChange("transferFrom", e.target.value as HiringDepartment)}
              className="rounded border border-slate-300 bg-white px-2 py-1"
            >
              {DEPT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <span className="text-slate-500">→</span>
            <select
              value={transferTo}
              onChange={(e) => onTransferChange("transferTo", e.target.value as HiringDepartment)}
              className="rounded border border-slate-300 bg-white px-2 py-1"
            >
              {DEPT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={0}
              step={30}
              value={transferHeadcount}
              onChange={(e) => onTransferChange("transferHeadcount", Number(e.target.value))}
              className="w-24 rounded border border-slate-300 bg-white px-2 py-1"
            />
            <span className="text-slate-600">명 (30명 단위, 30명 = 1명 전환)</span>
          </div>
        </div>
      )}

      <div className="mt-4 rounded-lg bg-slate-100 p-3 text-sm">
        <p className="text-slate-700">
          반기 인건비(예상): {fmt(preview.payrollForecastHalfManwon)} · 복리후생(예상):{" "}
          {fmt(preview.welfareForecastHalfManwon)}
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
