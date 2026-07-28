"use client";

import type { ValidationRule } from "@/components/bsp/ValidationPanel";
import { useState } from "react";
import type { BspGameStep } from "@/src/bsp/domain/types";
import { getStepEducation } from "@/src/bsp/domain/steps/step-education-content";
import { canSubmitFromGate } from "@/components/bsp/SubmitChecklistGate";

type Props = {
  step: BspGameStep;
  loading: boolean;
  checklistReady?: boolean;
  validation?: { ok: boolean; rules: ValidationRule[] } | null;
  alreadySubmitted?: boolean;
  summary?: { spend?: number; revenue?: number; risks?: string[] };
  onValidate: () => void;
  onSubmit: () => void;
  stepNumber?: number;
};

export function StepSubmitBar({
  step,
  loading,
  checklistReady = true,
  validation = null,
  alreadySubmitted = false,
  summary,
  onValidate,
  onSubmit,
  stepNumber,
}: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const content = getStepEducation(step);
  const label = stepNumber ? `Step ${stepNumber} 제출` : "제출";
  const canSubmit = canSubmitFromGate(validation, checklistReady, alreadySubmitted);

  const handleSubmitClick = () => {
    if (!canSubmit) return;
    setConfirmOpen(true);
  };

  const handleConfirm = () => {
    setConfirmOpen(false);
    onSubmit();
  };

  return (
    <>
      <div className="mt-6 flex flex-wrap gap-3" role="group" aria-label="의사결정 제출">
        <button
          type="button"
          onClick={onValidate}
          disabled={loading || alreadySubmitted}
          aria-label="입력값 검증"
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 disabled:opacity-50"
        >
          검증
        </button>
        <button
          type="button"
          onClick={handleSubmitClick}
          disabled={loading || !canSubmit}
          aria-label={`${label}`}
          title={!canSubmit ? "체크리스트 및 검증을 완료하세요" : undefined}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:opacity-50"
        >
          {label}
        </button>
      </div>

      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="submit-confirm-title"
        >
          <div className="w-full max-w-md rounded-xl border border-slate-300 bg-white p-6 shadow-xl">
            <h3 id="submit-confirm-title" className="text-lg font-semibold text-slate-900">
              최종 제출 확인
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-700">
              {content?.confirmPrompt ?? "의사결정을 제출합니다."}
            </p>
            {summary && (
              <dl className="mt-4 space-y-1 rounded-lg bg-slate-50 p-3 text-sm">
                {summary.spend != null && (
                  <div className="flex justify-between"><dt className="text-slate-600">예상 지출</dt><dd className="font-mono">{summary.spend.toLocaleString()}만원</dd></div>
                )}
                {summary.revenue != null && (
                  <div className="flex justify-between"><dt className="text-slate-600">예상 매출</dt><dd className="font-mono">{summary.revenue.toLocaleString()}만원</dd></div>
                )}
                {summary.risks?.map((r) => (
                  <p key={r} className="text-xs text-amber-700">⚠ {r}</p>
                ))}
              </dl>
            )}
            <p className="mt-3 text-xs font-medium text-rose-600">최종 제출 후 수정할 수 없습니다.</p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setConfirmOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100">
                취소
              </button>
              <button type="button" onClick={handleConfirm} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500">
                제출 확인
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
