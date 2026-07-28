"use client";

import { Button } from "@/components/ui/button";
import { AllocationSummary } from "@/components/simulation/allocation-summary";
import { FeedbackCard } from "@/components/simulation/feedback-card";
import { KpiDeltaList } from "@/components/simulation/kpi-delta-list";
import type { RoundHistory, RoundNumber } from "@/types/simulation";

type RoundResultScreenProps = {
  historyEntry: RoundHistory;
  currentRound: RoundNumber;
  onNext: () => void;
};

export function RoundResultScreen({
  historyEntry,
  currentRound,
  onNext,
}: RoundResultScreenProps) {
  const isLast = currentRound === 4;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6 pb-12">
      <div className="rounded-2xl bg-gradient-to-r from-brand-600 to-brand-800 px-8 py-6 text-white">
        <p className="text-sm font-medium text-brand-100">
          라운드 {currentRound} 결과
        </p>
        <h2 className="mt-1 text-2xl font-bold">
          {isLast ? "4라운드 완료 — 최종 결과를 확인하세요" : "다음 라운드로 진행합니다"}
        </h2>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AllocationSummary allocation={historyEntry.allocation} />
        <FeedbackCard feedback={historyEntry.feedback} />
      </div>

      <KpiDeltaList
        before={historyEntry.kpiBefore}
        after={historyEntry.kpiAfter}
        delta={historyEntry.delta}
      />

      <div className="flex justify-end">
        <Button size="lg" onClick={onNext}>
          {isLast ? "최종 결과 보기" : `라운드 ${currentRound + 1} 시작`}
        </Button>
      </div>
    </div>
  );
}
