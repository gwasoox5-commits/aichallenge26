/** Client-side auth token for API calls (also set as httpOnly cookie by server) */
const TOKEN_KEY = "bsp_access_token";
const PLATFORM_TOKEN_KEY = "bsp_platform_token";

export type AuthFetchInit = RequestInit & { usePlatformToken?: boolean };

function readTokenRole(token: string): string | null {
  try {
    const body = token.split(".")[1];
    if (!body) return null;
    const pad = body.length % 4 === 0 ? "" : "=".repeat(4 - (body.length % 4));
    const json = atob(body.replace(/-/g, "+").replace(/_/g, "/") + pad);
    return (JSON.parse(json) as { role?: string }).role ?? null;
  } catch {
    return null;
  }
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

/** PLATFORM_ADMIN token kept across GM session token swaps. */
export function getPlatformToken(): string | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(PLATFORM_TOKEN_KEY);
  if (stored) return stored;
  const access = getAccessToken();
  if (access && readTokenRole(access) === "PLATFORM_ADMIN") return access;
  return null;
}

export function setAccessToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function setPlatformToken(token: string) {
  localStorage.setItem(PLATFORM_TOKEN_KEY, token);
}

export function clearAccessToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(PLATFORM_TOKEN_KEY);
}

export async function authFetch(input: RequestInfo | URL, init?: AuthFetchInit): Promise<Response> {
  const { usePlatformToken, ...fetchInit } = init ?? {};
  const token = usePlatformToken ? getPlatformToken() : getAccessToken();
  const headers = new Headers(fetchInit.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(input, { ...fetchInit, headers, credentials: "include" });
}
