"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

const STORAGE_KEY = "bsp_admin_session_id";

type AdminSessionContextValue = {
  sessionId: string | null;
  setSessionId: (id: string | null) => void;
};

const AdminSessionContext = createContext<AdminSessionContextValue>({
  sessionId: null,
  setSessionId: () => undefined,
});

export function AdminSessionProvider({ children }: { children: ReactNode }) {
  const [sessionId, setSessionIdState] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setSessionIdState(stored);
  }, []);

  const setSessionId = useCallback((id: string | null) => {
    setSessionIdState(id);
    if (id) localStorage.setItem(STORAGE_KEY, id);
    else localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <AdminSessionContext.Provider value={{ sessionId, setSessionId }}>
      {children}
    </AdminSessionContext.Provider>
  );
}

export function useAdminSession() {
  return useContext(AdminSessionContext);
}
