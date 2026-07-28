import { Badge } from "@/components/ui/badge";
import type { Phase, RoundNumber } from "@/types/simulation";

type SimHeaderProps = {
  teamName: string;
  phase: Phase;
  currentRound: RoundNumber;
};

const PHASE_LABELS: Record<Phase, string> = {
  start: "시작",
  round: "의사결정",
  "round-result": "라운드 결과",
  final: "최종 결과",
};

export function SimHeader({ teamName, phase, currentRound }: SimHeaderProps) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <div>
          <p className="text-sm font-medium text-brand-600">
            제조업 전략 경영 시뮬레이션
          </p>
          <h1 className="text-xl font-bold text-slate-900">
            {teamName || "○○정밀(주)"}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {phase !== "start" && phase !== "final" && (
            <Badge variant="info">라운드 {currentRound} / 4</Badge>
          )}
          <Badge>{PHASE_LABELS[phase]}</Badge>
        </div>
      </div>
    </header>
  );
}
