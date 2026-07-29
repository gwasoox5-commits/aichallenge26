"use client";

import { useCallback, useState } from "react";
import { authFetch } from "@/lib/bsp/auth-client";
import type { ScenarioKey } from "@/lib/v2/event-studio/types";
import type {
  ConflictPreview,
  ConsultantFollowUp,
  EducationalDebrief,
  EventTimelineEntry,
  IntelligencePublishRecord,
  PublishResult,
} from "@/lib/v2/intelligence/publish-types";
import type { IntelligencePreview } from "@/lib/v2/intelligence/types";
import { ConflictPreviewPanel } from "./ConflictPreviewPanel";
import { EventTimelinePanel } from "./EventTimelinePanel";

interface Props {
  sessionId: string;
  previewId: string | null;
  preview?: IntelligencePreview | null;
  selectedScenario: ScenarioKey;
  disabled?: boolean;
  onPublished?: (result: PublishResult) => void;
}

type ApplyTiming = "IMMEDIATE" | "NEXT_STEP" | "NEXT_HALF";

async function readApiError(res: Response, fallback: string): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string; message?: string; code?: string };
    const detail = data.error ?? data.message ?? fallback;
    return data.code ? `${detail} (${data.code})` : detail;
  } catch {
    return `${fallback} (HTTP ${res.status})`;
  }
}

