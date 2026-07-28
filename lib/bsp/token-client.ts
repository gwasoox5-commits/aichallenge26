import type { AuthRole } from "@/src/bsp/domain/auth/types";
import { setAccessToken } from "./auth-client";

export const BSP_AUTH_CHANGED_EVENT = "bsp-auth-changed";

export type ClientTokenClaims = {
  sub: string;
  role: AuthRole;
  sessionId?: string;
  companyId?: string;
  teamName?: string;
  exp: number;
};

function decodeBase64Url(body: string): string {
  // Node test/server path — native base64url
  if (typeof window === "undefined" && typeof Buffer !== "undefined") {
    return Buffer.from(body, "base64url").toString("utf8");
  }
  // Browser — webpack Buffer polyfill lacks base64url; use atob
  const pad = body.length % 4 === 0 ? "" : "=".repeat(4 - (body.length % 4));
  return atob(body.replace(/-/g, "+").replace(/_/g, "/") + pad);
}

/** Client-side JWT payload read (UI gating only — server always verifies). */
export function parseTokenClaims(token: string | null): ClientTokenClaims | null {
  if (!token) return null;
  const [body] = token.split(".");
  if (!body) return null;
  try {
    return JSON.parse(decodeBase64Url(body)) as ClientTokenClaims;
  } catch {
    return null;
  }
}

/** WebSocket requires GM/CEO token scoped to the active session. */
export function canConnectRealtime(token: string | null, expectedSessionId: string | null): boolean {
  if (!expectedSessionId) return false;
  const claims = parseTokenClaims(token);
  if (!claims?.sessionId || claims.sessionId !== expectedSessionId) return false;
  return claims.role === "GM" || claims.role === "CEO";
}

export function notifyAuthChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(BSP_AUTH_CHANGED_EVENT));
  }
}

/** Apply GM session token after session create / restore (no page reload). */
export function applyGmSessionToken(gmAccessToken: string) {
  setAccessToken(gmAccessToken);
  notifyAuthChanged();
}
