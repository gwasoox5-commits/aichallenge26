"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { isPilotMode, PILOT_DEFAULTS } from "@/lib/bsp/pilot-config";
import { RealtimeIndicator } from "@/components/bsp/RealtimeIndicator";
import type { RealtimeConnectionState } from "@/lib/bsp/use-realtime";

export default function PilotLandingPage() {
  const [demoAvailable, setDemoAvailable] = useState(false);
  const [connectionState] = useState<RealtimeConnectionState>("connected");

  useEffect(() => {
    fetch("/api/v1/pilot/health")
      .then((r) => r.json())
      .then((d) => setDemoAvailable(!!d.demoBootstrap))
      .catch(() => setDemoAvailable(false));
  }, []);

  const pilotMode = isPilotMode();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white text-slate-900">
      <header className="border-b border-slate-200 bg-white/90 px-6 py-5">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-indigo-600">Release 1.0</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">Business Simulation Platform</h1>
            <p className="text-slate-600">AI 기반 경영 시뮬레이션 · Production Ready</p>
          </div>
          <RealtimeIndicator connectionState={connectionState} flash={null} />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-lg font-semibold">시작하기</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            강사는 관리자 화면에서 세션을 만들고 운영합니다. 학습자는 참가 코드로 입장해 CEO 역할을 수행합니다.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <Link
              href="/admin/login"
              className="group rounded-xl border-2 border-indigo-200 bg-indigo-50 p-6 transition hover:border-indigo-400 hover:shadow-md"
            >
              <span className="text-2xl" aria-hidden="true">
                🎓
              </span>
              <h3 className="mt-3 text-lg font-semibold text-indigo-900">관리자·강사로 시작</h3>
              <p className="mt-1 text-sm text-indigo-700">세션 생성, 게임 진행, 이벤트 발행, 결산</p>
            </Link>

            <Link
              href="/join"
              className="group rounded-xl border-2 border-emerald-200 bg-emerald-50 p-6 transition hover:border-emerald-400 hover:shadow-md"
            >
              <span className="text-2xl" aria-hidden="true">
                🏢
              </span>
              <h3 className="mt-3 text-lg font-semibold text-emerald-900">학습자로 참여</h3>
              <p className="mt-1 text-sm text-emerald-700">참가 코드 입력 후 팀 입장</p>
            </Link>
          </div>

          {demoAvailable && (
            <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm text-amber-900">데모 세션이 준비되어 있습니다.</p>
              <Link href="/admin/login" className="mt-2 inline-block text-sm font-medium text-amber-800 underline">
                데모 세션으로 시작 →
              </Link>
            </div>
          )}
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium text-slate-500">기본 설정</p>
            <p className="mt-1 text-sm font-medium">{PILOT_DEFAULTS.periodLabel}</p>
            <p className="text-xs text-slate-500">기본 {PILOT_DEFAULTS.maxTeams}팀 · 수동 Step 진행</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium text-slate-500">런타임 모드</p>
            <p className="mt-1 text-sm font-medium">{pilotMode ? "데모 (Pilot)" : "Production"}</p>
            <p className="text-xs text-slate-500">BSP_DEMO_MODE / BSP_PILOT_MODE</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium text-slate-500">빠른 링크</p>
            <div className="mt-1 flex flex-wrap gap-2 text-xs">
              <Link href="/admin/login" className="text-indigo-600 hover:underline">
                Admin
              </Link>
              <Link href="/gm" className="text-indigo-600 hover:underline">
                GM Desk
              </Link>
              <Link href="/world" className="text-indigo-600 hover:underline">
                World
              </Link>
              <Link href="/event-studio" className="text-indigo-600 hover:underline">
                Event Studio
              </Link>
            </div>
          </div>
        </section>

        <details className="mt-8 rounded-xl border border-slate-200 bg-white p-4">
          <summary className="cursor-pointer text-sm font-medium text-slate-700">이용 안내</summary>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-slate-600">
            <li>강사: 관리자 로그인 → 세션 생성 → 참가 코드 공유</li>
            <li>학습자: 참가 코드 입력 → 팀 선택 → 게임 대기</li>
            <li>강사: 게임 시작 → Step 진행 → 이벤트 발행 → 결산</li>
            <li>학습자: 각 Step 의사결정 제출 → 결과 확인</li>
          </ol>
        </details>
      </main>
    </div>
  );
}
