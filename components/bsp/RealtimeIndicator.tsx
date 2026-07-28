"use client";

import type { RealtimeConnectionState, RealtimeFlashKind } from "@/lib/bsp/use-realtime";

const FLASH_LABELS: Record<RealtimeFlashKind, string> = {
  step: "Step 변경",
  pause: "세션 상태 변경",
  economy: "경제 환경 변경",
  event: "이벤트 발생",
  submit: "제출 현황 갱신",
  ranking: "순위 갱신",
  dashboard: "대시보드 갱신",
  audit: "감사 로그 갱신",
  game: "게임 종료",
};

const FLASH_COLORS: Record<RealtimeFlashKind, string> = {
  step: "border-sky-500/60 bg-sky-950/40 text-sky-200",
  pause: "border-amber-500/60 bg-amber-950/40 text-amber-800",
  economy: "border-violet-500/60 bg-violet-50 text-violet-800",
  event: "border-rose-500/60 bg-rose-950/40 text-rose-200",
  submit: "border-emerald-500/60 bg-emerald-950/40 text-emerald-200",
  ranking: "border-cyan-500/60 bg-cyan-950/40 text-cyan-200",
  dashboard: "border-indigo-500/60 bg-indigo-950/40 text-indigo-200",
  audit: "border-slate-500/60 bg-slate-50 text-slate-700",
  game: "border-fuchsia-500/60 bg-fuchsia-950/40 text-fuchsia-200",
};

const STATE_DOT: Record<RealtimeConnectionState, string> = {
  connected: "bg-emerald-400",
  connecting: "bg-amber-400 animate-pulse",
  reconnecting: "bg-amber-400 animate-pulse",
  disconnected: "bg-slate-500",
};

type Props = {
  connectionState: RealtimeConnectionState;
  flash: RealtimeFlashKind | null;
  className?: string;
};

export function RealtimeIndicator({ connectionState, flash, className = "" }: Props) {
  return (
    <div className={`flex flex-col gap-2 ${className}`} data-testid="realtime-indicator">
      <div className="flex items-center gap-2 text-xs text-slate-600">
        <span className={`inline-block h-2 w-2 rounded-full ${STATE_DOT[connectionState]}`} />
        <span data-testid="realtime-connection-state">
          {connectionState === "connected"
            ? "실시간 연결됨"
            : connectionState === "reconnecting"
              ? "재연결 중…"
              : connectionState === "connecting"
                ? "연결 중…"
                : "오프라인"}
        </span>
      </div>
      {flash && (
        <div
          className={`animate-pulse rounded-lg border px-3 py-2 text-xs font-medium ${FLASH_COLORS[flash]}`}
          data-testid={`realtime-flash-${flash}`}
        >
          ⚡ {FLASH_LABELS[flash]}
        </div>
      )}
    </div>
  );
}
