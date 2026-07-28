"use client";

import { useState } from "react";
import { StepSubmitBar } from "./StepSubmitBar";

type Props = {
  loanEarly: number;
  loanMid: number;
  deposit: number;
  loanRepayment: number;
  loading: boolean;
  checklistReady?: boolean;
  onChange: (field: string, value: number) => void;
  onValidate: () => void;
  onSubmit: () => void;
};

export function StepFinanceForm({
  loanEarly,
  loanMid,
  deposit,
  loanRepayment,
  loading,
  checklistReady = true,
  onChange,
  onValidate,
  onSubmit,
}: Props) {
  const [phase, setPhase] = useState<"1A" | "1B">("1A");

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-sky-700">Step 1 — 자금 조달</h2>
        <div className="flex gap-2 text-xs">
          <button
            type="button"
            onClick={() => setPhase("1A")}
            className={`rounded px-2 py-1 ${phase === "1A" ? "bg-sky-700 text-white" : "bg-slate-200 text-slate-600"}`}
          >
            1A 연초
          </button>
          <button
            type="button"
            onClick={() => setPhase("1B")}
            className={`rounded px-2 py-1 ${phase === "1B" ? "bg-sky-700 text-white" : "bg-slate-200 text-slate-600"}`}
          >
            1B 연중
          </button>
        </div>
      </div>

      {phase === "1A" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            연초 차입 (천만원)
            <input
              type="number"
              min={0}
              value={loanEarly}
              onChange={(e) => onChange("loanEarly", +e.target.value)}
              className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            예금 (천만원)
            <input
              type="number"
              min={0}
              value={deposit}
              onChange={(e) => onChange("deposit", +e.target.value)}
              className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2"
            />
          </label>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            연중 차입 (천만원)
            <input
              type="number"
              min={0}
              max={10}
              value={loanMid}
              onChange={(e) => onChange("loanMid", +e.target.value)}
              className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            상환 (만원)
            <input
              type="number"
              min={0}
              value={loanRepayment}
              onChange={(e) => onChange("loanRepayment", +e.target.value)}
              className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2"
            />
          </label>
        </div>
      )}

      <p className="mt-3 text-xs text-slate-500">
        Rule Book D-01: 1A(연초 차입·예금) → 1B(연중 차입·상환). 제출 시 전체 payload가 한 번에 POST됩니다.
      </p>

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
          Submit Step 1
        </button>
      </div>
    </div>
  );
}