export function PublishWorkflowPanel({
  sessionId,
  previewId,
  preview,
  selectedScenario,
  disabled,
  onPublished,
}: Props) {
  const [applyTiming, setApplyTiming] = useState<ApplyTiming>("IMMEDIATE");
  const [reason, setReason] = useState("실뉴스 기반 AI 시나리오 GM 승인 발행");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [record, setRecord] = useState<IntelligencePublishRecord | null>(null);
  const [conflicts, setConflicts] = useState<ConflictPreview | null>(null);
  const [timeline, setTimeline] = useState<EventTimelineEntry[]>([]);
  const [followUp, setFollowUp] = useState<ConsultantFollowUp | null>(null);
  const [debrief, setDebrief] = useState<EducationalDebrief | null>(null);
  const [publishResult, setPublishResult] = useState<PublishResult | null>(null);
  const [ackSummary, setAckSummary] = useState<{ totalTeams: number; acknowledgedTeams: number } | null>(null);

  const checkConflicts = useCallback(async (publishId: string) => {
    const res = await authFetch(
      `/api/v2/intelligence/publish/${publishId}/conflicts?sessionId=${encodeURIComponent(sessionId)}`
    );
    if (res.ok) {
      const data = (await res.json()) as { conflicts: ConflictPreview };
      setConflicts(data.conflicts);
    }
  }, [sessionId]);

  const loadTimeline = useCallback(async (publishId: string) => {
    const res = await authFetch(
      `/api/v2/intelligence/publish/${publishId}/timeline?sessionId=${encodeURIComponent(sessionId)}`
    );
    if (res.ok) {
      const data = (await res.json()) as { timeline: EventTimelineEntry[] };
      setTimeline(data.timeline);
    }
  }, [sessionId]);

  const loadAckSummary = useCallback(async (publishId: string) => {
    const res = await authFetch(
      `/api/v2/intelligence/publish/${publishId}/ack?sessionId=${encodeURIComponent(sessionId)}`
    );
    if (res.ok) {
      const data = (await res.json()) as { summary: { totalTeams: number; acknowledgedTeams: number } | null };
      if (data.summary) setAckSummary(data.summary);
    }
  }, [sessionId]);

  const preCheckConflicts = async () => {
    if (!previewId) return;
    setLoading(true);
    setError(null);
    try {
      const initRes = await authFetch("/api/v2/intelligence/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          previewId,
          preview,
          selectedScenario,
          workflow: "initiate",
        }),
      });
      if (!initRes.ok) throw new Error(await readApiError(initRes, "발행 준비(initiate) 실패"));
      const { record: initRecord } = (await initRes.json()) as { record: IntelligencePublishRecord };
      setRecord(initRecord);
      await checkConflicts(initRecord.publishId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "충돌 검증 실패");
    } finally {
      setLoading(false);
    }
  };

  const publish = async () => {
    if (!previewId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch("/api/v2/intelligence/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          previewId,
          preview,
          selectedScenario,
          applyTiming,
          displayMode: "DIRECTIONAL",
          reason,
        }),
      });
      if (!res.ok) {
        throw new Error(await readApiError(res, "발행 실패"));
      }
      const data = (await res.json()) as { result: PublishResult; record: IntelligencePublishRecord };
      setRecord(data.record);
      setPublishResult(data.result);
      setFollowUp(data.record.followUp ?? null);
      onPublished?.(data.result);
      await checkConflicts(data.record.publishId);
      await loadTimeline(data.record.publishId);
      await loadAckSummary(data.record.publishId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "발행 실패");
    } finally {
      setLoading(false);
    }
  };

  const runFollowUp = async () => {
    if (!record) return;
    const res = await authFetch(`/api/v2/intelligence/publish/${record.publishId}/followup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
    if (res.ok) {
      const data = (await res.json()) as { followUp: ConsultantFollowUp };
      setFollowUp(data.followUp);
    }
  };

  const runDebrief = async () => {
    if (!record) return;
    const res = await authFetch(`/api/v2/intelligence/publish/${record.publishId}/debrief`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
    if (res.ok) {
      const data = (await res.json()) as { record: IntelligencePublishRecord };
      setDebrief(data.record.debrief ?? null);
    }
  };

  const runLifecycle = async (action: "expire" | "archive") => {
    if (!record) return;
    setLoading(true);
    try {
      const res = await authFetch(`/api/v2/intelligence/publish/${record.publishId}/lifecycle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, action }),
      });
      if (res.ok) {
        const data = (await res.json()) as { record: IntelligencePublishRecord };
        setRecord(data.record);
        if (data.record.debrief) setDebrief(data.record.debrief);
        await loadTimeline(record.publishId);
      }
    } finally {
      setLoading(false);
    }
  };

  const runReplay = async (scenario: ScenarioKey) => {
    if (!record) return;
    setLoading(true);
    try {
      const res = await authFetch(`/api/v2/intelligence/publish/${record.publishId}/replay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          replayScenario: scenario,
          applyTiming: "IMMEDIATE",
          reason: `Replay as ${scenario}`,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { result: PublishResult; replay: { replayScenario: ScenarioKey } };
        setPublishResult(data.result);
        await loadTimeline(record.publishId);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">V2.4 Publish Workflow</h2>
        <p className="mt-1 text-sm text-slate-600">
          GM 승인 → Breaking News → Event Engine → Economy Patch → WebSocket
        </p>
      </div>

      <label className="block text-sm">
        <span className="text-slate-600">발행 시점</span>
        <select
          className="mt-1 block w-full max-w-xs rounded border border-slate-300 p-2 text-sm"
          value={applyTiming}
          onChange={(e) => setApplyTiming(e.target.value as ApplyTiming)}
          disabled={disabled || !!publishResult}
        >
          <option value="IMMEDIATE">즉시</option>
          <option value="NEXT_STEP">다음 Step</option>
          <option value="NEXT_HALF">다음 반기</option>
        </select>
      </label>

      <label className="block text-sm">
        <span className="text-slate-600">승인 사유 (Audit)</span>
        <input
          className="mt-1 w-full rounded border border-slate-300 p-2 text-sm"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          disabled={disabled || !!publishResult}
        />
      </label>

      {!publishResult && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={disabled || loading || !previewId}
            onClick={preCheckConflicts}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            충돌 검증
          </button>
          <button
            type="button"
            disabled={disabled || loading || !previewId || (conflicts !== null && !conflicts.canProceed)}
            onClick={publish}
            className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {loading ? "발행 중…" : "Approve & Publish"}
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {publishResult && (
        <div className="rounded-lg border border-emerald-300 bg-white p-4 text-sm">
          <p className="font-semibold text-emerald-800">발행 완료</p>
          <ul className="mt-2 space-y-1 text-slate-700">
            <li>News ID: {publishResult.newsId}</li>
            <li>Event ID: {publishResult.simulationEventId}</li>
            <li>상태: {publishResult.status}</li>
            {publishResult.patchSequence != null && <li>Patch #{publishResult.patchSequence}</li>}
          </ul>
          {ackSummary && (
            <p className="mt-2 text-xs text-slate-500">
              읽음 확인: {ackSummary.acknowledgedTeams}/{ackSummary.totalTeams} 팀
            </p>
          )}
          {record?.status === "ACTIVE" && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => runLifecycle("expire")}
                className="rounded border border-amber-300 px-3 py-1 text-xs text-amber-800 hover:bg-amber-50"
              >
                이벤트 만료
              </button>
              <button
                type="button"
                onClick={() => runReplay("pessimistic")}
                className="rounded border border-violet-300 px-3 py-1 text-xs text-violet-800 hover:bg-violet-50"
              >
                Replay (비관적)
              </button>
            </div>
          )}
          {record?.status === "EXPIRED" && (
            <button
              type="button"
              onClick={() => runLifecycle("archive")}
              className="mt-3 rounded border border-slate-300 px-3 py-1 text-xs text-slate-700 hover:bg-slate-50"
            >
              Archive
            </button>
          )}
        </div>
      )}

      <ConflictPreviewPanel conflicts={conflicts} />
      <EventTimelinePanel timeline={timeline} record={record} />

      {followUp && (
        <div className="rounded-lg border border-violet-200 bg-violet-50 p-4 text-sm">
          <h4 className="font-semibold text-violet-900">AI Consultant Follow-up (GM 전용)</h4>
          <ul className="mt-2 list-disc pl-5 text-slate-700 space-y-1">
            {followUp.comments.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
            {followUp.studentBehaviorPredictions.map((c, i) => (
              <li key={`pred-${i}`} className="text-amber-800">{c}</li>
            ))}
            {followUp.discussionGuidance.map((c, i) => (
              <li key={`guide-${i}`} className="text-violet-800">{c}</li>
            ))}
          </ul>
        </div>
      )}

      {debrief && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm">
          <h4 className="font-semibold text-blue-900">Educational Debrief (GM 전용)</h4>
          <p className="mt-1 text-xs text-slate-600">가장 많이 선택한 전략: {debrief.mostSelectedStrategy}</p>
          <ul className="mt-2 list-disc pl-5 text-slate-700 space-y-1">
            {debrief.nextDiscussionQuestions.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ul>
        </div>
      )}

      {record && !followUp && publishResult && (
        <button
          type="button"
          onClick={runFollowUp}
          className="text-sm text-violet-600 hover:underline"
        >
          Follow-up 생성
        </button>
      )}

      {record && !debrief && publishResult && record.status !== "DRAFT" && (
        <button
          type="button"
          onClick={runDebrief}
          className="text-sm text-blue-600 hover:underline"
        >
          Debrief 생성
        </button>
      )}
    </section>
  );
}
