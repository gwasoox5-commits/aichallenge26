"use client";

import type { WorldEvolutionProposal } from "@/lib/v3/world/types";

interface Props {
  proposals: WorldEvolutionProposal[];
  onApprove: (id: string) => void;
  onPublish: (id: string) => void;
  loading?: boolean;
}

export function UpcomingEventsPanel({ proposals, onApprove, onPublish, loading }: Props) {
  const pending = proposals.filter((p) => p.status === "PENDING_GM");
  const approved = proposals.filter((p) => p.status === "APPROVED");

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="font-semibold text-slate-800">Upcoming Events</h3>
      <p className="mt-1 text-xs text-slate-500">GM 승인 → V2.4 Publish</p>

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
            <button
              type="button"
              disabled={loading}
              onClick={() => onPublish(p.proposalId)}
              className="mt-2 rounded bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              Publish via V2.4
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
