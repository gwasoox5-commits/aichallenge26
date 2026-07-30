"use client";

import { participantVisibleRules, participantValidationView } from "./participant-validation";

export type ValidationRule = {
  ruleId: string;
  passed: boolean;
  message: string;
  errorCode?: string;
};

export function ValidationPanel({
  validation,
  mode = "default",
}: {
  validation: { ok: boolean; rules: ValidationRule[] } | null;
  mode?: "default" | "post-submit";
}) {
  const view = participantValidationView(validation);
  if (!view) return null;

  const passedCount = view.rules.filter((r) => r.passed).length;
  const failedRules = view.rules.filter((r) => !r.passed);

  return (
    <div
      className="rounded-xl border border-slate-200 bg-white p-4"
      role="region"
      aria-label="검증 결과"
      data-testid="validation-panel"
    >
      <h3 className="mb-2 font-medium text-base">
        {mode === "post-submit" ? "제출 후 피드백" : "검증 결과"}{" "}
        {view.ok ? (
          <span className="text-emerald-700" aria-label="통과">
            ✓ 통과
          </span>
        ) : (
          <span className="text-rose-400" aria-label="실패">
            ✗ 실패
          </span>
        )}
      </h3>

      {mode === "post-submit" && view.ok && (
        <p className="mb-3 text-sm text-slate-700">
          {passedCount}개 규칙 통과 · 재무 영향은 아래 항목과 Dashboard·재무제표에서 확인하세요.
        </p>
      )}

      <ul className="space-y-2 text-sm">
        {view.rules.map((r, index) => (
          <li
            key={`${r.ruleId}-${index}-${r.message}`}
            className={`flex items-start gap-2 rounded px-2 py-1 ${
              r.passed ? "text-emerald-700 bg-emerald-50" : "text-rose-300 bg-rose-950/20"
            }`}
          >
            <span aria-hidden="true" className="mt-0.5 shrink-0 font-bold">
              {r.passed ? "✓" : "✗"}
            </span>
            <span>
              <span className="font-mono text-xs text-slate-500">[{r.ruleId}]</span> {r.message}
            </span>
          </li>
        ))}
      </ul>

      {!view.ok && failedRules.length > 0 && (
        <p className="mt-3 text-xs text-amber-800" role="alert">
          ⚠ {failedRules.length}개 항목을 수정한 후 다시 검증·제출하세요.
        </p>
      )}
    </div>
  );
}
