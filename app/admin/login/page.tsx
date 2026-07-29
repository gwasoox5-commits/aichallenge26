"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { clearAccessToken, setAccessToken } from "@/lib/bsp/auth-client";

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const switchFromLearner = searchParams.get("switch") === "admin";
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (switchFromLearner) {
      clearAccessToken();
    }
  }, [switchFromLearner]);

  const login = async () => {
    setLoading(true);
    setMessage("");
    if (switchFromLearner) clearAccessToken();
    const res = await fetch("/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
      credentials: "include",
    });
    const data = await res.json();
    if (res.ok) {
      setAccessToken(data.accessToken);
      router.push("/admin");
    } else {
      setMessage(data.error ?? "로그인에 실패했습니다. 비밀번호를 확인하세요.");
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">관리자·강사 로그인</h1>
        <p className="mt-2 text-sm text-slate-600">세션 생성 및 게임 운영을 위해 로그인하세요.</p>

        {switchFromLearner && (
          <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
            학습자(CEO) 세션에서 관리자 화면으로 전환합니다. 아래에서 관리자 비밀번호로 다시 로그인하세요.
          </p>
        )}

        <label className="mt-6 block text-sm">
          <span className="text-slate-600">관리자 비밀번호</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && login()}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            placeholder="비밀번호 입력"
            autoFocus
          />
        </label>

        {process.env.NODE_ENV === "development" && (
          <p className="mt-2 text-xs text-slate-500">개발 기본 비밀번호: admin10193 (또는 .env.local의 BSP_ADMIN_PASSWORD)</p>
        )}

        <button
          type="button"
          onClick={login}
          disabled={loading || !password}
          className="mt-4 w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {loading ? "로그인 중…" : "로그인"}
        </button>

        {message && <p className="mt-3 text-sm text-rose-600">{message}</p>}

        <div className="mt-6 flex flex-col gap-2 text-center text-xs text-slate-500">
          <Link href="/" className="text-indigo-600 hover:underline">
            ← 시작 화면으로
          </Link>
          <Link href="/join" className="text-emerald-600 hover:underline">
            학습자 참가 (/join)
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-slate-600">로그인 화면 로딩…</div>
      }
    >
      <AdminLoginForm />
    </Suspense>
  );
}
