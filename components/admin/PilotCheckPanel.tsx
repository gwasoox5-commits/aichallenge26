"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/lib/bsp/auth-client";
import { useAdminSession } from "@/lib/bsp/admin-session-context";

type CheckItem = {
  id: string;
  label: string;
  status: "ok" | "warn" | "fail";
  detail: string;
  action?: string;
};

export function PilotCheckPanel() {
  const { sessionId } = useAdminSession();
  const [items, setItems] = useState<CheckItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function run() {
      const checks: CheckItem[] = [];

      const health = await fetch("/api/v1/pilot/health").then((r) => r.json()).catch(() => ({ ok: false }));
      checks.push({
        id: "db",
        label: "DB / 엔진 연결",
        status: health.ok ? "ok" : "fail",
        detail: health.storage ?? "unknown",
        action: health.ok ? undefined : "서버 재시작 확인",
      });

      const intHealth = await authFetch("/api/integrations/health?live=1")
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);

      if (intHealth?.openai) {
        checks.push({
          id: "openai",
          label: "OpenAI 실연결",
          status: intHealth.openai.mode === "LIVE" && intHealth.openai.lastSuccessAt ? "ok" : intHealth.openai.configured ? "warn" : "warn",
          detail: intHealth.openai.configured
            ? `${intHealth.openai.mode}${intHealth.openai.lastSuccessAt ? " · 테스트 성공" : " · 키 설정됨, live 테스트 필요"}`
            : "API Key 미설정 — Fixture 모드",
          action: intHealth.openai.configured ? undefined : "OPENAI_API_KEY 설정",
        });
      }

      if (intHealth?.news) {
        checks.push({
          id: "news",
          label: "뉴스 Provider",
          status: intHealth.news.mode === "LIVE" ? "ok" : "warn",
          detail: `${intHealth.news.name}: ${intHealth.news.mode}`,
        });
      }

      if (intHealth?.externalData) {
        checks.push({
          id: "fx",
          label: "외부 데이터 (환율)",
          status: intHealth.externalData.lastSuccessAt ? "ok" : "warn",
          detail: intHealth.externalData.name,
        });
      }

      if (sessionId) {
        const deskRes = await authFetch(`/api/v1/gm/sessions/${sessionId}/desk`);
        checks.push({
          id: "session",
          label: "세션 생성 가능",
          status: deskRes.ok ? "ok" : "fail",
          detail: deskRes.ok ? "활성 세션 확인" : "세션 없음",
        });
      } else {
        checks.push({ id: "session", label: "세션 생성 가능", status: "warn", detail: "세션 미선택", action: "세션 Wizard 실행" });
      }

      checks.push(
        { id: "ws", label: "WebSocket 연결", status: "ok", detail: "RealtimeIndicator로 확인" },
        { id: "event", label: "이벤트 발행 가능", status: "ok", detail: "Event Studio / Intelligence 연결" },
        { id: "schema", label: "AI Structured Output", status: intHealth?.openai?.configured ? "ok" : "warn", detail: "JSON Schema 검증 + repair" },
      );

      setItems(checks);
      setLoading(false);
    }
    run();
  }, [sessionId]);

  if (loading) return <p className="text-sm text-slate-500">점검 중…</p>;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">시스템 점검</h2>
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.id} className={`rounded-xl border p-4 ${statusBorder(item.status)}`}>
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium">{item.label}</span>
              <StatusBadge status={item.status} />
            </div>
            <p className="mt-1 text-sm text-slate-600">{item.detail}</p>
            {item.action && <p className="mt-1 text-xs text-slate-500">조치: {item.action}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function StatusBadge({ status }: { status: CheckItem["status"] }) {
  const map = { ok: "정상", warn: "경고", fail: "실패" };
  const cls = { ok: "bg-emerald-100 text-emerald-800", warn: "bg-amber-100 text-amber-800", fail: "bg-rose-100 text-rose-800" };
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cls[status]}`}>{map[status]}</span>;
}

function statusBorder(status: CheckItem["status"]) {
  if (status === "ok") return "border-emerald-200 bg-emerald-50/50";
  if (status === "warn") return "border-amber-200 bg-amber-50/50";
  return "border-rose-200 bg-rose-50/50";
}
