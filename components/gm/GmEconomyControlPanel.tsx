"use client";

import { useCallback, useEffect, useState } from "react";
import { authFetch } from "@/lib/bsp/auth-client";
import { GmConfirmDialog } from "./GmConfirmDialog";
import { ECONOMY_BOUNDS, ECONOMY_VARIABLE_LABELS } from "@/src/bsp/domain/economy/economy-variable-meta";
import type { EconomyValues } from "@/src/bsp/domain/types";
import type { EventApplyTiming } from "@/src/bsp/domain/events/event-types";

type DashboardCard = {
  id: string;
  label: string;
  unit: string;
  currentValue: number;
  baselineValue: number;
  deltaVsBaseline: number;
  applyTiming: string;
  lastModifier: string;
  lastModifiedAt?: string;
  engineKey?: keyof EconomyValues;
};

type PatchRecord = {
  id: string;
  sequence: number;
  source: string;
  reason?: string;
  occurredAt: string;
  effects: Array<{ key: string; mode: string; value: number }>;
};

type EconomyPreview = {
  message: string;
  productionCostDeltaManwon: number;
  salesPriceImpactPct: number;
  expectedPnlDeltaManwon: number;
  affectedSteps: string[];
  affectedEvents: string[];
  changes: Array<{ label: string; before: number; after: number }>;
};

type Preset = {
  id: string;
  label: string;
  description: string;
  learningObjective: string;
  recommendedYear: number;
};

type TimelineEntry = {
  id: string;
  type: string;
  sequence?: number;
  source: string;
  title: string;
  description: string;
  applyTiming?: string;
  occurredAt: string;
};

type EconomyState = {
  live: { values: EconomyValues; version: number; pendingBadgeForCeo: boolean };
  currentPeriodSnapshot: { values: EconomyValues };
  patchHistory: PatchRecord[];
  activePatch?: PatchRecord;
  pendingPatches: Array<{ id: string; applyTiming: string; reason?: string; effects: unknown[] }>;
  dashboardCards: DashboardCard[];
  timeline: TimelineEntry[];
};

type Props = {
  sessionId: string;
  onMessage: (msg: string) => void;
  onRefresh: () => Promise<void>;
};

const APPLY_LABELS: Record<EventApplyTiming, string> = {
  IMMEDIATE: "즉시 적용",
  NEXT_STEP: "다음 Step부터",
  NEXT_HALF: "다음 반기부터",
};

const SOURCE_LABELS: Record<string, string> = {
  EVENT_FIRE: "이벤트",
  GM_MANUAL: "GM 수동",
  PRESET: "프리셋",
  EVENT_END: "이벤트 종료",
  PENDING: "예약",
};

const EDITABLE_KEYS: (keyof EconomyValues)[] = [
  "exchangeRate",
  "interestRateLoan",
  "interestRateDeposit",
  "rawMaterialIndex",
  "marketDemandIndex",
  "marketSupplyIndex",
  "logisticsCostMultiplier",
  "tariffRate",
  "corporateTaxRate",
  "carbonTaxRatePerUnit",
  "payrollCostMultiplier",
  "techInnovationIndex",
  "esgPressureIndex",
  "businessCycleIndex",
];

