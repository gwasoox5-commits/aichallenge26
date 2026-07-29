"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { setAccessToken } from "@/lib/bsp/auth-client";
import { formatPeriodLabel, formatStepPhaseLabel } from "@/src/bsp/domain/period/display-labels";

const ERROR_MESSAGES: Record<string, string> = {
  ERR_UNAUTHORIZED: "인증이 필요합니다.",
  ERR_SESSION_NOT_FOUND: "참가 코드를 찾을 수 없습니다. 코드를 다시 확인하세요.",
  ERR_SESSION_FINISHED: "이미 종료된 세션입니다. 강사에게 문의하세요.",
  ERR_TEAM_TAKEN: "이미 사용 중인 팀명입니다. 다른 팀을 선택하세요.",
  ERR_INVALID_JOIN_CODE: "올바르지 않은 참가 코드입니다.",
  ERR_TEAM_CAPACITY: "참가 정원이 모두 찼습니다. 운영자에게 문의하세요.",
};

function JoinFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [joinCode, setJoinCode] = useState("");
  const [teamName, setTeamName] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [sessionInfo, setSessionInfo] = useState<{ name: string; periodLabel: string; stepPhase: string } | null>(null);
  const [joined, setJoined] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const code = searchParams.get("code");
    if (code) {
      setJoinCode(code.toUpperCase());
      lookupSession(code.toUpperCase());
    }
  }, [searchParams]);

  const lookupSession = async (code?: string) => {
    const c = (code ?? joinCode).trim();
    if (!c) return;
    setLoading(true);
    setError("");
    const res = await fetch(`/api/v1/join/${encodeURIComponent(c)}`);
    const data = await res.json();
    if (res.ok) {
      setSessionInfo({ name: data.name, periodLabel: data.periodLabel, stepPhase: data.stepPhase });
      setMessage(`세션 확인: ${data.name}`);
    } else {
      setSessionInfo(null);
      setError(mapError(data.code, data.error));
    }
    setLoading(false);
  };

  const joinGame = async () => {
    if (!joinCode.trim() || !teamName.trim()) {
      setError("참가 코드와 팀명을 입력하세요.");
      return;
    }
    setLoading(true);
    setError("");
    const res = await fetch("/api/v1/auth/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ joinCode: joinCode.trim(), teamName: teamName.trim() }),
      credentials: "include",
    });
    const data = await res.json();
    if (res.ok) {
      setAccessToken(data.accessToken);
      setJoined(true);
      setMessage(`${data.teamName}${playerName ? ` (${playerName})` : ""} 입장 완료`);
      setTimeout(() => router.push("/play"), 1200);
    } else {
      setError(mapError(data.code, data.error));
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">학습자 참여</h1>
            <p className="text-sm text-slate-500">참가 코드로 팀에 입장하세요</p>
          </div>
          <Link href="/" className="text-sm text-indigo-600 hover:underline">
            홈
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-6 px-6 py-8">
        {joined ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-8 text-center">
            <p className="text-lg font-semibold text-emerald-800">접속 성공</p>
            <p className="mt-2 text-sm text-emerald-700">{message}</p>
            <p className="mt-4 text-sm text-slate-600">게임 화면으로 이동 중…</p>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <label className="mb-4 block text-sm">
              <span className="text-slate-600">참가 코드</span>
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5))}
                placeholder="예: PILOT"
                maxLength={5}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono uppercase tracking-widest"
              />
            </label>
            <button
              type="button"
              onClick={() => lookupSession()}
              disabled={loading}
              className="mb-4 w-full rounded-lg border border-slate-300 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
            >
              세션 확인
            </button>

            {sessionInfo && (
              <div className="mb-4 rounded-lg bg-indigo-50 p-3 text-sm">
                <p className="font-medium text-indigo-900">{sessionInfo.name}</p>
                <p className="text-indigo-700">
                  {formatPeriodLabel(sessionInfo.periodLabel)} · {formatStepPhaseLabel(sessionInfo.stepPhase)}
                </p>
              </div>
            )}

            <label className="mb-4 block text-sm">
              <span className="text-slate-600">팀명</span>
              <input
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="예: Alpha"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="mb-4 block text-sm">
              <span className="text-slate-600">이름 또는 닉네임 (선택)</span>
              <input
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="홍길동"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <button
              type="button"
              onClick={joinGame}
              disabled={loading || !sessionInfo}
              className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              입장하기
            </button>
          </div>
        )}

        {error && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700" role="alert">{error}</p>}
        {message && !joined && !error && <p className="text-sm text-indigo-700">{message}</p>}
      </main>
    </div>
  );
}

function mapError(code?: string, fallback?: string) {
  if (code && ERROR_MESSAGES[code]) return ERROR_MESSAGES[code];
  if (fallback?.includes("not found")) return "참가 코드를 찾을 수 없습니다.";
  if (fallback?.includes("finished")) return "종료된 세션입니다.";
  return fallback ?? "참가에 실패했습니다. 강사에게 문의하세요.";
}

export function JoinForm() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">로딩…</div>}>
      <JoinFormInner />
    </Suspense>
  );
}
