"use client";

import { useCallback, useEffect, useState } from "react";
import { authFetch } from "@/lib/bsp/auth-client";
import type { EventApplyTiming } from "@/src/bsp/domain/events/event-types";
import { GmConfirmDialog } from "./GmConfirmDialog";

type EventTemplate = {
  eventId: string;
  title: string;
  description: string;
  category: string;
  educationPurpose: string;
  severity: number;
  difficulty: string;
  tags: string[];
  normalEffects: Array<{ key: string; mode: string; value: number }>;
};

type SimulationEvent = {
  id: string;
  templateId: string;
  title: string;
  status: string;
  applyTiming: EventApplyTiming;
  impactDescription: string;
  firedAt?: string;
  scheduledFor?: { year: number; half: string };
};

type EventHistoryEntry = {
  id: string;
  action: string;
  title: string;
  templateId: string;
  occurredAt: string;
};

type Props = {
  sessionId: string;
  year: number;
  half: string;
  onMessage: (msg: string) => void;
  onRefresh: () => Promise<void>;
};

const APPLY_LABELS: Record<EventApplyTiming, string> = {
  IMMEDIATE: "즉시 적용",
  NEXT_STEP: "다음 Step부터",
  NEXT_HALF: "다음 반기부터",
};

export function GmEventControlPanel({ sessionId, year, half, onMessage, onRefresh }: Props) {
  const [catalog, setCatalog] = useState<EventTemplate[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [active, setActive] = useState<SimulationEvent[]>([]);
  const [scheduled, setScheduled] = useState<SimulationEvent[]>([]);
  const [history, setHistory] = useState<EventHistoryEntry[]>([]);
  const [selected, setSelected] = useState<EventTemplate | null>(null);
  const [preview, setPreview] = useState<{
    impactDescription: string;
    changes: Array<{ label: string; before: number; after: number }>;
  } | null>(null);
  const [applyTiming, setApplyTiming] = useState<EventApplyTiming>("IMMEDIATE");
  const [reason, setReason] = useState("");
  const [confirmFire, setConfirmFire] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadAll = useCallback(async () => {
    const q = new URLSearchParams();
    if (search) q.set("search", search);
    if (category) q.set("category", category);
    const [catRes, evRes, histRes] = await Promise.all([
      authFetch(`/api/v1/gm/events/catalog?${q}`),
      authFetch(`/api/v1/gm/sessions/${sessionId}/events`),
      authFetch(`/api/v1/gm/sessions/${sessionId}/events/history?limit=30`),
    ]);
    if (catRes.ok) {
      const d = await catRes.json();
      setCatalog(d.catalog ?? []);
    }
    if (evRes.ok) {
      const d = await evRes.json();
      setActive(d.active ?? []);
      setScheduled(d.scheduled ?? []);
    }
    if (histRes.ok) setHistory(await histRes.json());
  }, [sessionId, search, category]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const loadPreview = async (template: EventTemplate) => {
    setSelected(template);
    const res = await authFetch(
      `/api/v1/gm/sessions/${sessionId}/events/preview?templateId=${template.eventId}`
    );
    if (res.ok) {
      const d = await res.json();
      setPreview({ impactDescription: d.impactDescription, changes: d.changes ?? [] });
    }
  };

  const fireEvent = async () => {
    if (!selected) return;
    setLoading(true);
    const res = await authFetch(`/api/v1/gm/sessions/${sessionId}/events/fire`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateId: selected.eventId, applyTiming, reason }),
    });
    const data = await res.json();
    if (res.ok) {
      onMessage(`이벤트 발화: ${selected.title}`);
      setConfirmFire(false);
      setReason("");
      await loadAll();
      await onRefresh();
    } else {
      onMessage(data.error ?? "이벤트 발화 실패");
    }
    setLoading(false);
  };

  const scheduleEvent = async (template: EventTemplate) => {
    setLoading(true);
    const res = await authFetch(`/api/v1/gm/sessions/${sessionId}/events/schedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        templateId: template.eventId,
        year,
        half,
        reason: reason || "스케줄 등록",
      }),
    });
    const data = await res.json();
    if (res.ok) {
      onMessage(`스케줄 등록: ${template.title}`);
      await loadAll();
    } else {
      onMessage(data.error ?? "스케줄 실패");
    }
    setLoading(false);
  };

  const endEvent = async (eventId: string, title: string) => {
    setLoading(true);
    const res = await authFetch(`/api/v1/gm/sessions/${sessionId}/events/${eventId}/end`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "GM 종료" }),
    });
    if (res.ok) {
      onMessage(`이벤트 종료: ${title}`);
      await loadAll();
      await onRefresh();
    } else {
      const data = await res.json();
      onMessage(data.error ?? "종료 실패");
    }
    setLoading(false);
  };

  const categories = [...new Set(catalog.map((e) => e.category))];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6" data-testid="gm-event-panel">
      <h2 className="mb-1 text-lg font-semibold">이벤트 제어 패널</h2>
      <p className="mb-4 text-sm text-slate-600">Scenario Library · NORMAL 시나리오만 경제 반영 (V1)</p>

      <div className="mb-4 flex flex-wrap gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="검색 (ID, 제목, 태그)"
          className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm"
        >
          <option value="">전체 카테고리</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <h3 className="mb-2 text-sm font-medium text-slate-700">이벤트 카탈로그</h3>
          <div className="max-h-64 space-y-2 overflow-y-auto rounded border border-slate-200 p-2">
            {catalog.map((e) => (
              <button
                key={e.eventId}
                type="button"
                onClick={() => loadPreview(e)}
                className={`w-full rounded-lg border p-2 text-left text-sm transition ${
                  selected?.eventId === e.eventId
                    ? "border-violet-500 bg-violet-50"
                    : "border-slate-200 hover:bg-white"
                }`}
              >
                <span className="font-mono text-xs text-violet-700">{e.eventId}</span>
                <span className="ml-2 text-slate-500">[{e.category}]</span>
                <div className="font-medium">{e.title}</div>
                <div className="line-clamp-1 text-xs text-slate-500">{e.description}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-medium text-slate-700">미리보기</h3>
          {selected && preview ? (
            <div className="rounded border border-slate-200 bg-slate-100 p-3 text-sm">
              <div className="font-semibold">{selected.title}</div>
              <p className="mt-1 text-slate-600">{selected.educationPurpose}</p>
              <p className="mt-2 text-amber-800">{preview.impactDescription}</p>
              <ul className="mt-2 space-y-1 text-xs">
                {preview.changes.map((c) => (
                  <li key={c.label}>
                    {c.label}: {c.before} → {c.after}
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <select
                  value={applyTiming}
                  onChange={(e) => setApplyTiming(e.target.value as EventApplyTiming)}
                  className="rounded border border-slate-300 bg-white px-2 py-1 text-xs"
                >
                  {Object.entries(APPLY_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setConfirmFire(true)}
                  className="rounded bg-violet-600 px-3 py-1 text-xs hover:bg-violet-500 disabled:opacity-50"
                >
                  발화 (Fire)
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => scheduleEvent(selected)}
                  className="rounded border border-slate-300 px-3 py-1 text-xs hover:bg-slate-100 disabled:opacity-50"
                >
                  현재 반기 스케줄
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">카탈로그에서 이벤트를 선택하세요.</p>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div>
          <h3 className="mb-2 text-sm font-medium text-emerald-700">활성 이벤트 ({active.length})</h3>
          <ul className="space-y-2 text-sm">
            {active.map((e) => (
              <li key={e.id} className="rounded border border-emerald-900/50 bg-emerald-50 p-2">
                <div className="font-medium">{e.title}</div>
                <div className="text-xs text-slate-600">{e.impactDescription}</div>
                <div className="text-xs text-slate-500">{APPLY_LABELS[e.applyTiming]}</div>
                <button
                  type="button"
                  onClick={() => endEvent(e.id, e.title)}
                  className="mt-1 text-xs text-red-400 hover:underline"
                >
                  종료
                </button>
              </li>
            ))}
            {active.length === 0 && <li className="text-slate-500">없음</li>}
          </ul>
        </div>
        <div>
          <h3 className="mb-2 text-sm font-medium text-sky-400">예약 ({scheduled.length})</h3>
          <ul className="space-y-2 text-sm">
            {scheduled.map((e) => (
              <li key={e.id} className="rounded border border-sky-900/50 bg-sky-950/20 p-2">
                <div className="font-medium">{e.title}</div>
                <div className="text-xs">{APPLY_LABELS[e.applyTiming]}</div>
                {e.scheduledFor && (
                  <div className="text-xs text-slate-500">
                    Y{e.scheduledFor.year} {e.scheduledFor.half}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => endEvent(e.id, e.title)}
                  className="mt-1 text-xs text-red-400 hover:underline"
                >
                  취소
                </button>
              </li>
            ))}
            {scheduled.length === 0 && <li className="text-slate-500">없음</li>}
          </ul>
        </div>
        <div>
          <h3 className="mb-2 text-sm font-medium text-slate-600">이벤트 이력</h3>
          <ul className="max-h-40 space-y-1 overflow-y-auto text-xs">
            {history.map((h) => (
              <li key={h.id} className="border-b border-slate-200/50 py-1">
                <span className="text-violet-700">{h.action}</span> · {h.title}
                <div className="text-slate-600">{new Date(h.occurredAt).toLocaleString("ko-KR")}</div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <GmConfirmDialog
        open={confirmFire && !!selected}
        title={`이벤트 발화: ${selected?.title ?? ""}`}
        description={`${APPLY_LABELS[applyTiming]} · ${preview?.impactDescription ?? ""}`}
        confirmLabel="발화 확인"
        reason={reason}
        onReasonChange={setReason}
        onConfirm={fireEvent}
        onCancel={() => setConfirmFire(false)}
        loading={loading}
      />
    </div>
  );
}
