"use client";

import type { DirectorSuggestion } from "@/lib/v3/world/types";

interface Props {
  director: DirectorSuggestion | null;
}

const ACTION_LABELS: Record<string, string> = {
  INCREASE_DIFFICULTY: "난이도 상향",
  RECOVERY_EVENT: "회복 이벤트",
  BUFFER_EVENT: "완충 이벤트",
  MAINTAIN: "현상 유지",
};

export function AISuggestionsPanel({ director }: Props) {
  if (!director) return null;

  return (
    <section className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
      <h3 className="font-semibold text-amber-900">AI Game Director (GM 전용)</h3>
      <p className="mt-2 text-sm text-slate-800">
        <strong>{ACTION_LABELS[director.action] ?? director.action}</strong>
        {" — "}
        {director.reason}
      </p>
      <p className="mt-2 text-xs text-slate-600">제안: {director.suggestedEventLabel}</p>
      <p className="mt-1 text-xs text-amber-800">{director.educationalRationale}</p>
      <p className="mt-2 text-xs text-slate-400">Confidence: {Math.round(director.confidence * 100)}%</p>
    </section>
  );
}
