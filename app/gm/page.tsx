"use client";

import { useCallback, useEffect, useState } from "react";
import { authFetch, setAccessToken } from "@/lib/bsp/auth-client";
import type { GmDeskDto } from "@/src/bsp/domain/types";
import { GmCommandCenter } from "@/components/gm/GmCommandCenter";
import { AdminOperationsPanel } from "@/components/gm/AdminOperationsPanel";

export default function GmPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [desk, setDesk] = useState<GmDeskDto | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionName, setSessionName] = useState("BSP 교육 세션");
  const [adminPassword, setAdminPassword] = useState("");
  const [authRole, setAuthRole] = useState<string | null>(null);
  const [view, setView] = useState<"gm" | "admin">("gm");

  useEffect(() => {
    authFetch("/api/v1/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setAuthRole(d.role))
      .catch(() => undefined);
  }, []);

  const adminLogin = async () => {
    setLoading(true);
    setMessage("");
    const res = await fetch("/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: adminPassword }),
      credentials: "include",
    });
    const data = await res.json();
    if (res.ok) {
      setAccessToken(data.accessToken);
      setAuthRole(data.role);
      setMessage("Admin 로그인 완료");
    } else {
      setMessage(data.error ?? "로그인 실패");
    }
    setLoading(false);
  };

  const refreshDesk = useCallback(async (id: string) => {
    const res = await authFetch(`/api/v1/gm/sessions/${id}/desk`);
    const data = await res.json();
    if (res.ok) setDesk(data);
    else setMessage(data.error ?? "Desk load failed");
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("sessionId");
    if (id) {
      setSessionId(id);
      refreshDesk(id);
    }
  }, [refreshDesk]);

  const createSession = async () => {
    setLoading(true);
    setMessage("");
    const res = await authFetch("/api/v1/gm/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: sessionName }),
    });
    const data = await res.json();
    if (res.ok) {
      setSessionId(data.sessionId);
      if (data.gmAccessToken) setAccessToken(data.gmAccessToken);
      setAuthRole("GM");
      if (data.gmAccessToken) {
        setAccessToken(data.gmAccessToken);
        setAuthRole("GM");
      }
      await refreshDesk(data.sessionId);
      setMessage(`세션 생성 · Join Code: ${data.joinCode}`);
    } else {
      setMessage(data.error ?? "세션 생성 실패");
    }
    setLoading(false);
  };

  const startNextHalf = async () => {
    if (!sessionId) return;
    setLoading(true);
    const res = await authFetch(`/api/v1/gm/sessions/${sessionId}/start-next-half`, { method: "POST" });
    const data = await res.json();
    setMessage(res.ok ? `다음 반기 → ${data.periodLabel}` : data.error);
    if (res.ok) await refreshDesk(sessionId);
    setLoading(false);
  };

  const gameEnd = async () => {
    if (!sessionId) return;
    setLoading(true);
    const res = await authFetch(`/api/v1/gm/sessions/${sessionId}/game-end`, { method: "POST" });
    const data = await res.json();
    setMessage(res.ok ? "게임 종료 · FINISHED" : data.error);
    if (res.ok) await refreshDesk(sessionId);
    setLoading(false);
  };

  const loadDemo = async () => {
    setLoading(true);
    const res = await authFetch("/api/v1/demo/setup", { method: "GET" });
    const data = await res.json();
    if (res.ok) {
      setSessionId(data.sessionId);
      if (data.gmAccessToken) {
        setAccessToken(data.gmAccessToken);
        setAuthRole("GM");
      }
      await refreshDesk(data.sessionId);
      setMessage(`데모 세션 로드 · Join Code: ${data.joinCode}`);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="border-b border-slate-200 bg-white/95 px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">GM Command Center — Sprint 3 P7</h1>
            <p className="text-sm text-slate-600">Production Ready · PostgreSQL · Admin Ops · Audit</p>
          </div>
          <div className="flex gap-4 text-sm">
            <a href="/admin/login" className="text-indigo-700 hover:underline">
              Admin
            </a>
            <a href="/join" className="text-violet-700 hover:underline">
              Join
            </a>
            <a href="/play" className="text-sky-400 hover:underline">
              CEO Play
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        {!authRole && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
            <h2 className="mb-2 font-semibold">강사(Admin) 로그인</h2>
            <p className="mb-4 text-sm text-slate-600">게임 생성 및 GM Desk 사용을 위해 로그인하세요.</p>
            <input
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              placeholder="Admin 비밀번호"
              className="mb-3 w-full max-w-md rounded border border-slate-300 bg-white px-3 py-2"
            />
            <button
              onClick={adminLogin}
              disabled={loading || !adminPassword}
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm hover:bg-amber-500 disabled:opacity-50"
            >
              로그인
            </button>
          </div>
        )}
        {authRole && (
          <div className="flex items-center gap-4 text-sm text-slate-600">
            <span>
              인증: <span className="text-emerald-700">{authRole}</span>
            </span>
            {authRole === "PLATFORM_ADMIN" && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setView("gm")}
                  className={`rounded px-3 py-1 ${view === "gm" ? "bg-violet-700 text-white" : "border border-slate-300"}`}
                >
                  GM Desk
                </button>
                <button
                  type="button"
                  onClick={() => setView("admin")}
                  className={`rounded px-3 py-1 ${view === "admin" ? "bg-violet-700 text-white" : "border border-slate-300"}`}
                  data-testid="admin-tab"
                >
                  Admin
                </button>
              </div>
            )}
          </div>
        )}
        {authRole === "PLATFORM_ADMIN" && view === "admin" ? (
          <AdminOperationsPanel
            onSelectSession={(id) => {
              setSessionId(id);
              setView("gm");
              refreshDesk(id);
            }}
            onMessage={setMessage}
          />
        ) : !sessionId ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="mb-4 font-semibold">게임 세션</h2>
            <label className="mb-4 block text-sm">
              <span className="text-slate-600">세션 이름</span>
              <input
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                className="mt-1 w-full max-w-md rounded border border-slate-300 bg-white px-3 py-2"
              />
            </label>
            <div className="flex gap-2">
              <button
                onClick={createSession}
                disabled={loading || authRole !== "PLATFORM_ADMIN"}
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm hover:bg-violet-500 disabled:opacity-50"
              >
                게임 생성 + Join Code
              </button>
              <button
                onClick={loadDemo}
                disabled={loading || !authRole}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100 disabled:opacity-50"
              >
                데모 세션 불러오기
              </button>
            </div>
          </div>
        ) : (
          desk && (
            <GmCommandCenter
              sessionId={sessionId}
              desk={desk}
              onRefresh={() => refreshDesk(sessionId)}
              onMessage={setMessage}
            />
          )
        )}
        {message && <p className="text-sm text-sky-700">{message}</p>}
      </main>
    </div>
  );
}
