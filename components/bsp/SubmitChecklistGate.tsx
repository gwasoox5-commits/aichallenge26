"use client";

import type { ValidationRule } from "@/components/bsp/ValidationPanel";

export type ChecklistItem = {
  id: string;
  label: string;
  status: "done" | "warn" | "block";
  message?: string;
  anchor?: string;
};

type Props = {
  validation: { ok: boolean; rules: ValidationRule[] } | null;
  checklistReady: boolean;
  alreadySubmitted?: boolean;
  /** When false, skip the manual education checklist blocker (e.g. GM-only settlement step). */
  requireManualChecklist?: boolean;
  onScrollTo?: (anchor: string) => void;
};

export function SubmitChecklistGate({
  validation,
  checklistReady,
  alreadySubmitted,
  requireManualChecklist = true,
  onScrollTo,
}: Props) {
  const items: ChecklistItem[] = [];

  if (alreadySubmitted) {
    items.push({ id: "submitted", label: "이미 제출됨", status: "block", message: "중복 제출할 수 없습니다." });
  }

  if (!checklistReady && requireManualChecklist) {
    items.push({ id: "manual", label: "체크리스트 확인", status: "block", message: "제출 전 체크리스트를 모두 확인하세요." });
  }

  if (validation) {
    for (const rule of validation.rules) {
      items.push({
        id: rule.ruleId,
        label: rule.message,
        status: rule.passed ? "done" : rule.errorCode?.startsWith("WARN") ? "warn" : "block",
        message: rule.passed ? undefined : rule.message,
        anchor: rule.ruleId,
      });
    }
  }

  const blockers = items.filter((i) => i.status === "block");
  const warnings = items.filter((i) => i.status === "warn");
  const done = items.filter((i) => i.status === "done");

  if (items.length === 0) return null;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4" data-testid="submit-checklist-gate" aria-label="제출 체크리스트">
      <h3 className="mb-3 text-sm font-semibold text-slate-800">제출 전 확인</h3>
      <ul className="space-y-2 text-sm">
        {done.map((item) => (
          <li key={item.id} className="flex items-start gap-2 text-emerald-700">
            <span aria-hidden="true">✓</span>
            <span>{item.label}</span>
          </li>
        ))}
        {warnings.map((item) => (
          <li key={item.id} className="flex items-start gap-2 text-amber-700">
            <span aria-hidden="true">!</span>
            <span>{item.message ?? item.label}</span>
          </li>
        ))}
        {blockers.map((item) => (
          <li key={item.id} className="flex items-start gap-2 text-rose-600">
            <span aria-hidden="true">✗</span>
            <span>
              {item.message ?? item.label}
              {item.anchor && onScrollTo && (
                <button type="button" onClick={() => onScrollTo(item.anchor!)} className="ml-2 text-xs underline">
                  수정하기
                </button>
              )}
            </span>
          </li>
        ))}
      </ul>
      {blockers.length > 0 && (
        <p className="mt-3 text-xs text-rose-600" role="alert">
          {blockers.length}개 항목을 해결해야 제출할 수 있습니다.
        </p>
      )}
    </section>
  );
}

export function canSubmitFromGate(
  validation: { ok: boolean; rules: ValidationRule[] } | null,
  checklistReady: boolean,
  alreadySubmitted?: boolean
): boolean {
  if (alreadySubmitted) return false;
  if (!checklistReady) return false;
  if (!validation) return false;
  const hasBlockers = validation.rules.some((r) => !r.passed && !r.errorCode?.startsWith("WARN"));
  return validation.ok || !hasBlockers;
}
