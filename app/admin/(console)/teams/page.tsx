"use client";

import { useCallback, useEffect, useState } from "react";
import { authFetch } from "@/lib/bsp/auth-client";
import { useAdminSession } from "@/lib/bsp/admin-session-context";
import { GmTeamTable } from "@/components/gm/GmTeamTable";
import type { GmDeskDto } from "@/src/bsp/domain/types";

export default function AdminTeamsPage() {
  const { sessionId } = useAdminSession();
  const [desk, setDesk] = useState<GmDeskDto | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const refreshDesk = useCallback(async (id: string) => {
    const res = await authFetch(`/api/v1/gm/sessions/${id}/desk`);
    if (res.ok) setDesk(await res.json());
  }, []);

  useEffect(() => {
    if (sessionId) refreshDesk(sessionId);
  }, [sessionId, refreshDesk]);

  const deleteTeam = useCallback(
    async (companyId: string, teamName: string) => {
      if (!sessionId) return;
      if (!window.confirm(`${teamName} 팀을 삭제할까요?`)) return;
      setNotice("");
      setError("");

      const send = (force: boolean) =>
        authFetch(`/api/v1/gm/sessions/${sessionId}/companies/${companyId}${force ? "?force=1" : ""}`, {
          method: "DELETE",
        });

      let res = await send(false);
      let body = await res.json().catch(() => ({}));

      if (!res.ok && body.code === "ERR_TEAM_HAS_SUBMISSIONS") {
        if (!window.confirm(`${body.error}\n\n제출 기록까지 함께 삭제하려면 확인을 누르세요.`)) {
          setError(body.error);
          return;
        }
        res = await send(true);
        body = await res.json().catch(() => ({}));
      }

      if (!res.ok) {
        setError(body.error ?? "팀 삭제에 실패했습니다.");
        return;
      }
      setNotice(`${teamName} 팀을 삭제했습니다.`);
      await refreshDesk(sessionId);
    },
    [sessionId, refreshDesk]
  );

  if (!sessionId || !desk) {
    return <p className="text-sm text-slate-500">팀 현황을 불러오는 중…</p>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">팀 현황</h2>
      {notice && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {notice}
        </p>
      )}
      {error && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{error}</p>
      )}
      <GmTeamTable
        desk={desk}
        onForceSubmit={() => undefined}
        onZeroSubmit={() => undefined}
        onDeleteTeam={(companyId, teamName) => void deleteTeam(companyId, teamName)}
      />
    </div>
  );
}
