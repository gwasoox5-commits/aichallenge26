"use client";

import { useState } from "react";
import type { BspGameStep } from "@/src/bsp/domain/types";
import { getStepEducation } from "@/src/bsp/domain/steps/step-education-content";

type Props = {
  step: BspGameStep;
  onAllCheckedChange?: (allChecked: boolean) => void;
  className?: string;
};

export function StepEducationPanel({ step, onAllCheckedChange, className = "" }: Props) {
  const content = getStepEducation(step);
  const [checked, setChecked] = useState<Record<number, boolean>>({});

  if (!content) return null;

  const allChecked = content.checklist.every((_, i) => checked[i]);

  const toggle = (i: number, value: boolean) => {
    const next = { ...checked, [i]: value };
    setChecked(next);
    const done = content.checklist.every((_, idx) => next[idx]);
    onAllCheckedChange?.(done);
  };

  return (
    <section
      className={`rounded-xl border border-violet-200 bg-violet-50 p-5 ${className}`}
      aria-labelledby={`step-edu-${step}`}
      data-testid={`step-education-${step}`}
    >
      <h2 id={`step-edu-${step}`} className="text-base font-semibold text-violet-800">
        📚 {content.title}
      </h2>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-violet-700">학습 목표</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-800">{content.learningObjective}</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-orange-400">경영적 의미</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-800">{content.businessMeaning}</p>
        </div>
      </div>

      <fieldset className="mt-4">
        <legend className="text-sm font-medium text-slate-700">제출 전 체크리스트</legend>
        <ul className="mt-2 space-y-2">
          {content.checklist.map((item, i) => (
            <li key={item} className="flex items-start gap-2 text-sm">
              <input
                id={`check-${step}-${i}`}
                type="checkbox"
                checked={!!checked[i]}
                onChange={(e) => toggle(i, e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 accent-violet-500 focus-visible:ring-2 focus-visible:ring-violet-400"
                aria-describedby={`check-label-${step}-${i}`}
              />
              <label id={`check-label-${step}-${i}`} htmlFor={`check-${step}-${i}`} className="text-slate-700">
                {item}
              </label>
            </li>
          ))}
        </ul>
        {!allChecked && (
          <p className="mt-2 text-xs text-slate-500" role="status">
            ✓ 모든 항목을 확인한 후 제출할 수 있습니다.
          </p>
        )}
      </fieldset>
    </section>
  );
}

export { getStepEducation };
