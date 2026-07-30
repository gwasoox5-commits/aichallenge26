"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { RealtimeConnectionState, RealtimeFlashKind } from "@/lib/bsp/use-realtime";

type RefreshFn = () => void;

type AdminRealtimeContextValue = {
  subscribe: (fn: RefreshFn) => () => void;
  broadcast: () => void;
  connectionState: RealtimeConnectionState;
  flash: RealtimeFlashKind | null;
  setConnectionState: (state: RealtimeConnectionState) => void;
  setFlash: (flash: RealtimeFlashKind | null) => void;
};

const AdminRealtimeContext = createContext<AdminRealtimeContextValue | null>(null);

export function AdminRealtimeProvider({ children }: { children: ReactNode }) {
  const subscribersRef = useRef(new Set<RefreshFn>());
  const [connectionState, setConnectionState] = useState<RealtimeConnectionState>("disconnected");
  const [flash, setFlash] = useState<RealtimeFlashKind | null>(null);

  const subscribe = useCallback((fn: RefreshFn) => {
    subscribersRef.current.add(fn);
    return () => {
      subscribersRef.current.delete(fn);
    };
  }, []);

  const broadcast = useCallback(() => {
    subscribersRef.current.forEach((fn) => fn());
  }, []);

  return (
    <AdminRealtimeContext.Provider
      value={{ subscribe, broadcast, connectionState, flash, setConnectionState, setFlash }}
    >
      {children}
    </AdminRealtimeContext.Provider>
  );
}

export function useAdminRealtimeRefresh(refresh: () => void) {
  const ctx = useContext(AdminRealtimeContext);
  useEffect(() => {
    if (!ctx) return;
    return ctx.subscribe(refresh);
  }, [ctx, refresh]);
}

export function useAdminRealtimeStatus() {
  const ctx = useContext(AdminRealtimeContext);
  return {
    connectionState: ctx?.connectionState ?? "disconnected",
    flash: ctx?.flash ?? null,
  };
}

export function useAdminRealtimeController() {
  const ctx = useContext(AdminRealtimeContext);
  if (!ctx) {
    throw new Error("useAdminRealtimeController must be used within AdminRealtimeProvider");
  }
  return ctx;
}
