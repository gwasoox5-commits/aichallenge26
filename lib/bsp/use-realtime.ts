"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getAccessToken } from "./auth-client";
import { BSP_AUTH_CHANGED_EVENT, canConnectRealtime } from "./token-client";
import {
  REALTIME_RECONNECT_BASE_MS,
  REALTIME_RECONNECT_MAX_MS,
  REALTIME_WS_PATH,
  type RealtimeEventEnvelope,
  type RealtimeEventType,
  type RealtimeServerMessage,
} from "@/src/bsp/domain/realtime/realtime-event-types";

export type RealtimeConnectionState = "connecting" | "connected" | "reconnecting" | "disconnected";

export type RealtimeFlashKind =
  | "step"
  | "pause"
  | "economy"
  | "event"
  | "submit"
  | "ranking"
  | "dashboard"
  | "audit"
  | "game";

const EVENT_FLASH: Partial<Record<RealtimeEventType, RealtimeFlashKind>> = {
  "step.advanced": "step",
  "step.reopened": "step",
  "step.locked": "pause",
  "step.unlocked": "pause",
  "session.paused": "pause",
  "session.resumed": "pause",
  "economy.changed": "economy",
  "event.fired": "event",
  "team.submitted": "submit",
  "gm.force_submit": "submit",
  "gm.zero_submit": "submit",
  "ranking.updated": "ranking",
  "dashboard.updated": "dashboard",
  "audit.log": "audit",
  "settlement.completed": "step",
  "period.started": "step",
  "game.ended": "game",
  "news.published": "event",
};

export function useRealtime(options: {
  sessionId: string | null;
  enabled?: boolean;
  onEvent?: (event: RealtimeEventEnvelope) => void;
  onSync?: () => void;
}) {
  const { sessionId, enabled = true, onEvent, onSync } = options;
  const [connectionState, setConnectionState] = useState<RealtimeConnectionState>("disconnected");
  const [lastEvent, setLastEvent] = useState<RealtimeEventEnvelope | null>(null);
  const [flash, setFlash] = useState<RealtimeFlashKind | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef(0);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onEventRef = useRef(onEvent);
  const onSyncRef = useRef(onSync);

  useEffect(() => {
    onEventRef.current = onEvent;
    onSyncRef.current = onSync;
  }, [onEvent, onSync]);

  const triggerFlash = useCallback((kind: RealtimeFlashKind) => {
    setFlash(kind);
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    flashTimerRef.current = setTimeout(() => setFlash(null), 1200);
  }, []);

  const connect = useCallback(() => {
    if (!sessionId || !enabled) {
      setConnectionState("disconnected");
      return;
    }
    const token = getAccessToken();
    if (!canConnectRealtime(token, sessionId)) {
      setConnectionState("disconnected");
      return;
    }

    if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) {
      return;
    }

    setConnectionState(retryRef.current > 0 ? "reconnecting" : "connecting");

    const proto = typeof window !== "undefined" && window.location.protocol === "https:" ? "wss" : "ws";
    const host = typeof window !== "undefined" ? window.location.host : "localhost:3000";
    const url = `${proto}://${host}${REALTIME_WS_PATH}?token=${encodeURIComponent(token!)}`;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      retryRef.current = 0;
      setConnectionState("connected");
      ws.send(JSON.stringify({ op: "sync" }));
    };

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(String(ev.data)) as RealtimeServerMessage;
        if (msg.op === "event") {
          setLastEvent(msg.event);
          const kind = EVENT_FLASH[msg.event.type];
          if (kind) triggerFlash(kind);
          onEventRef.current?.(msg.event);
        } else if (msg.op === "sync") {
          onSyncRef.current?.();
        } else if (msg.op === "pong") {
          ws.send(JSON.stringify({ op: "pong" }));
        }
      } catch {
        /* ignore */
      }
    };

    ws.onclose = () => {
      wsRef.current = null;
      if (!enabled || !sessionId) {
        setConnectionState("disconnected");
        return;
      }
      const latestToken = getAccessToken();
      if (!canConnectRealtime(latestToken, sessionId)) {
        setConnectionState("disconnected");
        retryRef.current = 0;
        return;
      }
      setConnectionState("reconnecting");
      const delay = Math.min(
        REALTIME_RECONNECT_BASE_MS * 2 ** retryRef.current,
        REALTIME_RECONNECT_MAX_MS
      );
      retryRef.current += 1;
      setTimeout(connect, delay);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [sessionId, enabled, triggerFlash]);

  useEffect(() => {
    connect();
    return () => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      wsRef.current?.close();
      wsRef.current = null;
      setConnectionState("disconnected");
    };
  }, [connect]);

  useEffect(() => {
    const onAuthChanged = () => {
      retryRef.current = 0;
      wsRef.current?.close();
      wsRef.current = null;
      connect();
    };
    window.addEventListener(BSP_AUTH_CHANGED_EVENT, onAuthChanged);
    return () => window.removeEventListener(BSP_AUTH_CHANGED_EVENT, onAuthChanged);
  }, [connect]);

  return { connectionState, lastEvent, flash, reconnect: connect };
}
