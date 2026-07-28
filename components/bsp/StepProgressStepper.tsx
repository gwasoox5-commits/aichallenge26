"use client";

import { ALL_GAME_STEPS, STEP_TO_PHASE, type BspGameStep, type BspStepPhase } from "@/src/bsp/domain/types";

const STEP_LABELS: Record<BspGameStep, string> = {
  LOAN: "자금 조달",
  FACILITY: "설비 투자",
  HIRING: "인력 채용",
  MATERIAL: "원재료",
  PRODUCTION: "생산",
  SALES: "판매",
  SETTLEMENT: "결산",
};

export function StepProgressStepper({
  stepPhase,
  completedSteps,
}: {
  stepPhase: BspStepPhase;
  completedSteps: BspGameStep[];
}) {
  return (
    <nav className="mb-6 overflow-x-auto">
      <ol className="flex min-w-max gap-2">
        {ALL_GAME_STEPS.map((step, i) => {
          const phase = STEP_TO_PHASE[step];
          const done = completedSteps.includes(step);
          const current = phase === stepPhase;
          return (
            <li
              key={step}
              className={`rounded-lg px-3 py-2 text-xs font-medium ${
                done
                  ? "bg-emerald-900/50 text-emerald-700 ring-1 ring-emerald-700"
                  : current
                    ? "bg-sky-900/60 text-sky-200 ring-1 ring-sky-600"
                    : "bg-slate-200 text-slate-500"
              }`}
            >
              <span className="mr-1 opacity-70">{i + 1}.</span>
              {STEP_LABELS[step]}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
