import type { RealtimeConnectionState } from "@/lib/bsp/use-realtime";

export type AdminRealtimeDisplayStatus =
  | "platform_ready"
  | "session_unselected"
  | "gm_connecting"
  | "connected"
  | "reconnecting"
  | "failed";

export function resolveAdminRealtimeStatus(input: {
  authRole: string | null;
  sessionId: string | null;
  gmTokenReady: boolean;
  tokenAttachError: string | null;
  connectionState: RealtimeConnectionState;
}): { status: AdminRealtimeDisplayStatus; label: string; hint?: string } {
  const { authRole, sessionId, gmTokenReady, tokenAttachError, connectionState } = input;

  if (!authRole) {
    return { status: "session_unselected", label: "오프라인" };
  }

  if (!sessionId) {
    return {
      status: "platform_ready",
      label: "플랫폼 로그인 완료",
      hint: "실시간 기능은 세션 생성 후 활성화됩니다.",
    };
  }

  if (tokenAttachError) {
    return {
      status: "failed",
      label: "연결 실패",
      hint: tokenAttachError,
    };
  }

  if (!gmTokenReady) {
    return {
      status: "gm_connecting",
      label: "GM 세션 연결 중",
      hint: "세션 토큰을 준비하고 있습니다…",
    };
  }

  if (connectionState === "connected") {
    return { status: "connected", label: "실시간 연결됨" };
  }

  if (connectionState === "reconnecting") {
    return { status: "reconnecting", label: "재연결 중…" };
  }

  if (connectionState === "connecting") {
    return { status: "gm_connecting", label: "GM 세션 연결 중" };
  }

  if (connectionState === "disconnected") {
    return {
      status: "failed",
      label: "연결 실패",
      hint: "WebSocket 연결에 실패했습니다. 새로고침 후 다시 시도하세요.",
    };
  }

  return { status: "session_unselected", label: "세션 미선택" };
}
