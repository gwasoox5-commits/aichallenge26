"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { authFetch, clearAccessToken, getAccessToken } from "@/lib/bsp/auth-client";
import { useAdminSession } from "@/lib/bsp/admin-session-context";
import { applyGmSessionToken, canConnectRealtime } from "@/lib/bsp/token-client";
import type { GmDeskDto } from "@/src/bsp/domain/types";
import { AdminRealtimeIndicator } from "@/components/admin/AdminRealtimeIndicator";
import { useRealtime } from "@/lib/bsp/use-realtime";

const NAV = [
  { href: "/admin", label: "운영 개요", exact: true },
  { href: "/admin/sessions/new", label: "세션 생성" },
  { href: "/admin/teams", label: "팀 현황" },
  { href: "/admin/accounting-audit", label: "회계 감사" },
  { href: "/admin/control", label: "게임 진행" },
  { href: "/event-studio", label: "이벤트 스튜디오", external: true },
  { href: "/event-studio/intelligence", label: "뉴스 Intelligence", external: true },
  { href: "/world", label: "World Simulation", external: true },
  { href: "/admin/debrief", label: "디브리프" },
  { href: "/admin/audit", label: "운영 로그" },
  { href: "/admin/pilot-check", label: "시스템 점검" },
  { href: "/admin/integrations", label: "API 연동" },
];

function AdminNavLinks({ pathname }: { pathname: string }) {
  return (
    <>
      {NAV.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`block rounded-lg px-3 py-2 text-sm ${
              active ? "bg-indigo-50 font-medium text-indigo-700" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { sessionId, setSessionId } = useAdminSession();
  const [authRole, setAuthRole] = useState<string | null>(null);
  const [desk, setDesk] = useState<GmDeskDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [gmTokenReady, setGmTokenReady] = useState(false);
  const [tokenAttachError, setTokenAttachError] = useState<string | null>(null);

  const refreshDesk = useCallback(async (id: string) => {
    const res = await authFetch(`/api/v1/gm/sessions/${id}/desk`);
    if (res.ok) {
      setDesk(await res.json());
      return true;
    }
    const data = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
    if (res.status === 404 || data.error?.includes("Session not found")) {
      setSessionId(null);
      setDesk(null);
    }
    return false;
  }, [setSessionId]);

  useEffect(() => {
    authFetch("/api/v1/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d || (d.role !== "GM" && d.role !== "PLATFORM_ADMIN")) {
          if (d?.role === "CEO") {
            router.replace("/admin/login?switch=admin");
            return;
          }
          router.replace("/admin/login");
          return;
        }
        setAuthRole(d.role);
        if (d.sessionId && !sessionId) setSessionId(d.sessionId);
      })
      .finally(() => setLoading(false));
  }, [router, sessionId, setSessionId]);

  useEffect(() => {
    if (sessionId) refreshDesk(sessionId);
  }, [sessionId, refreshDesk]);

  /** PLATFORM_ADMIN → GM session token (create, demo, refresh restore) */
  useEffect(() => {
    if (loading || !sessionId || !authRole) {
      setGmTokenReady(false);
      return;
    }

    const token = getAccessToken();
    if (canConnectRealtime(token, sessionId)) {
      setGmTokenReady(true);
      setTokenAttachError(null);
      return;
    }

    let cancelled = false;
    setGmTokenReady(false);
    setTokenAttachError(null);

    authFetch(`/api/v1/gm/sessions/${sessionId}/gm-token`, { method: "POST" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          if (res.status === 404 || data.error?.includes("Session not found")) {
            setSessionId(null);
            throw new Error("저장된 세션이 만료되었습니다. 새 세션을 생성하세요.");
          }
          throw new Error(data.error ?? "GM 세션 토큰 발급 실패");
        }
        if (cancelled) return;
        applyGmSessionToken(data.gmAccessToken);
        setGmTokenReady(true);
        setTokenAttachError(null);
      })
      .catch((e: Error) => {
        if (cancelled) return;
        setGmTokenReady(false);
        setTokenAttachError(e.message);
      });

    return () => {
      cancelled = true;
    };
  }, [loading, sessionId, authRole]);

  const { connectionState, flash } = useRealtime({
    sessionId,
    enabled: gmTokenReady && !!sessionId,
    onSync: () => sessionId && refreshDesk(sessionId),
  });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600">
        관리자 화면 로딩 중…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="flex w-48 shrink-0 flex-col border-r border-slate-200 bg-white sm:w-56">
        <div className="border-b border-slate-200 p-4">
          <Link href="/" className="text-sm font-semibold text-slate-800">
            BSP Admin
          </Link>
          <p className="mt-1 text-xs text-slate-500">Release 1.0 · 운영 콘솔</p>
        </div>
        <nav className="space-y-0.5 overflow-y-auto p-2">
          <AdminNavLinks pathname={pathname} />
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-slate-200 bg-white px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-lg font-semibold text-slate-900">
                {desk?.name ?? "세션 미선택"}
              </h1>
              <p className="text-xs text-slate-500">
                {desk
                  ? `${desk.periodLabel} · ${desk.stepPhase?.replace("STEP", "Step ").replace("_", " ")} · ${desk.totalTeamCount}팀`
                  : "세션을 생성하거나 선택하세요"}
                {desk?.sessionPhase === "PAUSED" && " · ⏸ Pause"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <AdminRealtimeIndicator
                authRole={authRole}
                sessionId={sessionId}
                gmTokenReady={gmTokenReady}
                tokenAttachError={tokenAttachError}
                connectionState={connectionState}
                flash={flash}
              />
              {sessionId && (
                <select
                  className="rounded border border-slate-300 px-2 py-1 text-xs"
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value || null)}
                  aria-label="활성 세션"
                >
                  <option value={sessionId}>{desk?.name ?? sessionId.slice(0, 8)}</option>
                </select>
              )}
              <button
                type="button"
                onClick={() => {
                  clearAccessToken();
                  router.push("/admin/login");
                }}
                className="text-slate-500 hover:text-slate-800"
              >
                로그아웃
              </button>
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
