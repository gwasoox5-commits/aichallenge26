"use client";

import { useCallback, useEffect, useState } from "react";
import { authFetch } from "@/lib/bsp/auth-client";
import { useAdminSession } from "@/lib/bsp/admin-session-context";
import type { GmAuditLogEntry } from "@/src/bsp/domain/gm/audit-types";

export default function AdminAuditPage() {
  const { sessionId } = useAdminSession();
  const [entries, setEntries] = useState<GmAuditLogEntry[]>([]);

  const load = useCallback(async (id: string) => {
    const res = await authFetch(`/api/v1/gm/sessions/${id}/audit-log`);
    if (res.ok) setEntries(await res.json());
  }, []);

  useEffect(() => {
    if (sessionId) load(sessionId);
  }, [sessionId, load]);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">운영 로그</h2>
      {!sessionId ? (
        <p className="text-sm text-slate-500">세션을 선택하세요.</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-slate-500">기록된 Audit 로그가 없습니다.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left text-slate-500">
                <th className="p-3">시각</th>
                <th className="p-3">행동</th>
                <th className="p-3">담당</th>
                <th className="p-3">상세</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b border-slate-100">
                  <td className="p-3 whitespace-nowrap text-slate-600">{new Date(e.occurredAt).toLocaleString("ko-KR")}</td>
                  <td className="p-3 font-medium">{e.action}</td>
                  <td className="p-3">{e.actorRole}</td>
                  <td className="p-3 text-xs text-slate-500">{JSON.stringify(e.payload ?? {})}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
