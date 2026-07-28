"use client";

import { useCallback, useEffect, useState } from "react";
import { authFetch } from "@/lib/bsp/auth-client";
import { useAdminSession } from "@/lib/bsp/admin-session-context";
import { GmCommandCenter } from "@/components/gm/GmCommandCenter";
import type { GmDeskDto } from "@/src/bsp/domain/types";

export default function AdminControlPage() {
  const { sessionId } = useAdminSession();
  const [desk, setDesk] = useState<GmDeskDto | null>(null);
  const [message, setMessage] = useState("");

  const refreshDesk = useCallback(async (id: string) => {
    const res = await authFetch(`/api/v1/gm/sessions/${id}/desk`);
    if (res.ok) setDesk(await res.json());
  }, []);

  useEffect(() => {
    if (sessionId) refreshDesk(sessionId);
  }, [sessionId, refreshDesk]);

  if (!sessionId) {
    return <p className="text-sm text-slate-500">세션을 먼저 생성하거나 선택하세요.</p>;
  }

  if (!desk) {
    return <p className="text-sm text-slate-500">게임 진행 정보를 불러오는 중…</p>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">게임 진행</h2>
      <GmCommandCenter sessionId={sessionId} desk={desk} onRefresh={() => refreshDesk(sessionId)} onMessage={setMessage} />
      {message && <p className="text-sm text-indigo-700">{message}</p>}
    </div>
  );
}
