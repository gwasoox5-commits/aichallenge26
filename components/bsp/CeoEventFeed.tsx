"use client";

import { useCallback, useEffect, useState } from "react";
import { authFetch } from "@/lib/bsp/auth-client";
import {
  LEARNER_APPLY_TIMING_HINTS,
  sanitizeLearnerEventDescription,
} from "@/lib/bsp/learner-event-copy";

type EnvironmentDto = {
  activeEvents: Array<{
    id: string;
    title: string;
    description: string;
    impactDescription: string;
    applyTiming: string;
    firedAt?: string;
  }>;
  topDeltas: Array<{
    key: string;
    label: string;
    value: number;
    deltaVsPeriodOpen: number;
    description?: string;
  }>;
  recentChanges?: string[];
  scheduledChanges?: string[];
  environmentChangedBadge: boolean;
};

type Props = {
  companyId: string;
  /** Bumped by parent on each realtime sync/event — avoids a second WebSocket. */
  syncToken?: number;
};

const TIMING_LABELS: Record<string, string> = LEARNER_APPLY_TIMING_HINTS;

export function CeoEventFeed({ companyId, syncToken = 0 }: Props) {
  const [env, setEnv] = useState<EnvironmentDto | null>(null);

  const load = useCallback(async () => {
    const res = await authFetch(`/api/v1/play/companies/${companyId}/environment`);
    if (res.ok) setEnv(await res.json());
  }, [companyId]);

  useEffect(() => {
    load();
  }, [load, syncToken]);

  const dismissBadge = async () => {
    await authFetch(`/api/v1/play/companies/${companyId}/environment`, { method: "POST" });
    await load();
  };

  if (!env) return null;

  return (
    <div className="space-y-4" data-testid="ceo-event-feed">
      {env.environmentChangedBadge && (
        <div className="flex items-center justify-between rounded-lg border border-amber-600/50 bg-amber-50 px-4 py-3">
          <span className="text-sm text-amber-800">경제 환경이 변경되었습니다</span>
          <button
            type="button"
            onClick={dismissBadge}
            className="rounded bg-amber-700/50 px-2 py-1 text-xs hover:bg-amber-600/50"
          >
            확인
          </button>
        </div>
      )}

      {(env.recentChanges?.length ?? 0) > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white/95 p-4" data-testid="ceo-recent-changes">
          <h3 className="mb-2 text-sm font-semibold text-slate-700">최근 경제 변화</h3>
          <ul className="space-y-1 text-sm text-slate-700">
            {env.recentChanges!.map((line) => (
              <li key={line} className="flex items-start gap-2">
                <span className="text-amber-700">•</span>
                {line}
              </li>
            ))}
          </ul>
        </div>
      )}

      {(env.scheduledChanges?.length ?? 0) > 0 && (
        <div className="rounded-lg border border-sky-900/50 bg-sky-950/20 p-4" data-testid="ceo-scheduled-changes">
          <h3 className="mb-2 text-sm font-semibold text-sky-700">예정된 변경</h3>
          <ul className="space-y-1 text-sm text-slate-600">
            {env.scheduledChanges!.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      )}

      {env.topDeltas.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {env.topDeltas.map((d) => (
            <span
              key={d.key}
              className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs"
              title={d.description}
            >
              {d.description ?? d.label}
            </span>
          ))}
        </div>
      )}

      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-700">시장 이벤트</h3>
        {env.activeEvents.length === 0 ? (
          <p className="text-sm text-slate-500">현재 활성 이벤트 없음</p>
        ) : (
          <ul className="space-y-3">
            {env.activeEvents.map((e) => {
              const description = sanitizeLearnerEventDescription(e.description);
              return (
              <li key={e.id} className="rounded-lg border border-slate-200 bg-white/95 p-4">
                <div className="font-medium text-slate-900">{e.title}</div>
                {description ? (
                  <p className="mt-1 text-sm text-slate-600 whitespace-pre-wrap">{description}</p>
                ) : null}
                <p className="mt-2 text-sm text-amber-800/80">영향: {e.impactDescription}</p>
                <p className="mt-1 text-xs text-slate-500">{TIMING_LABELS[e.applyTiming] ?? e.applyTiming}</p>
              </li>
            );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
