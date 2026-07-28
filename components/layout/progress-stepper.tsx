import { cn } from "@/lib/utils/cn";
import type { Phase, RoundNumber } from "@/types/simulation";

type ProgressStepperProps = {
  currentRound: RoundNumber;
  phase: Phase;
};

const STEPS = [
  { round: 1, label: "안정기" },
  { round: 2, label: "충격기" },
  { round: 3, label: "전환기" },
  { round: 4, label: "재편기" },
] as const;

export function ProgressStepper({ currentRound, phase }: ProgressStepperProps) {
  if (phase === "start" || phase === "final") return null;

  return (
    <nav className="mx-auto max-w-7xl px-6 py-4">
      <ol className="flex items-center gap-2">
        {STEPS.map((step, i) => {
          const isPast = step.round < currentRound;
          const isCurrent =
            step.round === currentRound &&
            (phase === "round" || phase === "round-result");
          const isDone = isPast || (step.round === currentRound && phase === "round-result" && currentRound === 4);

          return (
            <li key={step.round} className="flex flex-1 items-center gap-2">
              <div className="flex flex-1 flex-col items-center gap-1">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold",
                    isCurrent && "bg-brand-600 text-white ring-4 ring-brand-100",
                    isPast && "bg-brand-100 text-brand-700",
                    !isCurrent && !isPast && !isDone && "bg-slate-100 text-slate-600",
                    isDone && !isCurrent && "bg-emerald-100 text-emerald-700",
                  )}
                >
                  {step.round}
                </div>
                <span
                  className={cn(
                    "text-xs font-medium",
                    isCurrent ? "text-brand-700" : "text-slate-500",
                  )}
                >
                  {step.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={cn(
                    "mb-5 h-0.5 flex-1",
                    isPast ? "bg-brand-300" : "bg-slate-200",
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
