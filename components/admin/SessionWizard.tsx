"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authFetch, getPlatformToken } from "@/lib/bsp/auth-client";
import { applyGmSessionToken } from "@/lib/bsp/token-client";
import { useAdminSession } from "@/lib/bsp/admin-session-context";
import { PILOT_DEFAULTS, formatJoinUrl } from "@/lib/bsp/pilot-config";

type WizardData = {
  sessionName: string;
  courseName: string;
  instructorName: string;
  pilotMemo: string;
  periods: number;
  stepDurationSec: number;
  autoAdvance: boolean;
  newsEnabled: boolean;
  worldEngine: boolean;
  aiIntelligence: boolean;
  economyPreset: string;
  teamCount: number;
};

const INITIAL: WizardData = {
  sessionName: "경영 시뮬레이션 세션",
  courseName: "경영 시뮬레이션",
  instructorName: "",
  pilotMemo: "",
  periods: 2,
  stepDurationSec: 900,
  autoAdvance: false,
  newsEnabled: true,
  worldEngine: false,
  aiIntelligence: true,
  economyPreset: "default",
  teamCount: PILOT_DEFAULTS.maxTeams,
};

export function SessionWizard() {
  const router = useRouter();
  const { setSessionId } = useAdminSession();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<WizardData>(INITIAL);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ joinCode: string; sessionId: string; joinUrl: string } | null>(null);
  const [error, setError] = useState("");

  const update = (patch: Partial<WizardData>) => setData((d) => ({ ...d, ...patch }));

  const createSession = async () => {
    setLoading(true);
    setError("");
    if (!getPlatformToken()) {
      setError("관리자 권한이 필요합니다. 로그아웃 후 /admin/login 에서 다시 로그인하세요.");
      setLoading(false);
      return;
    }
    const res = await authFetch("/api/v1/gm/sessions", {
      method: "POST",
      usePlatformToken: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.sessionName,
        periods: data.periods,
        stepDurationSec: data.stepDurationSec,
        economyPreset: data.economyPreset,
        maxTeams: data.teamCount,
        wizardMeta: {
          courseName: data.courseName,
          instructorName: data.instructorName,
          pilotMemo: data.pilotMemo,
          expectedTeams: data.teamCount,
          maxTeams: data.teamCount,
          autoAdvance: data.autoAdvance,
          newsEnabled: data.newsEnabled,
          worldEngine: data.worldEngine,
          aiIntelligence: data.aiIntelligence,
          economyPresetId: data.economyPreset,
        },
      }),
    });
    const body = await res.json();
    if (!res.ok) {
      const msg = body.error ?? "세션 생성 실패";
      setError(
        msg.includes("Insufficient role")
          ? "관리자 권한이 만료되었습니다. 로그아웃 후 /admin/login 에서 다시 로그인하세요."
          : msg
      );
      setLoading(false);
      return;
    }
    if (body.gmAccessToken) applyGmSessionToken(body.gmAccessToken);
    setSessionId(body.sessionId);
    setResult({
      sessionId: body.sessionId,
      joinCode: body.joinCode,
      joinUrl: formatJoinUrl(body.joinCode),
    });
    setStep(5);
    setLoading(false);
  };

  const copyGuide = () => {
    if (!result) return;
    const text = [
      `[${data.sessionName}] 참가 안내`,
      `교육: ${data.courseName}`,
      `강사: ${data.instructorName || "—"}`,
      `참가 URL: ${result.joinUrl}`,
      `참가 코드: ${result.joinCode}`,
      `팀 수: ${data.teamCount}팀 (팀명은 학습자가 참가 시 직접 입력)`,
    ].join("\n");
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h2 className="text-xl font-semibold">세션 생성 Wizard</h2>
      <WizardSteps current={step} />

      {step === 1 && (
        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
          <h3 className="font-medium">Step 1 · 기본 정보</h3>
          <Field label="세션명" value={data.sessionName} onChange={(v) => update({ sessionName: v })} />
          <Field label="교육명" value={data.courseName} onChange={(v) => update({ courseName: v })} />
          <Field label="강사명" value={data.instructorName} onChange={(v) => update({ instructorName: v })} />
          <Field label="운영 메모" value={data.pilotMemo} onChange={(v) => update({ pilotMemo: v })} multiline />
        </section>
      )}

      {step === 2 && (
        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
          <h3 className="font-medium">Step 2 · 게임 설정</h3>
          <SelectField
            label="게임 기간"
            value={String(data.periods)}
            options={[
              { value: "2", label: "1년 2반기" },
              { value: "4", label: "2년 4반기" },
              { value: "6", label: "3년 6반기" },
            ]}
            onChange={(v) => update({ periods: Number(v) })}
          />
          <Field label="단계별 제한시간(초)" value={String(data.stepDurationSec)} onChange={(v) => update({ stepDurationSec: Number(v) || 900 })} type="number" />
          <Toggle label="자동 Step 진행" checked={data.autoAdvance} onChange={(v) => update({ autoAdvance: v })} />
          <Toggle label="뉴스 확인 기능" checked={data.newsEnabled} onChange={(v) => update({ newsEnabled: v })} />
          <Toggle label="World Engine" checked={data.worldEngine} onChange={(v) => update({ worldEngine: v })} />
          <Toggle label="AI Intelligence" checked={data.aiIntelligence} onChange={(v) => update({ aiIntelligence: v })} />
          <p className="text-xs text-slate-500">기본: 1년 2반기 · 수동 진행 · GM 승인 필수</p>
        </section>
      )}

      {step === 3 && (
        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
          <h3 className="font-medium">Step 3 · 초기 경제환경</h3>
          <SelectField
            label="경제 Preset"
            value={data.economyPreset}
            options={[
              { value: "default", label: "기본 Preset" },
              { value: "high-rate", label: "고금리 환경" },
              { value: "weak-demand", label: "수요 약세" },
            ]}
            onChange={(v) => update({ economyPreset: v })}
          />
          <p className="text-xs text-slate-500">
            설정값은 세션 생성 시 서버에 저장됩니다. 생성 후 운영 화면에서 확인할 수 있습니다.
          </p>
        </section>
      )}

      {step === 4 && (
        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
          <h3 className="font-medium">Step 4 · 팀 설정</h3>
          <Field
            label="참가 정원 (팀 수)"
            value={String(data.teamCount)}
            onChange={(v) => update({ teamCount: Math.max(1, Number(v) || 1) })}
            type="number"
          />
          <p className="text-xs text-slate-500">
            팀명은 학습자가 참가 화면에서 직접 입력합니다. 정원을 초과한 참가는 자동으로 거부됩니다.
          </p>
        </section>
      )}

      {step === 5 && result && (
        <section className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50 p-6">
          <h3 className="font-medium text-emerald-900">세션 생성 완료</h3>
          <dl className="space-y-2 text-sm">
            <div><dt className="text-slate-500">세션명</dt><dd className="font-medium">{data.sessionName}</dd></div>
            <div><dt className="text-slate-500">참가 코드</dt><dd className="font-mono font-medium">{result.joinCode}</dd></div>
            <div><dt className="text-slate-500">학습자 URL</dt><dd className="break-all font-mono text-xs">{result.joinUrl}</dd></div>
          </dl>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={copyGuide} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-500">
              안내문 복사
            </button>
            <button type="button" onClick={() => router.push("/admin")} className="rounded-lg border border-emerald-400 px-4 py-2 text-sm text-emerald-800 hover:bg-emerald-100">
              운영 개요로 이동
            </button>
          </div>
        </section>
      )}

      {error && <p className="text-sm text-rose-600">{error}</p>}

      {step < 5 && (
        <div className="flex justify-between">
          <button type="button" disabled={step <= 1} onClick={() => setStep((s) => s - 1)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:opacity-40">
            이전
          </button>
          {step < 4 ? (
            <button type="button" onClick={() => setStep((s) => s + 1)} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-500">
              다음
            </button>
          ) : (
            <button type="button" onClick={createSession} disabled={loading} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-500 disabled:opacity-50">
              {loading ? "생성 중…" : "세션 생성"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function WizardSteps({ current }: { current: number }) {
  const labels = ["기본 정보", "게임 설정", "경제환경", "팀 설정", "완료"];
  return (
    <ol className="flex flex-wrap gap-2">
      {labels.map((label, i) => (
        <li key={label} className={`rounded-full px-3 py-1 text-xs ${i + 1 === current ? "bg-indigo-600 text-white" : i + 1 < current ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-500"}`}>
          {i + 1}. {label}
        </li>
      ))}
    </ol>
  );
}

function Field({ label, value, onChange, type = "text", multiline }: { label: string; value: string; onChange: (v: string) => void; type?: string; multiline?: boolean }) {
  return (
    <label className="block text-sm">
      <span className="text-slate-600">{label}</span>
      {multiline ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded border border-slate-300 px-3 py-2" rows={3} />
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded border border-slate-300 px-3 py-2" />
      )}
    </label>
  );
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: Array<{ value: string; label: string }>; onChange: (v: string) => void }) {
  return (
    <label className="block text-sm">
      <span className="text-slate-600">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded border border-slate-300 px-3 py-2">
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4" />
      {label}
    </label>
  );
}
