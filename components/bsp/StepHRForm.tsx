"use client";

import { StepSubmitBar } from "./StepSubmitBar";
function fmt(n: number) {
  return n.toLocaleString("ko-KR") + " 만원";
}

type Props = {
  headPurchase: number;
  headProduction: number;
  headSales: number;
  preview: {
    purchaseCapacity: number;
    productionCapacity: number;
    salesCapacity: number;
    payrollForecastHalfManwon: number;
    welfareForecastHalfManwon: number;
  };
  loading: boolean;
  checklistReady?: boolean;
  onChange: (field: "headPurchase" | "headProduction" | "headSales", value: number) => void;
  onValidate: () => void;
  onSubmit: () => void;
};

export function StepHRForm({
  headPurchase,
  headProduction,
  headSales,
  preview,
  loading,
  checklistReady = true,
  onChange,
  onValidate,
  onSubmit,
}: Props) {
  const rows = [
    { key: "headPurchase" as const, label: "구매", capacity: preview.purchaseCapacity, perHead: 30 },
    { key: "headProduction" as const, label: "생산", capacity: preview.productionCapacity, perHead: 10 },
    { key: "headSales" as const, label: "영업", capacity: preview.salesCapacity, perHead: 10 },
  ];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="mb-1 text-lg font-semibold">Step 3 — 인력 채용</h2>
      <p className="mb-4 text-sm text-slate-600">
        부서별 인원은 구매·생산·판매 처리량을 결정합니다. 인건비는 Settlement 시 분개됩니다 (D-12).
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-300 text-left text-slate-600">
              <th className="py-2">부서</th>
              <th>채용(명)</th>
              <th>처리량/인</th>
              <th>Capacity</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-b border-slate-200">
                <td className="py-3">{row.label}</td>
                <td>
                  <input
                    type="number"
                    min={0}
                    value={row.key === "headPurchase" ? headPurchase : row.key === "headProduction" ? headProduction : headSales}
                    onChange={(e) => onChange(row.key, Number(e.target.value))}
                    className="w-20 rounded border border-slate-300 bg-white px-2 py-1"
                  />
                </td>
                <td className="text-slate-600">{row.perHead}/반기</td>
                <td>{row.capacity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
