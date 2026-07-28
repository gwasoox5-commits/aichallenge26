"use client";

import type { RealtimeFlashKind } from "@/lib/bsp/use-realtime";
import {
  resolveAdminRealtimeStatus,
  type AdminRealtimeDisplayStatus,
} from "@/lib/bsp/admin-realtime-status";

const STATUS_DOT: Record<AdminRealtimeDisplayStatus, string> = {
  platform_ready: "bg-sky-400",
  session_unselected: "bg-slate-400",
  gm_connecting: "bg-amber-400 animate-pulse",
  connected: "bg-emerald-400",
  reconnecting: "bg-amber-400 animate-pulse",
  failed: "bg-rose-500",
};

type Props = {
  authRole: string | null;
  sessionId: string | null;
  gmTokenReady: boolean;
  tokenAttachError: string | null;
  connectionState: import("@/lib/bsp/use-realtime").RealtimeConnectionState;
  flash?: RealtimeFlashKind | null;
};

export function AdminRealtimeIndicator({
  authRole,
  sessionId,
  gmTokenReady,
  tokenAttachError,
  connectionState,
  flash,
}: Props) {
  const { status, label, hint } = resolveAdminRealtimeStatus({
    authRole,
    sessionId,
    gmTokenReady,
    tokenAttachError,
    connectionState,
  });

  return (
    <div className="flex flex-col gap-1" data-testid="admin-realtime-indicator">
      <div className="flex items-center gap-2 text-xs text-slate-600">
        <span className={`inline-block h-2 w-2 rounded-full ${STATUS_DOT[status]}`} />
        <span data-testid="admin-realtime-label">{label}</span>
      </div>
      {hint && (
        <p className="max-w-xs text-[11px] leading-snug text-slate-500" data-testid="admin-realtime-hint">
          {hint}
        </p>
      )}
      {flash && status === "connected" && (
        <p className="text-[11px] text-indigo-600">⚡ 실시간 업데이트 수신</p>
      )}
    </div>
  );
}
