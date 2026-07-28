import { NextResponse } from "next/server";
import { AuthError, AUTH_COOKIE_NAME, AUTH_HEADER, type AuthContext, type AuthRole } from "../../domain/auth/types";
import { verifyToken } from "./token-service";

export function extractBearerToken(req: Request): string | null {
  const auth = req.headers.get(AUTH_HEADER);
  if (auth?.startsWith("Bearer ")) return auth.slice(7).trim();
  const cookie = req.headers.get("cookie");
  if (!cookie) return null;
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${AUTH_COOKIE_NAME}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function requireAuth(
  req: Request,
  options: {
    roles?: AuthRole[];
    sessionId?: string;
    companyId?: string;
  } = {}
): AuthContext {
  const token = extractBearerToken(req);
  if (!token) {
    throw new AuthError("ERR_UNAUTHORIZED", "Authentication required", 401);
  }
  let ctx: AuthContext;
  try {
    ctx = verifyToken(token);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERR_INVALID_TOKEN";
    throw new AuthError(msg, "Invalid or expired session", 401);
  }

  if (options.roles && !options.roles.includes(ctx.role)) {
    throw new AuthError("ERR_FORBIDDEN_ROLE", "Insufficient role", 403);
  }

  if (options.sessionId && ctx.role !== "PLATFORM_ADMIN") {
    if (ctx.role === "GM" && ctx.sessionId !== options.sessionId) {
      throw new AuthError("ERR_FORBIDDEN_SESSION", "GM token not valid for this session", 403);
    }
    if (ctx.role === "CEO" && ctx.sessionId !== options.sessionId) {
      throw new AuthError("ERR_FORBIDDEN_SESSION", "CEO token not valid for this session", 403);
    }
  }

  if (options.companyId && ctx.role === "CEO") {
    if (ctx.companyId !== options.companyId) {
      throw new AuthError("ERR_FORBIDDEN_COMPANY", "Access denied to this company", 403);
    }
  }

  return ctx;
}

export function authErrorResponse(e: unknown) {
  if (e instanceof AuthError) {
    return NextResponse.json({ error: e.message, code: e.code }, { status: e.status });
  }
  return null;
}

export function withAuthCookie(response: NextResponse, token: string): NextResponse {
  response.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24,
  });
  return response;
}
