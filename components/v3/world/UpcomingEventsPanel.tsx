"use client";

import { useState } from "react";
import type { EventApplyTiming } from "@/src/bsp/domain/events/event-types";
import type { WorldEvolutionProposal } from "@/lib/v3/world/types";

const APPLY_LABELS: Record<EventApplyTiming, string> = {
  IMMEDIATE: "즉시 적용",
  NEXT_STEP: "다음 Step부터",
  NEXT_HALF: "다음 반기부터",
};

interface Props {
  proposals: WorldEvolutionProposal[];
  onApprove: (id: string) => void;
  onPublish: (id: string, applyTiming: EventApplyTiming) => void;
  loading?: boolean;
}

export function UpcomingEventsPanel({ proposals, onApprove, onPublish, loading }: Props) {
  const [applyTiming, setApplyTiming] = useState<EventApplyTiming>("NEXT_HALF");
  const pending = proposals.filter((p) => p.status === "PENDING_GM");
  const approved = proposals.filter((p) => p.status === "APPROVED");

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-800">Upcoming Events</h3>
          <p className="mt-1 text-xs text-slate-500">GM 승인 → V2.4 Publish</p>
        </div>
        {approved.length > 0 && (
          <label className="text-xs text-slate-600">
            <span className="mr-2">적용 시점</span>
            <select
              value={applyTiming}
              onChange={(e) => setApplyTiming(e.target.value as EventApplyTiming)}
              className="rounded border border-slate-300 bg-white px-2 py-1 text-xs"
            >
              {Object.entries(APPLY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {pending.length === 0 && approved.length === 0 && (
        <p className="mt-3 text-sm text-slate-500">대기 중인 제안이 없습니다. 반기 종료 시 AI Evolution이 생성됩니다.</p>
      )}

      <ul className="mt-3 space-y-3">
        {pending.map((p) => (
          <li key={p.proposalId} className="rounded-lg border border-amber-200 bg-amber-50/30 p-3 text-sm">
            <p className="font-medium text-slate-800">{p.title}</p>
            <p className="mt-1 text-xs text-slate-600">{p.summary.slice(0, 120)}…</p>
            <p className="mt-1 text-xs text-slate-400">{p.source} · {p.periodLabel}</p>
            <button
              type="button"
              disabled={loading}
              onClick={() => onApprove(p.proposalId)}
              className="mt-2 rounded bg-amber-600 px-3 py-1 text-xs font-medium text-white hover:bg-amber-500 disabled:opacity-50"
            >
              GM Approve
            </button>
          </li>
        ))}
        {approved.map((p) => (
          <li key={p.proposalId} className="rounded-lg border border-emerald-200 bg-emerald-50/30 p-3 text-sm">
            <p className="font-medium text-emerald-800">{p.title} (승인됨)</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => onPublish(p.proposalId, applyTiming)}
                className="rounded bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                Publish via V2.4
              </button>
              <span className="text-xs text-slate-500">{APPLY_LABELS[applyTiming]}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
