"use client";

import Link from "next/link";
import { RealtimeIndicator } from "@/components/bsp/RealtimeIndicator";
import { NewsUnreadBadge } from "@/components/v2/news/CeoNewsPanel";
import { formatStepTime } from "@/lib/bsp/step-timer";
import { useStepCountdown } from "@/lib/bsp/use-step-countdown";
import type { RealtimeConnectionState, RealtimeFlashKind } from "@/lib/bsp/use-realtime";

type Props = {
  teamName?: string;
  periodLabel?: string;
  stepLabel?: string;
  stepStartedAt?: string;
  stepDurationSec?: number;
  remainingTimeSec?: number;
  connectionState: RealtimeConnectionState;
  flash?: RealtimeFlashKind | null;
  submitted?: boolean;
  unreadNewsCount?: number;
  onNewsClick?: () => void;
  sessionPhase?: string;
};

export function PlayHeader({
  teamName,
  periodLabel,
  stepLabel,
  stepStartedAt,
  stepDurationSec,
  remainingTimeSec,
  connectionState,
  flash,
  submitted,
  unreadNewsCount = 0,
  onNewsClick,
  sessionPhase,
}: Props) {
  const liveRemainingSec = useStepCountdown({
    stepStartedAt,
    stepDurationSec,
    remainingTimeSec,
    enabled: remainingTimeSec != null || Boolean(stepStartedAt),
  });

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">{teamName ?? "CEO Desk"}</h1>
          <p className="text-sm text-slate-600">
            {periodLabel ?? "—"} · {stepLabel ?? "—"}
            {(remainingTimeSec != null || stepStartedAt) && ` · ${formatStepTime(liveRemainingSec)}`}
            {sessionPhase === "PAUSED" && " · ⏸ 일시정지"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {submitted && (
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">제출 완료</span>
          )}
          <NewsUnreadBadge count={unreadNewsCount} onClick={onNewsClick} />
          <RealtimeIndicator connectionState={connectionState} flash={flash ?? null} />
          <Link href="/admin/login?switch=admin" className="text-sm text-indigo-600 hover:text-indigo-800">
            관리자
          </Link>
          <Link href="/join" className="text-sm text-slate-500 hover:text-slate-800">
            나가기
          </Link>
        </div>
      </div>
    </header>
  );
}
