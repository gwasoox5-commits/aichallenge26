"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { authFetch } from "@/lib/bsp/auth-client";
import { applyGmSessionToken } from "@/lib/bsp/token-client";
import { useAdminSession } from "@/lib/bsp/admin-session-context";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import type { GmDeskDto } from "@/src/bsp/domain/types";

export default function AdminOverviewPage() {
  const { sessionId, setSessionId } = useAdminSession();
  const [desk, setDesk] = useState<GmDeskDto | null>(null);
  const [message, setMessage] = useState("");
  const [demoAvailable, setDemoAvailable] = useState(false);

  useEffect(() => {
    fetch("/api/v1/pilot/health")
      .then((r) => r.json())
      .then((d) => setDemoAvailable(!!d.demoBootstrap))
      .catch(() => setDemoAvailable(false));
  }, []);

  const refreshDesk = useCallback(async (id: string) => {
    const res = await authFetch(`/api/v1/gm/sessions/${id}/desk`);
    if (res.ok) {
      setDesk(await res.json());
      return;
    }
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (res.status === 404 || data.error?.includes("Session not found")) {
      setSessionId(null);
      setDesk(null);
      setMessage("저장된 세션이 만료되었습니다. 새 세션을 생성하세요.");
    }
  }, [setSessionId]);

  useEffect(() => {
    if (sessionId) refreshDesk(sessionId);
  }, [sessionId, refreshDesk]);

  const createPilotDemo = async () => {
    const res = await authFetch("/api/v1/pilot/demo-session", { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      if (data.gmAccessToken) applyGmSessionToken(data.gmAccessToken);
      setSessionId(data.sessionId);
      await refreshDesk(data.sessionId);
      setMessage(`데모 세션 생성 · 참가 코드: ${data.joinCode}`);
    } else {
      setMessage(data.error ?? "데모 생성 실패");
    }
  };

  if (!sessionId) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <h2 className="text-xl font-semibold">운영 개요</h2>
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <p className="text-sm text-slate-600">활성 세션이 없습니다. 새 세션을 생성하세요.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/admin/sessions/new"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
            >
              세션 생성 Wizard
            </Link>
            {demoAvailable && (
              <button
                type="button"
                onClick={createPilotDemo}
                className="rounded-lg border border-indigo-300 px-4 py-2 text-sm text-indigo-700 hover:bg-indigo-50"
              >
                데모 세션 (5팀)
              </button>
            )}
          </div>
        </div>
        {message && <p className="text-sm text-indigo-700">{message}</p>}
      </div>
    );
  }

  return (
    <AdminDashboard
      sessionId={sessionId}
      desk={desk}
      onRefresh={() => refreshDesk(sessionId)}
      onMessage={setMessage}
      message={message}
    />
  );
}
