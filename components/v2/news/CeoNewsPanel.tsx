"use client";

import type { NewsSeverity } from "@/lib/v2/event-studio/types";

export type CeoNewsItem = {
  newsId: string;
  headline: string;
  summary: string;
  articleBody: string;
  category: string;
  severity: NewsSeverity;
  displayMode: string;
  publishedAt: string;
  unread?: boolean;
};

const SEVERITY_STYLE: Record<NewsSeverity, string> = {
  CRITICAL: "bg-red-600",
  HIGH: "bg-orange-600",
  MEDIUM: "bg-amber-600",
  LOW: "bg-slate-600",
};

export function BreakingNewsBanner({
  news,
  unreadCount,
  onOpen,
}: {
  news: CeoNewsItem | null;
  unreadCount: number;
  onOpen: () => void;
}) {
  if (!news) return null;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-3 border-b border-red-900/50 bg-red-950/80 px-4 py-2 text-left text-sm hover:bg-red-950"
    >
      <span className="animate-pulse rounded bg-red-600 px-2 py-0.5 text-xs font-bold uppercase">Breaking</span>
      <span className="flex-1 truncate font-medium text-red-50">{news.headline}</span>
      {unreadCount > 0 && (
        <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-semibold text-white">{unreadCount}</span>
      )}
    </button>
  );
}

export function NewsDrawer({
  open,
  news,
  onClose,
  onAcknowledge,
}: {
  open: boolean;
  news: CeoNewsItem | null;
  onClose: () => void;
  onAcknowledge: (newsId: string) => void;
}) {
  if (!open || !news) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50" role="dialog" aria-modal="true">
      <div className="h-full w-full max-w-md overflow-y-auto bg-white shadow-xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-300 bg-white px-4 py-3">
          <h2 className="text-lg font-semibold text-slate-900">경영환경 뉴스</h2>
          <button type="button" onClick={onClose} className="text-slate-600 hover:text-slate-800">
            닫기
          </button>
        </div>
        <div className="space-y-4 p-4">
          <div className="flex flex-wrap gap-2">
            <span className={`rounded px-2 py-0.5 text-xs text-white ${SEVERITY_STYLE[news.severity]}`}>
              {news.severity}
            </span>
            <span className="rounded bg-slate-200 px-2 py-0.5 text-xs text-slate-700">{news.category}</span>
          </div>
          <h3 className="text-xl font-bold text-slate-900">{news.headline}</h3>
          <p className="text-sm text-slate-600">{new Date(news.publishedAt).toLocaleString()}</p>
          {news.displayMode !== "HEADLINE_ONLY" && (
            <>
              <p className="text-sm font-medium text-violet-800">{news.summary}</p>
              {news.displayMode === "DETAILED" && (
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{news.articleBody}</p>
              )}
            </>
          )}
          <button
            type="button"
            onClick={() => onAcknowledge(news.newsId)}
            className="w-full rounded-lg bg-violet-600 py-2.5 text-sm font-semibold hover:bg-violet-500"
          >
            확인했습니다
          </button>
        </div>
      </div>
    </div>
  );
}

export function NewsUnreadBadge({ count, onClick }: { count: number; onClick?: () => void }) {
  if (count <= 0) return null;
  const className =
    "inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white";
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className} aria-label={`미확인 뉴스 ${count}건`}>
        {count}
      </button>
    );
  }
  return <span className={className}>{count}</span>;
}

export function CeoNewsFeed({
  items,
  activeNewsId,
  onSelect,
}: {
  items: CeoNewsItem[];
  activeNewsId?: string;
  onSelect: (item: CeoNewsItem) => void;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4" data-testid="ceo-news-feed">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900">경영환경 뉴스</h3>
        {items.some((n) => n.unread) && (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">새 소식</span>
        )}
      </div>
      {items.length === 0 ? (
        <p className="mt-3 text-xs text-slate-500">GM이 이벤트를 발행하면 여기에 뉴스가 표시됩니다.</p>
      ) : (
        <ul className="mt-3 max-h-72 space-y-2 overflow-y-auto">
          {items.map((n) => (
            <li key={n.newsId}>
              <button
                type="button"
                onClick={() => onSelect(n)}
                className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                  activeNewsId === n.newsId
                    ? "border-violet-400 bg-violet-50"
                    : "border-slate-200 bg-slate-50 hover:border-violet-300 hover:bg-violet-50/50"
                }`}
              >
                <div className="flex items-start gap-2">
                  {n.unread && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-red-500" aria-hidden />}
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 font-medium text-slate-900">{n.headline}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {n.category} · {new Date(n.publishedAt).toLocaleString("ko-KR")}
                    </p>
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
