"use client";

import type { EventTimelineEntry, IntelligencePublishRecord } from "@/lib/v2/intelligence/publish-types";

interface Props {
  timeline: EventTimelineEntry[];
  record?: IntelligencePublishRecord | null;
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  GENERATED: "AI Generated",
  REVIEWED: "GM Review",
  EDITED: "GM Edit",
  APPROVED: "Approved",
  SCHEDULED: "Scheduled",
  PUBLISHED: "Published",
  ACTIVE: "Active",
  EXPIRING: "Expiring",
  EXPIRED: "Expired",
  ARCHIVED: "Archived",
};

export function EventTimelinePanel({ timeline, record }: Props) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="font-semibold text-slate-800">Event Timeline</h3>
      {record && (
        <p className="mt-1 text-xs text-slate-500">
          상태: <strong>{STATUS_LABELS[record.status] ?? record.status}</strong>
          {record.newsId && ` · News ${record.newsId.slice(0, 8)}…`}
        </p>
      )}
      {timeline.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">아직 타임라인 기록이 없습니다.</p>
      ) : (
        <ol className="mt-3 space-y-2 border-l-2 border-violet-200 pl-4">
          {timeline.map((t) => (
            <li key={t.id} className="text-sm">
              <time className="text-xs text-slate-400">{new Date(t.timestamp).toLocaleString("ko-KR")}</time>
              <p className="font-medium text-slate-800">{t.label}</p>
              {t.detail && <p className="text-xs text-slate-600">{t.detail}</p>}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
