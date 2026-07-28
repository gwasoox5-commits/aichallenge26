"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const LEARNING_OBJECTIVES = [
  {
    title: "외부환경 변화가 제조업 경영에 미치는 영향 이해",
    description: "원자재·환율·규제·공급망 등 거시 환경 변화를 경영 지표와 연결합니다.",
  },
  {
    title: "단기 성과와 장기 경쟁력의 균형 체험",
    description: "당기 이익과 미래 성장 사이의 트레이드오프를 팀 토론으로 체험합니다.",
  },
  {
    title: "전략적 자원배분 의사결정 훈련",
    description: "제한된 100포인트를 6개 전략에 배분하며 우선순위를 설정합니다.",
  },
] as const;

type StartScreenProps = {
  teamName: string;
  onTeamNameChange: (name: string) => void;
  onStart: () => void;
};

export function StartScreen({
  teamName,
  onTeamNameChange,
  onStart,
}: StartScreenProps) {
  const canStart = teamName.trim().length > 0;

  return (
    <div className="mx-auto min-h-[calc(100vh-8rem)] max-w-6xl px-6 py-10 lg:py-14">
      <div className="grid gap-8 lg:grid-cols-5 lg:gap-10">
        {/* Hero */}
        <div className="lg:col-span-2">
          <Card className="h-full overflow-hidden border-slate-200 shadow-lg">
            <div className="relative border-b border-slate-200 bg-gradient-to-br from-white via-slate-50 to-sky-50 px-8 py-10 text-slate-900 lg:px-10 lg:py-12">
              <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:24px_24px]" />
              <div className="relative">
                <span className="inline-block rounded-full border border-brand-200 bg-brand-50 px-4 py-1.5 text-xs font-semibold tracking-wide text-brand-700">
                  HRD · 제조업 경영 시뮬레이션
                </span>
                <h1 className="mt-6 text-2xl font-bold leading-snug tracking-tight lg:text-3xl xl:text-[2rem]">
                  제조업 미래 산업 변화 시뮬레이션
                </h1>
                <p className="mt-5 text-base leading-relaxed text-slate-800 lg:text-lg">
                  불확실한 산업 전환기, 우리 회사는 어떤 선택을 해야 하는가?
                </p>
                <dl className="mt-8 grid grid-cols-2 gap-4 border-t border-slate-200 pt-6 text-sm">
                  <div>
                    <dt className="text-slate-600">진행 방식</dt>
                    <dd className="mt-1 font-semibold">4라운드 · 팀 토론</dd>
                  </div>
                  <div>
                    <dt className="text-slate-600">권장 인원</dt>
                    <dd className="mt-1 font-semibold">4~6명 / 1조</dd>
                  </div>
                </dl>
              </div>
            </div>
          </Card>
        </div>

        {/* Objectives + Form */}
        <div className="flex flex-col gap-6 lg:col-span-3">
          <Card className="border-slate-200 shadow-md">
            <CardHeader className="border-b border-slate-100 bg-slate-50/60 px-8 py-5">
              <CardTitle className="text-base font-semibold uppercase tracking-wider text-slate-500">
                교육 목적
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 px-8 py-6">
              {LEARNING_OBJECTIVES.map((objective, index) => (
                <div
                  key={objective.title}
                  className="flex gap-4 rounded-xl border border-slate-200 bg-white p-5 transition-colors hover:border-brand-200 hover:bg-brand-50/30"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-base font-bold text-white shadow-sm">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-semibold leading-snug text-slate-900">
                      {objective.title}
                    </p>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                      {objective.description}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-md">
            <CardContent className="space-y-5 px-8 py-8">
              <div>
                <label
                  htmlFor="teamName"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  팀명
                </label>
                <input
                  id="teamName"
                  type="text"
                  value={teamName}
                  onChange={(e) => onTeamNameChange(e.target.value)}
                  placeholder="예: A조, 1팀 혁신전략팀"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-lg text-slate-900 shadow-sm placeholder:text-slate-600 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  maxLength={30}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && canStart) onStart();
                  }}
                />
              </div>

              <Button
                size="lg"
                className="w-full py-4 text-lg shadow-md"
                disabled={!canStart}
                onClick={onStart}
              >
                시뮬레이션 시작
              </Button>

              <p className="text-center text-sm text-slate-500">
                팀원과 화면을 공유한 뒤, 토론을 마치고 1명이 최종 배분을
                제출하세요.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
