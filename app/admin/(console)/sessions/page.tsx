"use client";

import { useState } from "react";
import Link from "next/link";
import { AdminOperationsPanel } from "@/components/gm/AdminOperationsPanel";
import { useAdminSession } from "@/lib/bsp/admin-session-context";

export default function AdminSessionsPage() {
  const { sessionId, setSessionId } = useAdminSession();
  const [message, setMessage] = useState("");
  const [staleWarning, setStaleWarning] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">세션 관리</h2>
          <p className="mt-1 text-sm text-slate-600">
            종료·아카이브·영구 삭제 후{" "}
            <Link href="/admin/sessions/new" className="text-indigo-600 hover:underline">
              새 세션 생성
            </Link>
            으로 다시 시작하세요.
          </p>
        </div>
        {sessionId && (
          <p className="rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600">
            현재 선택 세션: <span className="font-mono text-slate-800">{sessionId}</span>
          </p>
        )}
      </div>

      {staleWarning && (
        <p className="rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-800">
          저장된 세션이 서버에 없습니다.{" "}
          <Link href="/admin/sessions/new" className="font-medium underline hover:text-amber-900">
            새 세션을 생성
          </Link>
          하세요.
        </p>
      )}

      {message && (
        <p className="rounded-lg bg-indigo-50 px-4 py-2 text-sm text-indigo-800">{message}</p>
      )}

      <AdminOperationsPanel
        activeSessionId={sessionId}
        onSelectSession={setSessionId}
        onActiveSessionRemoved={() => setSessionId(null)}
        onStaleActiveSession={() => setStaleWarning(true)}
        onMessage={setMessage}
      />
    </div>
  );
}
