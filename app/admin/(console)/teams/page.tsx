"use client";

import { useCallback, useEffect, useState } from "react";
import { authFetch } from "@/lib/bsp/auth-client";
import { useAdminSession } from "@/lib/bsp/admin-session-context";
import { GmTeamTable } from "@/components/gm/GmTeamTable";
import type { GmDeskDto } from "@/src/bsp/domain/types";

export default function AdminTeamsPage() {
  const { sessionId } = useAdminSession();
  const [desk, setDesk] = useState<GmDeskDto | null>(null);

  const refreshDesk = useCallback(async (id: string) => {
    const res = await authFetch(`/api/v1/gm/sessions/${id}/desk`);
    if (res.ok) setDesk(await res.json());
  }, []);

  useEffect(() => {
    if (sessionId) refreshDesk(sessionId);
  }, [sessionId, refreshDesk]);

  if (!sessionId || !desk) {
    return <p className="text-sm text-slate-500">팀 현황을 불러오는 중…</p>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">팀 현황</h2>
      <GmTeamTable desk={desk} onForceSubmit={() => undefined} onZeroSubmit={() => undefined} />
    </div>
  );
}
