"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { authFetch } from "@/lib/bsp/auth-client";
import type { GmAuditLogEntry } from "@/src/bsp/domain/gm/audit-types";
import { GmAuditLogPanel } from "./GmAuditLogPanel";
import { GmConfirmDialog } from "./GmConfirmDialog";

type SessionRow = {
  id: string;
  name: string;
  joinCode: string;
  sessionPhase: string;
  teamCount: number;
  periodLabel: string;
  stepPhase: string;
  createdAt: string;
  archivedAt?: string;
};

type Props = {
  onSelectSession?: (sessionId: string) => void;
  onMessage?: (msg: string) => void;
  activeSessionId?: string | null;
  onActiveSessionRemoved?: () => void;
  onStaleActiveSession?: () => void;
  onSessionsLoaded?: (sessions: SessionRow[]) => void;
};

export function AdminOperationsPanel({
  onSelectSession,
  onMessage,
  activeSessionId,
  onActiveSessionRemoved,
  onStaleActiveSession,
  onSessionsLoaded,
}: Props) {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [sessionsLoaded, setSessionsLoaded] = useState(false);
  const [auditEntries, setAuditEntries] = useState<GmAuditLogEntry[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [selectedSession, setSelectedSession] = useState<string>("");
  const [auditAction, setAuditAction] = useState("");
  const [economyHistory, setEconomyHistory] = useState<unknown[]>([]);
  const [errors, setErrors] = useState<GmAuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SessionRow | null>(null);
  const [deleteReason, setDeleteReason] = useState("");

  const loadSessions = useCallback(async () => {
    const res = await authFetch("/api/v1/admin/sessions?includeArchived=1");
    if (res.ok) {
      const rows = (await res.json()) as SessionRow[];
      setSessions(rows);
      return rows;
    }
    return null;
  }, []);

  const loadAudit = useCallback(async () => {
    const params = new URLSearchParams({ limit: "30" });
    if (selectedSession) params.set("sessionId", selectedSession);
    if (auditAction) params.set("action", auditAction);
    const res = await authFetch(`/api/v1/admin/audit?${params}`);
    if (res.ok) {
      const data = await res.json();
      setAuditEntries(data.entries ?? []);
      setAuditTotal(data.total ?? 0);
    }
  }, [selectedSession, auditAction]);

  const loadEconomyHistory = useCallback(async (sessionId: string) => {
    if (!sessionId) return;
    const res = await authFetch(`/api/v1/admin/sessions/${sessionId}/economy-history`);
    if (res.ok) setEconomyHistory(await res.json());
  }, []);

  const loadErrors = useCallback(async (sessionId: string) => {
    if (!sessionId) return;
    const res = await authFetch(`/api/v1/admin/sessions/${sessionId}/errors?limit=20`);
    if (res.ok) setErrors(await res.json());
  }, []);

  useEffect(() => {
    loadSessions()
      .then((rows) => {
        if (rows) onSessionsLoaded?.(rows);
      })
      .finally(() => setSessionsLoaded(true));
  }, [loadSessions, onSessionsLoaded]);

  useEffect(() => {
    if (!sessionsLoaded || !activeSessionId) return;
    if (!sessions.some((s) => s.id === activeSessionId)) {
      onStaleActiveSession?.();
      onActiveSessionRemoved?.();
    }
  }, [
    sessionsLoaded,
    sessions,
    activeSessionId,
    onStaleActiveSession,
    onActiveSessionRemoved,
  ]);

  useEffect(() => {
    loadAudit();
  }, [loadAudit]);

  useEffect(() => {
    if (selectedSession) {
      loadEconomyHistory(selectedSession);
      loadErrors(selectedSession);
    }
  }, [selectedSession, loadEconomyHistory, loadErrors]);

  const archiveSession = async (sessionId: string) => {
    setLoading(true);
    const res = await authFetch(`/api/v1/admin/sessions/${sessionId}`, { method: "POST" });
    if (res.ok) {
      onMessage?.("세션 아카이브 완료");
      await loadSessions();
    } else {
      const data = await res.json();
      onMessage?.(data.error ?? "아카이브 실패");
    }
    setLoading(false);
  };

  const endSession = async (sessionId: string) => {
    setLoading(true);
    const res = await authFetch(`/api/v1/admin/sessions/${sessionId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "Admin 종료" }),
    });
    if (res.ok) {
      onMessage?.("세션 종료 완료");
      await loadSessions();
    } else {
      const data = await res.json();
      onMessage?.(data.error ?? "종료 실패");
    }
    setLoading(false);
  };

  const deleteSession = async () => {
    if (!deleteTarget) return;
    setLoading(true);
    const res = await authFetch(`/api/v1/admin/sessions/${deleteTarget.id}/delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reason: deleteReason,
        confirmSessionId: deleteTarget.id,
      }),
    });
    if (res.ok) {
      onMessage?.(`세션 "${deleteTarget.name}" 삭제 완료`);
      if (selectedSession === deleteTarget.id) setSelectedSession("");
      if (activeSessionId === deleteTarget.id) onActiveSessionRemoved?.();
      setDeleteTarget(null);
      setDeleteReason("");
      await loadSessions();
    } else {
      const data = await res.json();
      onMessage?.(data.error ?? "삭제 실패");
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6" data-testid="admin-operations-panel">
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 font-semibold">Admin — 세션 관리</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-slate-600">
              <tr>
                <th className="pb-2 pr-4">이름</th>
                <th className="pb-2 pr-4">상태</th>
                <th className="pb-2 pr-4">팀</th>
                <th className="pb-2 pr-4">반기/Step</th>
                <th className="pb-2">조작</th>
              </tr>
            </thead>
            <tbody>
              {sessions.length === 0 && sessionsLoaded && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-sm text-slate-500">
                    등록된 세션이 없습니다.{" "}
                    <Link href="/admin/sessions/new" className="text-violet-700 hover:underline">
                      새 세션 생성
                    </Link>
                    으로 시작하세요.
                  </td>
                </tr>
              )}
              {sessions.map((s) => (
                <tr key={s.id} className="border-t border-slate-200">
                  <td className="py-2 pr-4">
                    <button
                      type="button"
                      className="text-left text-violet-700 hover:underline"
                      onClick={() => {
                        setSelectedSession(s.id);
                        onSelectSession?.(s.id);
                      }}
                    >
                      {s.name}
                    </button>
                    {s.archivedAt && (
                      <span className="ml-2 text-xs text-amber-700">아카이브</span>
                    )}
                  </td>
                  <td className="py-2 pr-4">{s.sessionPhase}</td>
                  <td className="py-2 pr-4">{s.teamCount}</td>
                  <td className="py-2 pr-4">
                    {s.periodLabel} · {s.stepPhase}
                  </td>
                  <td className="py-2">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={loading || Boolean(s.archivedAt)}
                        onClick={() => archiveSession(s.id)}
                        className="rounded bg-slate-700 px-2 py-1 text-xs hover:bg-slate-600 disabled:opacity-50"
                      >
                        아카이브
                      </button>
                      <button
                        type="button"
                        disabled={loading || s.sessionPhase === "FINISHED"}
                        onClick={() => endSession(s.id)}
                        className="rounded bg-rose-900/60 px-2 py-1 text-xs hover:bg-rose-800 disabled:opacity-50"
                      >
                        종료
                      </button>
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => setDeleteTarget(s)}
                        className="rounded bg-rose-600 px-2 py-1 text-xs text-white hover:bg-rose-500 disabled:opacity-50"
                      >
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 font-semibold">감사 로그 검색</h2>
        <div className="mb-4 flex flex-wrap gap-3">
          <select
            value={selectedSession}
            onChange={(e) => setSelectedSession(e.target.value)}
            className="rounded border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">전체 세션</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            value={auditAction}
            onChange={(e) => setAuditAction(e.target.value)}
            className="rounded border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">전체 액션</option>
            <option value="LOGIN">LOGIN</option>
            <option value="JOIN">JOIN</option>
            <option value="DECISION_SUBMIT">DECISION_SUBMIT</option>
            <option value="VALIDATION_ERROR">VALIDATION_ERROR</option>
            <option value="SETTLEMENT">SETTLEMENT</option>
            <option value="ECONOMY_CHANGE">ECONOMY_CHANGE</option>
            <option value="EVENT_APPLY">EVENT_APPLY</option>
          </select>
          <button
            type="button"
            onClick={loadAudit}
            className="rounded bg-violet-700 px-3 py-2 text-sm hover:bg-violet-600"
          >
            검색
          </button>
          <span className="self-center text-xs text-slate-500">총 {auditTotal}건</span>
        </div>
        <GmAuditLogPanel entries={auditEntries} />
      </div>

      {selectedSession && (
        <>
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="mb-3 font-semibold">경제 변경 이력</h3>
            {economyHistory.length === 0 ? (
              <p className="text-sm text-slate-500">경제 패치 기록 없음</p>
            ) : (
              <ul className="max-h-48 space-y-2 overflow-y-auto text-sm">
                {economyHistory.map((p: unknown, i) => {
                  const patch = p as { sequence: number; source: string; occurredAt: string };
                  return (
                    <li key={i} className="rounded border border-slate-200 px-3 py-2">
                      #{patch.sequence} · {patch.source} ·{" "}
                      {new Date(patch.occurredAt).toLocaleString("ko-KR")}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="mb-3 font-semibold">검증 오류 로그</h3>
            <GmAuditLogPanel entries={errors} />
          </div>
        </>
      )}

      <GmConfirmDialog
        open={!!deleteTarget}
        title={`세션 영구 삭제: ${deleteTarget?.name ?? ""}`}
        description="팀 데이터, 경제 패치, World/Intelligence 기록이 모두 삭제됩니다. 복구할 수 없습니다."
        confirmLabel="영구 삭제"
        confirmTone="danger"
        reason={deleteReason}
        onReasonChange={setDeleteReason}
        onConfirm={deleteSession}
        onCancel={() => {
          setDeleteTarget(null);
          setDeleteReason("");
        }}
        loading={loading}
      />
    </div>
  );
}