export function GmEconomyControlPanel({ sessionId, onMessage, onRefresh }: Props) {
  const [state, setState] = useState<EconomyState | null>(null);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [editKey, setEditKey] = useState<keyof EconomyValues>("rawMaterialIndex");
  const [editValue, setEditValue] = useState("");
  const [applyTiming, setApplyTiming] = useState<EventApplyTiming>("IMMEDIATE");
  const [preview, setPreview] = useState<EconomyPreview | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string>("");
  const [reason, setReason] = useState("");
  const [confirmApply, setConfirmApply] = useState(false);
  const [confirmRollback, setConfirmRollback] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    const [ecoRes, presetRes] = await Promise.all([
      authFetch(`/api/v1/gm/sessions/${sessionId}/economy`),
      authFetch(`/api/v1/gm/economy/presets`),
    ]);
    if (ecoRes.ok) {
      const d = await ecoRes.json();
      setState(d);
    }
    if (presetRes.ok) {
      const d = await presetRes.json();
      setPresets(d.presets ?? []);
    }
  }, [sessionId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (state?.live.values && editValue === "") {
      setEditValue(String(state.live.values[editKey]));
    }
  }, [state, editKey, editValue]);

  const runPreview = async () => {
    const val = parseFloat(editValue);
    if (Number.isNaN(val)) {
      onMessage("유효한 숫자를 입력하세요");
      return;
    }
    setLoading(true);
    const res = await authFetch(`/api/v1/gm/sessions/${sessionId}/economy/preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patch: { [editKey]: val } }),
    });
    const data = await res.json();
    if (res.ok) setPreview(data);
    else onMessage(data.error ?? "미리보기 실패");
    setLoading(false);
  };

  const applyPatch = async () => {
    setLoading(true);
    const val = parseFloat(editValue);
    const res = await authFetch(`/api/v1/gm/sessions/${sessionId}/economy`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patch: { [editKey]: val },
        applyTiming,
        reason: reason || "GM 경제 변수 수정",
      }),
    });
    const data = await res.json();
    if (res.ok) {
      onMessage(`${ECONOMY_VARIABLE_LABELS[editKey]} 적용 완료`);
      setConfirmApply(false);
      setPreview(null);
      setReason("");
      await load();
      await onRefresh();
    } else {
      onMessage(data.error ?? "적용 실패");
    }
    setLoading(false);
  };

  const applyPreset = async (presetId: string) => {
    setLoading(true);
    const res = await authFetch(
      `/api/v1/gm/sessions/${sessionId}/economy/presets/${presetId}/apply`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason || `프리셋 ${presetId}` }),
      }
    );
    const data = await res.json();
    if (res.ok) {
      onMessage(`프리셋 적용: ${presetId}`);
      await load();
      await onRefresh();
    } else {
      onMessage(data.error ?? "프리셋 적용 실패");
    }
    setLoading(false);
  };

  const rollback = async () => {
    setLoading(true);
    const res = await authFetch(`/api/v1/gm/sessions/${sessionId}/economy/rollback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: reason || "패치 롤백" }),
    });
    const data = await res.json();
    if (res.ok) {
      onMessage(`패치 #${data.rolledBackSequence} 롤백 완료`);
      setConfirmRollback(false);
      setReason("");
      await load();
      await onRefresh();
    } else {
      onMessage(data.error ?? "롤백 실패");
    }
    setLoading(false);
  };

  const bounds = ECONOMY_BOUNDS[editKey];

  const onEditKeyChange = (k: keyof EconomyValues) => {
    setEditKey(k);
    setEditValue(String(state?.live.values[k] ?? ""));
    setPreview(null);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6" data-testid="gm-economy-panel">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">경제 제어 센터</h2>
          <p className="text-sm text-slate-600">
            현재 v{state?.live.version ?? 0} · CEO 배지{" "}
            {state?.live.pendingBadgeForCeo ? (
              <span className="text-amber-700">대기</span>
            ) : (
              <span className="text-slate-500">없음</span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100"
        >
          새로고침
        </button>
      </div>

      {/* Dashboard cards — 14 variables */}
      <div className="mb-6">
        <h3 className="mb-2 text-sm font-medium text-slate-700">경제 대시보드 (14 변수)</h3>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-7">
          {(state?.dashboardCards ?? []).map((card) => (
            <div
              key={card.id}
              data-testid={`eco-card-${card.id}`}
              className={`rounded-lg border p-2 text-xs ${
                card.engineKey === editKey
                  ? "border-violet-500 bg-violet-50"
                  : "border-slate-200 bg-slate-100"
              }`}
            >
              <div className="font-medium text-slate-800">{card.label}</div>
              <div className="mt-1 font-mono text-sm text-white">
                {card.currentValue}
                <span className="ml-1 text-slate-500">{card.unit}</span>
              </div>
              <div
                className={
                  card.deltaVsBaseline > 0
                    ? "text-red-400"
                    : card.deltaVsBaseline < 0
                      ? "text-emerald-700"
                      : "text-slate-500"
                }
              >
                Δ {card.deltaVsBaseline >= 0 ? "+" : ""}
                {card.deltaVsBaseline}
              </div>
              <div className="mt-1 text-[10px] text-slate-500">
                {APPLY_LABELS[card.applyTiming as EventApplyTiming] ?? card.applyTiming}
              </div>
              <div className="text-[10px] text-slate-600">
                {card.lastModifier}
                {card.lastModifiedAt && (
                  <span className="block">{new Date(card.lastModifiedAt).toLocaleString("ko-KR")}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Variable editing */}
        <div className="rounded border border-slate-200 p-4">
          <h3 className="mb-3 text-sm font-medium">변수 편집</h3>
          <div className="space-y-3">
            <select
              value={editKey}
              onChange={(e) => onEditKeyChange(e.target.value as keyof EconomyValues)}
              className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              {EDITABLE_KEYS.map((k) => (
                <option key={k} value={k}>
                  {ECONOMY_VARIABLE_LABELS[k]} ({ECONOMY_BOUNDS[k].min}~{ECONOMY_BOUNDS[k].max})
                </option>
              ))}
            </select>
            <input
              type="number"
              data-testid="eco-edit-value"
              value={editValue}
              onChange={(e) => {
                setEditValue(e.target.value);
                setPreview(null);
              }}
              min={bounds.min}
              max={bounds.max}
              step="any"
              className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm"
            />
            <select
              value={applyTiming}
              onChange={(e) => setApplyTiming(e.target.value as EventApplyTiming)}
              className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm"
              data-testid="eco-apply-timing"
            >
              {Object.entries(APPLY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={loading}
                onClick={runPreview}
                className="rounded bg-sky-700 px-3 py-1.5 text-sm hover:bg-sky-600 disabled:opacity-50"
                data-testid="eco-preview-btn"
              >
                미리보기 (저장 안 함)
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => setConfirmApply(true)}
                className="rounded bg-violet-600 px-3 py-1.5 text-sm hover:bg-violet-500 disabled:opacity-50"
                data-testid="eco-apply-btn"
              >
                적용
              </button>
            </div>
          </div>
        </div>

        {/* Preview panel */}
        <div className="rounded border border-slate-200 p-4">
          <h3 className="mb-3 text-sm font-medium">경제 미리보기</h3>
          {preview ? (
            <div className="space-y-2 text-sm" data-testid="eco-preview-result">
              <p className="text-amber-800">{preview.message}</p>
              <ul className="space-y-1 text-xs text-slate-600">
                <li>생산원가 변화: {preview.productionCostDeltaManwon >= 0 ? "+" : ""}{preview.productionCostDeltaManwon}만원</li>
                <li>판매가/수요 영향: {preview.salesPriceImpactPct >= 0 ? "+" : ""}{preview.salesPriceImpactPct}%</li>
                <li>예상 P&L 변화: {preview.expectedPnlDeltaManwon >= 0 ? "+" : ""}{preview.expectedPnlDeltaManwon}만원</li>
                <li>영향 Step: {preview.affectedSteps.join(", ") || "—"}</li>
                <li>관련 이벤트: {preview.affectedEvents.join(", ") || "—"}</li>
              </ul>
              {preview.changes.map((c) => (
                <div key={c.label} className="text-xs">
                  {c.label}: {c.before} → {c.after}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">미리보기를 실행하면 P&L·원가 영향이 표시됩니다.</p>
          )}
        </div>
      </div>

      {/* Presets */}
      <div className="mt-4 rounded border border-slate-200 p-4">
        <h3 className="mb-2 text-sm font-medium">프리셋 (8 시나리오)</h3>
        <div className="flex flex-wrap gap-2">
          <select
            value={selectedPreset}
            onChange={(e) => setSelectedPreset(e.target.value)}
            className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm"
          >
            <option value="">프리셋 선택</option>
            {presets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label} (Y{p.recommendedYear})
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!selectedPreset || loading}
            onClick={() => selectedPreset && applyPreset(selectedPreset)}
            className="rounded bg-emerald-700 px-3 py-1.5 text-sm hover:bg-emerald-600 disabled:opacity-50"
            data-testid="eco-preset-apply"
          >
            프리셋 적용
          </button>
        </div>
        {selectedPreset && (
          <p className="mt-2 text-xs text-slate-500">
            {presets.find((p) => p.id === selectedPreset)?.description}
          </p>
        )}
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {/* Active patch */}
        <div>
          <h3 className="mb-2 text-sm font-medium text-emerald-700">활성 패치</h3>
          {state?.activePatch ? (
            <div className="rounded border border-emerald-900/50 bg-emerald-50 p-2 text-xs">
              <div>#{state.activePatch.sequence} · {SOURCE_LABELS[state.activePatch.source] ?? state.activePatch.source}</div>
              <div className="text-slate-600">{state.activePatch.reason}</div>
              <div className="text-slate-500">{new Date(state.activePatch.occurredAt).toLocaleString("ko-KR")}</div>
              <button
                type="button"
                onClick={() => setConfirmRollback(true)}
                className="mt-2 text-red-400 hover:underline"
                data-testid="eco-rollback-btn"
              >
                롤백
              </button>
            </div>
          ) : (
            <p className="text-sm text-slate-500">없음</p>
          )}
        </div>

        {/* Patch history */}
        <div>
          <h3 className="mb-2 text-sm font-medium text-slate-700">패치 이력</h3>
          <ul className="max-h-40 space-y-1 overflow-y-auto text-xs" data-testid="eco-patch-history">
            {(state?.patchHistory ?? []).map((p) => (
              <li key={p.id} className="border-b border-slate-200/50 py-1">
                <span className={p.source === "EVENT_FIRE" ? "text-sky-400" : p.source === "GM_MANUAL" ? "text-violet-700" : "text-emerald-700"}>
                  #{p.sequence} {SOURCE_LABELS[p.source] ?? p.source}
                </span>
                <div className="text-slate-500">{p.reason}</div>
              </li>
            ))}
          </ul>
        </div>

        {/* Timeline */}
        <div>
          <h3 className="mb-2 text-sm font-medium text-slate-700">경제 타임라인</h3>
          <ul className="max-h-40 space-y-1 overflow-y-auto text-xs" data-testid="eco-timeline">
            {(state?.timeline ?? []).slice(0, 15).map((t) => (
              <li key={t.id} className="border-b border-slate-200/50 py-1">
                <span className="text-violet-700">{t.title}</span>
                <div className="text-slate-500">{t.description}</div>
                <div className="text-slate-600">{new Date(t.occurredAt).toLocaleString("ko-KR")}</div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <GmConfirmDialog
        open={confirmApply}
        title="경제 변수 적용"
        description={`${ECONOMY_VARIABLE_LABELS[editKey]} = ${editValue} · ${APPLY_LABELS[applyTiming]}`}
        confirmLabel="적용 확인"
        reason={reason}
        onReasonChange={setReason}
        onConfirm={applyPatch}
        onCancel={() => setConfirmApply(false)}
        loading={loading}
      />

      <GmConfirmDialog
        open={confirmRollback}
        title="패치 롤백"
        description={`마지막 패치 #${state?.activePatch?.sequence}를 되돌립니다.`}
        confirmLabel="롤백 확인"
        confirmTone="warning"
        reason={reason}
        onReasonChange={setReason}
        onConfirm={rollback}
        onCancel={() => setConfirmRollback(false)}
        loading={loading}
      />
    </div>
  );
}
