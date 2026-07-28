"use client";

import type { ConflictPreview } from "@/lib/v2/intelligence/publish-types";

interface Props {
  conflicts: ConflictPreview | null;
  loading?: boolean;
}

export function ConflictPreviewPanel({ conflicts, loading }: Props) {
  if (loading) return <p className="text-sm text-slate-500">충돌 검증 중…</p>;
  if (!conflicts) return null;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="font-semibold text-slate-800">Patch 충돌 검증</h3>
      <p className="mt-1 text-sm text-slate-600">{conflicts.recommendation}</p>
      <p className="mt-1 text-xs text-slate-500">
        활성 이벤트 {conflicts.activeEventCount}건 ·{" "}
        {conflicts.canProceed ? (
          <span className="text-emerald-600">발행 가능</span>
        ) : (
          <span className="text-amber-600">GM 확인 필요</span>
        )}
      </p>
      {conflicts.conflicts.length > 0 && (
        <ul className="mt-3 space-y-2">
          {conflicts.conflicts.map((c) => (
            <li
              key={c.engineKey}
              className={`rounded border p-2 text-xs ${
                c.severity === "CRITICAL"
                  ? "border-red-200 bg-red-50"
                  : c.severity === "WARNING"
                    ? "border-amber-200 bg-amber-50"
                    : "border-slate-200 bg-slate-50"
              }`}
            >
              <strong>{c.engineKey}</strong> — 기존 {c.existingValue.toFixed(2)} → 결합{" "}
              {c.combinedValue.toFixed(2)} (허용 {c.allowedMin}~{c.allowedMax}) · {c.resolution}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
